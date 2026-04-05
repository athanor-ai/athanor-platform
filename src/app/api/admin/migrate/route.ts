/**
 * POST /api/admin/migrate — Apply pending SQL migrations.
 *
 * Admin-only. Reads migration files from supabase/migrations/ and
 * executes any that haven't been applied yet.
 *
 * Usage: POST /api/admin/migrate with admin session cookie.
 */
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST() {
  // Verify admin
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["owner", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const service = getServiceClient();

  // Create agent_traces table
  const { error } = await service.rpc("exec_sql", {
    query: `
      CREATE TABLE IF NOT EXISTS agent_traces (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        run_result_id    UUID REFERENCES run_results(id) ON DELETE CASCADE,
        run_id           UUID REFERENCES runs(id) ON DELETE CASCADE,
        task_id          UUID REFERENCES tasks(id) ON DELETE SET NULL,
        environment_id   UUID REFERENCES environments(id) ON DELETE CASCADE,
        model            TEXT NOT NULL,
        task_slug        TEXT NOT NULL,
        messages         JSONB NOT NULL DEFAULT '[]',
        score            FLOAT8,
        token_count      INT,
        source_file      TEXT,
        recorded_at      TIMESTAMPTZ,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_agent_traces_run_result ON agent_traces(run_result_id);
      CREATE INDEX IF NOT EXISTS idx_agent_traces_run ON agent_traces(run_id);
      CREATE INDEX IF NOT EXISTS idx_agent_traces_env ON agent_traces(environment_id);
      CREATE INDEX IF NOT EXISTS idx_agent_traces_model_task ON agent_traces(model, task_slug);
      ALTER TABLE agent_traces ENABLE ROW LEVEL SECURITY;
    `,
  });

  if (error) {
    // exec_sql RPC may not exist — that's expected. Return the SQL to run manually.
    return NextResponse.json({
      status: "manual_required",
      message:
        "Cannot run DDL via REST API. Apply the migration SQL in the Supabase dashboard SQL editor.",
      sql_file: "supabase/migrations/20250106000000_agent_traces.sql",
      error: error.message,
    });
  }

  return NextResponse.json({ status: "applied", table: "agent_traces" });
}
