-- Add unique constraint on run_results for upsert support
CREATE UNIQUE INDEX IF NOT EXISTS idx_run_results_run_task
    ON run_results(run_id, task_id);

-- Agent traces: metadata for full conversation logs stored in Supabase Storage.
-- The actual messages JSON is in the agent-traces bucket; storage_path points to it.

CREATE TABLE IF NOT EXISTS agent_traces (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_result_id    UUID REFERENCES run_results(id) ON DELETE CASCADE,
    run_id           UUID REFERENCES runs(id) ON DELETE CASCADE,
    task_id          UUID REFERENCES tasks(id) ON DELETE SET NULL,
    environment_id   UUID REFERENCES environments(id) ON DELETE CASCADE,
    model            TEXT NOT NULL,
    storage_path     TEXT NOT NULL,
    score            FLOAT8,
    token_count      INT,
    message_count    INT,
    source_file      TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_traces_run_result ON agent_traces(run_result_id);
CREATE INDEX IF NOT EXISTS idx_agent_traces_run ON agent_traces(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_traces_env ON agent_traces(environment_id);
CREATE INDEX IF NOT EXISTS idx_agent_traces_model ON agent_traces(model);

ALTER TABLE agent_traces ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_traces_org_read ON agent_traces
    FOR SELECT USING (
        environment_id IN (
            SELECT oe.environment_id FROM organization_environments oe
            JOIN profiles p ON p.organization_id = oe.organization_id
            WHERE p.id = auth.uid()
        )
    );

-- Storage bucket for trace JSON files
INSERT INTO storage.buckets (id, name, public)
VALUES ('agent-traces', 'agent-traces', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated users can read traces for their org's environments
CREATE POLICY agent_traces_bucket_read ON storage.objects
    FOR SELECT USING (
        bucket_id = 'agent-traces'
        AND auth.role() = 'authenticated'
    );
