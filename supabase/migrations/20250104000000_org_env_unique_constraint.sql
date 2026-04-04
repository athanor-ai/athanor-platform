-- ---------------------------------------------------------------------------
-- Add unique constraint on organization_environments(organization_id, environment_id)
-- Required for upserts and prevents duplicate access grants.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_organization_environments_org_env_unique
  ON organization_environments(organization_id, environment_id);
