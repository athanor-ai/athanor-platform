/**
 * POST /api/runs — Queue a new evaluation run
 * GET  /api/runs — List runs for the user's organization
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "No organization" }, { status: 403 });
  }

  const body = await request.json();
  const { environment_id, model_name, calibration_profile_id, config, selected_task_ids } = body;

  if (!environment_id || !model_name) {
    return NextResponse.json(
      { error: "Missing required: environment_id, model_name" },
      { status: 400 },
    );
  }

  // Count tasks in this environment
  const { count: totalTasks } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("environment_id", environment_id);

  // If specific tasks are selected, use that count; otherwise use all tasks
  const effectiveTaskCount =
    Array.isArray(selected_task_ids) && selected_task_ids.length > 0
      ? selected_task_ids.length
      : totalTasks || 0;

  // Store selected_task_ids in the run config so the executor can read them
  const runConfig = {
    ...(config || {}),
    ...(Array.isArray(selected_task_ids) && selected_task_ids.length > 0
      ? { selected_task_ids }
      : {}),
  };

  const { data, error } = await supabase
    .from("runs")
    .insert({
      organization_id: profile.organization_id,
      environment_id,
      model_name,
      calibration_profile_id: calibration_profile_id || null,
      status: "pending",
      total_tasks: effectiveTaskCount,
      completed_tasks: 0,
      config: runConfig,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fire-and-forget: kick off execution in the background.
  // The executeRun function handles VM lifecycle, SSH, cleanup, and
  // updates the run record in Supabase as it progresses.
  // We don't await it -- the client polls for status via GET /api/runs/:id.
  const autoShutdown = config?.auto_shutdown !== false;
  import("@/lib/run-executor").then(({ executeRun }) => {
    executeRun(data.id, { autoShutdown }).catch((e) => {
      console.error(`Background execution failed for run ${data.id}:`, e);
    });
  });

  return NextResponse.json(
    { ...data, message: "Run queued. Server starting..." },
    { status: 201 },
  );
}

export async function GET() {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // RLS enforces org scoping
  const { data, error } = await supabase
    .from("runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
