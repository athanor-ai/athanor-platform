/**
 * POST /api/sync — Sync tasks, scores, runs, and env data from env repos into the platform.
 *
 * Actions:
 *   { action: "tasks" }   — Pull task definitions from all env repos and upsert into DB
 *   { action: "scores" }  — Pull latest run data from all env repos (on VM or local)
 *   { action: "runs" }    — Import result JSON files from the VM into runs + run_results tables
 *   { action: "ingest-run" } — Ingest a single run POSTed from evaluate.py (Bearer auth via CRON_SECRET)
 *   { action: "validate" } — Run validate_env.py on all envs
 *   { action: "rebuild-containers" } — Rebuild all container images
 *
 * Admin-only except ingest-run (Bearer token). Used after new runs complete or env-builder changes are pushed.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { exec } from "child_process";
import { promisify } from "util";
import {
  ALL_VM_DIR_NAMES,
  ENVIRONMENT_REGISTRY,
} from "@/data/environment-registry";

const execAsync = promisify(exec);
const SSH_TARGET = process.env.AZURE_VM_SSH_TARGET;
const SSH_OPTS = "-o StrictHostKeyChecking=no -o ConnectTimeout=30";

/** Service-role client that bypasses RLS — for writing runs and run_results. */
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const ENVS = ALL_VM_DIR_NAMES;

/** Map VM dir name → registry entry for quick lookup. */
const DIR_TO_REGISTRY = new Map(
  ENVIRONMENT_REGISTRY.map((e) => [e.vmDirName, e]),
);

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

