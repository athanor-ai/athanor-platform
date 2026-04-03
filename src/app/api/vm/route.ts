/**
 * GET  /api/vm — Get VM status
 * POST /api/vm — Start or stop the evaluation VM
 *
 * Actions: { action: "start" | "stop" | "cleanup" | "health" }
 *
 * Only admin/owner can control the VM. All operations are server-side only.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import {
  getVMStatus,
  startVM,
  stopVM,
  cleanupVM,
  checkVMHealth,
} from "@/lib/vm-manager";

async function verifyAdmin() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  if (!profile || !["owner", "admin"].includes(profile.role)) return null;
  return profile;
}

export async function GET() {
  const profile = await verifyAdmin();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await getVMStatus();
  return NextResponse.json({ status, vm: process.env.AZURE_VM_NAME || "standard-env-runner" });
}

export async function POST(request: NextRequest) {
  const profile = await verifyAdmin();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action } = await request.json();

  switch (action) {
    case "start": {
      const ok = await startVM();
      return NextResponse.json({ success: ok, action: "start" });
    }

    case "stop": {
      // Cleanup before stopping
      await cleanupVM();
      const ok = await stopVM();
      return NextResponse.json({ success: ok, action: "stop" });
    }

    case "cleanup": {
      const results = await cleanupVM();
      return NextResponse.json({ success: true, action: "cleanup", details: results });
    }

    case "health": {
      const health = await checkVMHealth();
      return NextResponse.json({ success: true, action: "health", ...health });
    }

    default:
      return NextResponse.json(
        { error: "Unknown action. Use: start, stop, cleanup, health" },
        { status: 400 },
      );
  }
}
