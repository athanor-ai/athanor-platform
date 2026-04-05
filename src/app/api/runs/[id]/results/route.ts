/**
 * POST /api/runs/:id/results — Insert task results (called by executor)
 * GET  /api/runs/:id/results — Get all results for a run
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: runId } = await params;
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = getServiceClient();

  // Verify run exists and belongs to user's org
  const { data: run } = await service
    .from("runs")
    .select("id")
    .eq("id", runId)
    .eq("organization_id", authUser.organizationId)
    .single();

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const results = await request.json();
  if (!Array.isArray(results)) {
    return NextResponse.json({ error: "Expected array of results" }, { status: 400 });
  }

  const rows = results.map((r: Record<string, unknown>) => ({
    run_id: runId,
    task_id: r.task_id,
    raw_score: r.raw_score,
    calibrated_score: r.calibrated_score ?? null,
    steps_used: r.steps_used ?? 0,
    max_steps: r.max_steps ?? 100,
    duration_ms: r.duration_ms ?? 0,
    trajectory: r.trajectory ?? [],
    error: r.error ?? null,
  }));

  const { error } = await service
    .from("run_results")
    .upsert(rows, { onConflict: "run_id,task_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ inserted: rows.length, run_id: runId });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: runId } = await params;
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = getServiceClient();
  const { data, error } = await service
    .from("run_results")
    .select("*")
    .eq("run_id", runId)
    .order("created_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
