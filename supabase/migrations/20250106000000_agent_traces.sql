-- Add unique constraint on run_results for upsert support
CREATE UNIQUE INDEX IF NOT EXISTS idx_run_results_run_task
    ON run_results(run_id, task_id);

-- Agent traces: full conversation logs from student evaluation runs.
-- Linked to run_results for per-task traces, or standalone for bulk imports.

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

-- Service role and org members can read traces for their environments
CREATE POLICY agent_traces_org_read ON agent_traces
    FOR SELECT USING (
        environment_id IN (
            SELECT oe.environment_id FROM organization_environments oe
            JOIN profiles p ON p.organization_id = oe.organization_id
            WHERE p.id = auth.uid()
        )
    );