/** Verify Bearer token auth against CRON_SECRET. */
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const cronSecret = process.env.CRON_SECRET;
  return Boolean(cronSecret && token === cronSecret);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;

  // ingest-run uses Bearer token auth; all other actions use admin session auth
  if (action === "ingest-run") {
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    if (!(await verifyAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  switch (action) {
    case "tasks": {
      // Pull task definitions from each env repo and upsert into Supabase tasks table.
      // Each repo stores configs in root_data/eval/configs/*.json.
      const supabase = await getSupabaseServerClient();
      const results: Record<string, unknown> = {};

      for (const env of ENVS) {
        const registry = DIR_TO_REGISTRY.get(env);
        if (!registry) {
          results[env] = { error: "Not in registry" };
          continue;
        }

        try {
          // Read task configs from the env repo
          const output = await runOnVM(
            `cd ~/${env} && git pull --quiet 2>&1 | tail -1 && ` +
              `python3 -c "
import json, glob, os
configs = sorted(glob.glob('root_data/eval/configs/*.json'))
tasks = []
for path in configs:
    slug = os.path.splitext(os.path.basename(path))[0]
    try:
        cfg = json.load(open(path))
        tasks.append({
            'slug': slug,
            'name': cfg.get('name', slug.replace('-', ' ').replace('_', ' ').title()),
            'description': cfg.get('description', ''),
            'difficulty': cfg.get('difficulty', 'medium'),
            'category': cfg.get('category', cfg.get('family', '')),
            'max_steps': cfg.get('max_steps', 100),
        })
    except:
        pass
print(json.dumps(tasks))
"`,
          );

          const rawTasks = JSON.parse(
            output.trim().split("\n").pop() || "[]",
          ) as {
            slug: string;
            name: string;
            description: string;
            difficulty: string;
            category: string;
            max_steps: number;
          }[];

          if (rawTasks.length === 0) {
            results[env] = { tasks: 0, note: "no configs found" };
            continue;
          }

          // Look up the environment ID in DB by slug
          const { data: envRow } = await supabase
            .from("environments")
            .select("id")
            .eq("slug", registry.slug)
            .single();

          if (!envRow) {
            results[env] = { error: `env slug '${registry.slug}' not in DB` };
            continue;
          }

          // Upsert tasks
          const rows = rawTasks.map((t) => ({
            environment_id: envRow.id,
            name: t.name,
            slug: t.slug,
            description: t.description,
            difficulty: t.difficulty,
            category: t.category,
            max_steps: t.max_steps,
            metadata: { source: "vm-sync" },
          }));

          const { error: upsertError } = await supabase
            .from("tasks")
            .upsert(rows, { onConflict: "environment_id,slug" });

          if (upsertError) {
            results[env] = {
              tasks: rawTasks.length,
              error: upsertError.message,
            };
          } else {
            results[env] = { tasks: rawTasks.length, synced: true };
          }
        } catch (e) {
          results[env] = { error: String(e).slice(0, 200) };
        }
      }

      return NextResponse.json({ action: "tasks", results });
    }

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

    case "runs": {
      // Import result JSON files from the VM into runs + run_results tables.
      // Scans *.json at repo root and runs/*.json for files with { model, results }.
      const service = getServiceClient();
      const results: Record<string, unknown> = {};

      for (const env of ENVS) {
        const registry = DIR_TO_REGISTRY.get(env);
        if (!registry) {
          results[env] = { error: "Not in registry" };
          continue;
        }

        try {
          // Find and read all result JSON files from the VM
          const output = await runOnVM(
            `cd ~/athanor-ai-repos/${env} && python3 -c "
import json, glob, os
files = glob.glob('*.json') + glob.glob('runs/*.json')
out = []
for f in sorted(set(files)):
    try:
        data = json.load(open(f))
        if isinstance(data, dict) and 'results' in data and isinstance(data['results'], list):
            out.append({'file': f, 'model': data.get('model', ''), 'results': data['results']})
    except:
        pass
print(json.dumps(out))
"`,
          );

          const parsed = output.trim().split("\n").pop() || "[]";
          const resultFiles = JSON.parse(parsed) as {
            file: string;
            model: string;
            results: {
              task?: string;
              score?: number;
              status?: string;
              time_seconds?: number;
              tool_calls_total?: number;
              tool_calls_summary?: unknown[];
              errors?: string[];
            }[];
          }[];

          if (resultFiles.length === 0) {
            results[env] = { files: 0, note: "no result files found" };
            continue;
          }

          // Look up the environment row in DB
          const { data: envRow } = await service
            .from("environments")
            .select("id, organization_id")
            .eq("slug", registry.slug)
            .single();

          if (!envRow) {
            results[env] = { error: `env slug '${registry.slug}' not in DB` };
            continue;
          }

          // Load all tasks for this environment (slug → id mapping)
          const { data: envTasks } = await service
            .from("tasks")
            .select("id, slug")
            .eq("environment_id", envRow.id);

          const taskSlugToId = new Map(
            (envTasks || []).map((t) => [t.slug, t.id]),
          );

          // Check for existing synced runs to avoid duplicates
          const { data: existingRuns } = await service
            .from("runs")
            .select("id, config")
            .eq("environment_id", envRow.id);

          const existingSourceFiles = new Set(
            (existingRuns || [])
              .map((r) => (r.config as Record<string, unknown>)?.source_file)
              .filter(Boolean),
          );

          let synced = 0;
          let skipped = 0;
          const fileErrors: string[] = [];

          for (const rf of resultFiles) {
            // Skip if already synced (dedup by source file)
            if (existingSourceFiles.has(rf.file)) {
              skipped++;
              continue;
            }

            const modelName = rf.model || "unknown";
            const taskResults = rf.results || [];

            // Calculate scores
            const scores = taskResults
              .map((r) => r.score)
              .filter((s): s is number => s !== null && s !== undefined);
            const meanScore =
              scores.length > 0
                ? scores.reduce((a, b) => a + b, 0) / scores.length
                : null;

            // Insert the run
            const { data: runRow, error: runError } = await service
              .from("runs")
              .insert({
                organization_id: envRow.organization_id,
                environment_id: envRow.id,
                model_name: modelName,
                status: "completed",
                started_at: new Date().toISOString(),
                completed_at: new Date().toISOString(),
                total_tasks: taskResults.length,
                completed_tasks: scores.length,
                mean_score: meanScore,
                config: { source: "vm-sync", source_file: rf.file },
              })
              .select("id")
              .single();

            if (runError || !runRow) {
              fileErrors.push(
                `${rf.file}: ${runError?.message || "insert failed"}`,
              );
              continue;
            }

            // Build run_results rows, mapping task slugs to task IDs
            const resultRows = taskResults
              .map((r) => {
                const taskSlug = r.task || "";
                const taskId = taskSlugToId.get(taskSlug);
                if (!taskId) return null;

                return {
                  run_id: runRow.id,
                  task_id: taskId,
                  raw_score: r.score ?? 0,
                  steps_used: r.tool_calls_total ?? 0,
                  duration_ms: ((r.time_seconds as number) || 0) * 1000,
                  trajectory: r.tool_calls_summary || [],
                  error: (r.errors as string[])?.join("; ") || null,
                };
              })
              .filter(
                (row): row is NonNullable<typeof row> => row !== null,
              );

            if (resultRows.length > 0) {
              const { error: resultsError } = await service
                .from("run_results")
                .insert(resultRows);

              if (resultsError) {
                fileErrors.push(
                  `${rf.file} results: ${resultsError.message}`,
                );
              }
            }

            synced++;
            existingSourceFiles.add(rf.file);
          }

          results[env] = {
            files: resultFiles.length,
            synced,
            skipped,
            ...(fileErrors.length > 0 && { errors: fileErrors }),
          };
        } catch (e) {
          results[env] = { error: String(e).slice(0, 200) };
        }
      }

      return NextResponse.json({ action: "runs", results });
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

    case "ingest-run": {
      // Ingest a single run POSTed directly from evaluate.py.
      // Payload: { action, model, environment_dir, results, source_file }
      const {
        model: ingestModel,
        environment_dir: environmentDir,
        results: ingestResults,
        source_file: sourceFile,
      } = body as {
        model: string;
        environment_dir: string;
        results: {
          task?: string;
          score?: number;
          status?: string;
          time_seconds?: number;
          tool_calls_total?: number;
          tool_calls_summary?: unknown[];
          errors?: string[];
        }[];
        source_file: string;
      };

      if (!environmentDir || !ingestResults || !sourceFile) {
        return NextResponse.json(
          { error: "Missing required fields: environment_dir, results, source_file" },
          { status: 400 },
        );
      }

      // Look up environment via registry vmDirName → slug → DB row
      const registry = DIR_TO_REGISTRY.get(environmentDir);
      if (!registry) {
        return NextResponse.json(
          { error: `Unknown environment_dir: ${environmentDir}` },
          { status: 400 },
        );
      }

      const service = getServiceClient();

      // Look up the environment row in DB
      const { data: envRow } = await service
        .from("environments")
        .select("id, organization_id")
        .eq("slug", registry.slug)
        .single();

      if (!envRow) {
        return NextResponse.json(
          { error: `Environment slug '${registry.slug}' not found in DB` },
          { status: 404 },
        );
      }

      // Use the environment's org, or fall back to first org with access
      const orgId = envRow.organization_id;

      // Deduplicate by source_file
      const { data: existingRuns } = await service
        .from("runs")
        .select("id, config")
        .eq("environment_id", envRow.id);

      const existingSourceFiles = new Set(
        (existingRuns || [])
          .map((r) => (r.config as Record<string, unknown>)?.source_file)
          .filter(Boolean),
      );

      if (existingSourceFiles.has(sourceFile)) {
        return NextResponse.json({
          action: "ingest-run",
          status: "skipped",
          reason: `source_file '${sourceFile}' already ingested`,
        });
      }

      // Load tasks for this environment (slug → id mapping)
      const { data: envTasks } = await service
        .from("tasks")
        .select("id, slug")
        .eq("environment_id", envRow.id);

      const taskSlugToId = new Map(
        (envTasks || []).map((t) => [t.slug, t.id]),
      );

      // Calculate scores
      const scores = ingestResults
        .map((r) => r.score)
        .filter((s): s is number => s !== null && s !== undefined);
      const meanScore =
        scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : null;

      // Insert the run
      const { data: runRow, error: runError } = await service
        .from("runs")
        .insert({
          organization_id: orgId,
          environment_id: envRow.id,
          model_name: ingestModel || "unknown",
          status: "completed",
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          total_tasks: ingestResults.length,
          completed_tasks: scores.length,
          mean_score: meanScore,
          config: { source: "ingest-run", source_file: sourceFile },
        })
        .select("id")
        .single();

      if (runError || !runRow) {
        return NextResponse.json(
          { error: `Failed to insert run: ${runError?.message || "unknown"}` },
          { status: 500 },
        );
      }

      // Build run_results rows
      const resultRows = ingestResults
        .map((r) => {
          const taskSlug = r.task || "";
          const taskId = taskSlugToId.get(taskSlug);
          if (!taskId) return null;

          return {
            run_id: runRow.id,
            task_id: taskId,
            raw_score: r.score ?? 0,
            steps_used: r.tool_calls_total ?? 0,
            duration_ms: ((r.time_seconds as number) || 0) * 1000,
            trajectory: r.tool_calls_summary || [],
            error: (r.errors as string[])?.join("; ") || null,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

      const unmatchedTasks = ingestResults.filter(
        (r) => r.task && !taskSlugToId.has(r.task),
      );

      if (resultRows.length > 0) {
        const { error: resultsError } = await service
          .from("run_results")
          .insert(resultRows);

        if (resultsError) {
          return NextResponse.json(
            { error: `Failed to insert run_results: ${resultsError.message}` },
            { status: 500 },
          );
        }
      }

      return NextResponse.json({
        action: "ingest-run",
        status: "ok",
        run_id: runRow.id,
        results_inserted: resultRows.length,
        results_total: ingestResults.length,
        ...(unmatchedTasks.length > 0 && {
          unmatched_tasks: unmatchedTasks.map((t) => t.task),
        }),
      });
    }

    default:
      return NextResponse.json(
        {
          error:
            "Unknown action. Use: tasks, scores, runs, ingest-run, validate, rebuild-containers",
        },
        { status: 400 },
      );
  }
}
