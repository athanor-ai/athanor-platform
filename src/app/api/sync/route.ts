/**
 * POST /api/sync — Sync scores from env repos into the platform.
 *
 * Actions:
 *   { action: "scores" } — Pull latest run data from all env repos (on VM or local)
 *   { action: "validate" } — Run validate_env.py on all envs
 *   { action: "rebuild-containers" } — Rebuild all container images
 *
 * Admin-only. Used after new runs complete or env-builder changes are pushed.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { exec } from "child_process";
import { promisify } from "util";
import { ALL_VM_DIR_NAMES } from "@/data/environment-registry";

const execAsync = promisify(exec);
const SSH_TARGET = process.env.AZURE_VM_SSH_TARGET;
const SSH_OPTS = "-o StrictHostKeyChecking=no -o ConnectTimeout=30";

const ENVS = ALL_VM_DIR_NAMES;

async function verifyAdmin() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return profile && ["owner", "admin"].includes(profile.role);
}

async function runOnVM(cmd: string): Promise<string> {
  if (!SSH_TARGET) {
    // Local mode (dev)
    const { stdout } = await execAsync(cmd, { timeout: 300000 });
    return stdout;
  }
  const { stdout } = await execAsync(
    `ssh ${SSH_OPTS} ${SSH_TARGET} '${cmd.replace(/'/g, "'\\''")}'`,
    { timeout: 300000 },
  );
  return stdout;
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action } = await request.json();

  switch (action) {
    case "scores": {
      // Pull git in all env repos and report run status
      const results: Record<string, unknown> = {};
      for (const env of ENVS) {
        try {
          const output = await runOnVM(
            `cd ~/${env} && git pull --quiet 2>&1 | tail -1 && ` +
            `python3 -c "
import json, glob
files = sorted(glob.glob('runs/*.json'))
total = len(files)
complete = sum(1 for f in files if len([r for r in json.load(open(f)).get('results',[]) if r.get('score') is not None]) > 0)
print(json.dumps({'files': total, 'complete': complete}))
"`,
          );
          results[env] = JSON.parse(output.trim().split("\n").pop() || "{}");
        } catch (e) {
          results[env] = { error: String(e).slice(0, 100) };
        }
      }
      return NextResponse.json({ action: "scores", results });
    }

    case "validate": {
      // Run validate_env.py on all envs
      const results: Record<string, unknown> = {};
      for (const env of ENVS) {
        try {
          const output = await runOnVM(
            `python3 ~/env-builder/shared/scripts/validate_env.py ~/${env} 2>&1 | grep 'ERROR\\|WARN\\|PASS\\|FAIL' | tail -5`,
          );
          results[env] = output.trim().split("\n");
        } catch (e) {
          results[env] = { error: String(e).slice(0, 100) };
        }
      }
      return NextResponse.json({ action: "validate", results });
    }

    case "rebuild-containers": {
      // Rebuild all container images
      const results: Record<string, unknown> = {};
      for (const env of ENVS) {
        try {
          const output = await runOnVM(
            `cd ~/${env} && podman build -f Containerfile -t ${env} . 2>&1 | tail -3`,
          );
          const success = output.includes("Successfully tagged");
          results[env] = { success, output: output.trim() };
        } catch (e) {
          results[env] = { success: false, error: String(e).slice(0, 100) };
        }
      }
      return NextResponse.json({ action: "rebuild-containers", results });
    }

    default:
      return NextResponse.json(
        { error: "Unknown action. Use: scores, validate, rebuild-containers" },
        { status: 400 },
      );
  }
}
