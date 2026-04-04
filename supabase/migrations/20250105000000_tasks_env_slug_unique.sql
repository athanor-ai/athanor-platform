-- ---------------------------------------------------------------------------
-- Add unique constraint on tasks(environment_id, slug) to support upserts
-- from the sync-tasks action in POST /api/sync.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_environment_id_slug
  ON tasks(environment_id, slug);
