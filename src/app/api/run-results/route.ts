/**
 * GET /api/run-results — List all run results for the user's org.
 *
 * Returns lightweight rows (no trajectory) for building task→run mappings.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = getServiceClient();

  // Get run IDs for this org
  const { data: runs } = await service
    .from("runs")
    .select("id")
    .eq("organization_id", authUser.organizationId);

  if (!runs || runs.length === 0) {
    return NextResponse.json([]);
  }

  const runIds = runs.map((r) => r.id);

  // Get results without trajectory (too large)
  const { data, error } = await service
    .from("run_results")
    .select("id, run_id, task_id, raw_score, steps_used, duration_ms, error")
    .in("run_id", runIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
