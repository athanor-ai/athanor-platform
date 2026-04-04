-- =============================================================================
-- Athanor RL Training Platform - Initial Schema
-- Migration: 20250101000000_initial_schema.sql
--
-- Creates the complete data model for the Athanor platform including:
--   organizations, profiles, environments, tasks, calibration,
--   runs, results, baselines, credentials, docs, and package artifacts.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Utility: updated_at trigger function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 1. organizations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  plan        TEXT NOT NULL DEFAULT 'free',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 2. profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           TEXT NOT NULL UNIQUE,
  display_name    TEXT,
  role            TEXT NOT NULL DEFAULT 'member',
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_profiles_organization_id ON profiles(organization_id);

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 3. environments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS environments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  description     TEXT,
  engine          TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
  config          JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE environments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_environments_organization_id ON environments(organization_id);

CREATE TRIGGER set_environments_updated_at
  BEFORE UPDATE ON environments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 4. environment_versions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS environment_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id  UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
  version_tag     TEXT NOT NULL,
  changelog       TEXT,
  docker_image    TEXT,
  status          TEXT NOT NULL DEFAULT 'draft',
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE environment_versions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_environment_versions_environment_id ON environment_versions(environment_id);

CREATE TRIGGER set_environment_versions_updated_at
  BEFORE UPDATE ON environment_versions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 5. tasks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id  UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  description     TEXT,
  difficulty      TEXT NOT NULL DEFAULT 'medium',
  category        TEXT,
  max_steps       INT NOT NULL DEFAULT 100,
  reward_range    JSONB,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_tasks_environment_id ON tasks(environment_id);

CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 6. calibration_profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS calibration_profiles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  sigmoid_center    FLOAT8 NOT NULL DEFAULT 0.5,
  sigmoid_steepness FLOAT8 NOT NULL DEFAULT 10.0,
  time_weight       FLOAT8 NOT NULL DEFAULT 0.3,
  step_penalty      FLOAT8 NOT NULL DEFAULT 0.01,
  config            JSONB NOT NULL DEFAULT '{}',
  is_default        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE calibration_profiles ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_calibration_profiles_organization_id ON calibration_profiles(organization_id);

CREATE TRIGGER set_calibration_profiles_updated_at
  BEFORE UPDATE ON calibration_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 7. runs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS runs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  environment_id          UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
  calibration_profile_id  UUID REFERENCES calibration_profiles(id) ON DELETE SET NULL,
  model_name              TEXT NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'pending',
  started_at              TIMESTAMPTZ,
  completed_at            TIMESTAMPTZ,
  total_tasks             INT NOT NULL DEFAULT 0,
  completed_tasks         INT NOT NULL DEFAULT 0,
  mean_score              FLOAT8,
  config                  JSONB NOT NULL DEFAULT '{}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE runs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_runs_organization_id ON runs(organization_id);
CREATE INDEX idx_runs_environment_id ON runs(environment_id);
CREATE INDEX idx_runs_calibration_profile_id ON runs(calibration_profile_id);

CREATE TRIGGER set_runs_updated_at
  BEFORE UPDATE ON runs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 8. run_results
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS run_results (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id           UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  task_id          UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  raw_score        FLOAT8,
  calibrated_score FLOAT8,
  steps_used       INT,
  max_steps        INT,
  duration_ms      INT,
  trajectory       JSONB NOT NULL DEFAULT '[]',
  error            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE run_results ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_run_results_run_id ON run_results(run_id);
CREATE INDEX idx_run_results_task_id ON run_results(task_id);

-- ---------------------------------------------------------------------------
-- 9. baseline_runs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS baseline_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  environment_id  UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
  model_name      TEXT NOT NULL,
  label           TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  mean_score      FLOAT8,
  median_score    FLOAT8,
  config          JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE baseline_runs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_baseline_runs_organization_id ON baseline_runs(organization_id);
CREATE INDEX idx_baseline_runs_environment_id ON baseline_runs(environment_id);

CREATE TRIGGER set_baseline_runs_updated_at
  BEFORE UPDATE ON baseline_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 10. baseline_task_results
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS baseline_task_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baseline_run_id UUID NOT NULL REFERENCES baseline_runs(id) ON DELETE CASCADE,
  task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  score           FLOAT8,
  steps_used      INT,
  duration_ms     INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE baseline_task_results ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_baseline_task_results_baseline_run_id ON baseline_task_results(baseline_run_id);
CREATE INDEX idx_baseline_task_results_task_id ON baseline_task_results(task_id);

-- ---------------------------------------------------------------------------
-- 11. credentials
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS credentials (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider         TEXT NOT NULL,
  label            TEXT NOT NULL,
  encrypted_key    TEXT NOT NULL,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  last_verified_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_credentials_organization_id ON credentials(organization_id);

CREATE TRIGGER set_credentials_updated_at
  BEFORE UPDATE ON credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 12. docs_pages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS docs_pages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT NOT NULL UNIQUE,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  category   TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE docs_pages ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_docs_pages_updated_at
  BEFORE UPDATE ON docs_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 13. package_artifacts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS package_artifacts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
  version_id    UUID NOT NULL REFERENCES environment_versions(id) ON DELETE CASCADE,
  artifact_type TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  size_bytes    BIGINT,
  checksum      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE package_artifacts ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_package_artifacts_environment_id ON package_artifacts(environment_id);
CREATE INDEX idx_package_artifacts_version_id ON package_artifacts(version_id);

-- ---------------------------------------------------------------------------
-- 14. organization_environments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organization_environments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  environment_id  UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
  access_level    TEXT NOT NULL DEFAULT 'full',
  granted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE organization_environments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_organization_environments_organization_id ON organization_environments(organization_id);
CREATE INDEX idx_organization_environments_environment_id ON organization_environments(environment_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_organization_environments_org_env_unique
  ON organization_environments(organization_id, environment_id);

-- =============================================================================
-- Athanor RL Training Platform - Row Level Security Policies
-- Migration: 20250102000000_add_rls_policies.sql
--
-- Adds explicit RLS policies for tenant isolation. Every table that stores
-- org-scoped data is restricted so authenticated users can only read/write
-- rows belonging to their own organization. The user's org membership is
-- resolved via the profiles table keyed on auth.uid().
--
-- Design principles:
--   1. Deny by default (RLS is already enabled on all tables).
--   2. SELECT/INSERT/UPDATE/DELETE are granted per-table, not blanket.
--   3. Credentials table never exposes encrypted_key through RLS select;
--      a restricted column list is enforced via a security-definer view
--      (see 20250103 migration) — but the RLS policy itself still blocks
--      cross-tenant access at the row level.
--   4. Service-role (SUPABASE_SERVICE_ROLE_KEY) bypasses RLS by design
--      and must NEVER be exposed to client code.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper: resolve the caller's organization_id from their profile.
-- Returns NULL if the user has no profile (and therefore no org access).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 1. organizations — members can read their own org
-- ---------------------------------------------------------------------------
CREATE POLICY "org_select_own"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id = auth_user_org_id()
  );

CREATE POLICY "org_update_admin"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    id = auth_user_org_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.organization_id = organizations.id
        AND profiles.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    id = auth_user_org_id()
  );

-- ---------------------------------------------------------------------------
-- 2. profiles — users can read org-mates, update only themselves
-- ---------------------------------------------------------------------------
CREATE POLICY "profiles_select_org"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    organization_id = auth_user_org_id()
  );

CREATE POLICY "profiles_update_self"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
  )
  WITH CHECK (
    id = auth.uid()
    AND organization_id = auth_user_org_id()
  );

-- ---------------------------------------------------------------------------
-- 3. environments — org members can read; admins/owners can mutate
-- ---------------------------------------------------------------------------
CREATE POLICY "environments_select_org"
  ON environments FOR SELECT
  TO authenticated
  USING (
    organization_id = auth_user_org_id()
  );

CREATE POLICY "environments_insert_admin"
  ON environments FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = auth_user_org_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "environments_update_admin"
  ON environments FOR UPDATE
  TO authenticated
  USING (
    organization_id = auth_user_org_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    organization_id = auth_user_org_id()
  );

CREATE POLICY "environments_delete_admin"
  ON environments FOR DELETE
  TO authenticated
  USING (
    organization_id = auth_user_org_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('owner', 'admin')
    )
  );

-- ---------------------------------------------------------------------------
-- 4. environment_versions — access follows parent environment's org
-- ---------------------------------------------------------------------------
CREATE POLICY "env_versions_select_org"
  ON environment_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM environments
      WHERE environments.id = environment_versions.environment_id
        AND environments.organization_id = auth_user_org_id()
    )
  );

CREATE POLICY "env_versions_insert_admin"
  ON environment_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM environments
      WHERE environments.id = environment_versions.environment_id
        AND environments.organization_id = auth_user_org_id()
    )
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "env_versions_update_admin"
  ON environment_versions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM environments
      WHERE environments.id = environment_versions.environment_id
        AND environments.organization_id = auth_user_org_id()
    )
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('owner', 'admin')
    )
  );

-- ---------------------------------------------------------------------------
-- 5. tasks — access follows parent environment's org
-- ---------------------------------------------------------------------------
CREATE POLICY "tasks_select_org"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM environments
      WHERE environments.id = tasks.environment_id
        AND environments.organization_id = auth_user_org_id()
    )
  );

CREATE POLICY "tasks_insert_admin"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM environments
      WHERE environments.id = tasks.environment_id
        AND environments.organization_id = auth_user_org_id()
    )
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "tasks_update_admin"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM environments
      WHERE environments.id = tasks.environment_id
        AND environments.organization_id = auth_user_org_id()
    )
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('owner', 'admin')
    )
  );

-- ---------------------------------------------------------------------------
-- 6. calibration_profiles — org-scoped
-- ---------------------------------------------------------------------------
CREATE POLICY "cal_profiles_select_org"
  ON calibration_profiles FOR SELECT
  TO authenticated
  USING (
    organization_id = auth_user_org_id()
  );

CREATE POLICY "cal_profiles_insert_org"
  ON calibration_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = auth_user_org_id()
  );

CREATE POLICY "cal_profiles_update_org"
  ON calibration_profiles FOR UPDATE
  TO authenticated
  USING (
    organization_id = auth_user_org_id()
  )
  WITH CHECK (
    organization_id = auth_user_org_id()
  );

CREATE POLICY "cal_profiles_delete_admin"
  ON calibration_profiles FOR DELETE
  TO authenticated
  USING (
    organization_id = auth_user_org_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('owner', 'admin')
    )
  );

-- ---------------------------------------------------------------------------
-- 7. runs — org-scoped
-- ---------------------------------------------------------------------------
CREATE POLICY "runs_select_org"
  ON runs FOR SELECT
  TO authenticated
  USING (
    organization_id = auth_user_org_id()
  );

CREATE POLICY "runs_insert_org"
  ON runs FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = auth_user_org_id()
  );

CREATE POLICY "runs_update_org"
  ON runs FOR UPDATE
  TO authenticated
  USING (
    organization_id = auth_user_org_id()
  )
  WITH CHECK (
    organization_id = auth_user_org_id()
  );

-- ---------------------------------------------------------------------------
-- 8. run_results — access follows parent run's org
-- ---------------------------------------------------------------------------
CREATE POLICY "run_results_select_org"
  ON run_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM runs
      WHERE runs.id = run_results.run_id
        AND runs.organization_id = auth_user_org_id()
    )
  );

CREATE POLICY "run_results_insert_org"
  ON run_results FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM runs
      WHERE runs.id = run_results.run_id
        AND runs.organization_id = auth_user_org_id()
    )
  );

-- ---------------------------------------------------------------------------
-- 9. baseline_runs — org-scoped
-- ---------------------------------------------------------------------------
CREATE POLICY "baseline_runs_select_org"
  ON baseline_runs FOR SELECT
  TO authenticated
  USING (
    organization_id = auth_user_org_id()
  );

CREATE POLICY "baseline_runs_insert_org"
  ON baseline_runs FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = auth_user_org_id()
  );

CREATE POLICY "baseline_runs_update_org"
  ON baseline_runs FOR UPDATE
  TO authenticated
  USING (
    organization_id = auth_user_org_id()
  )
  WITH CHECK (
    organization_id = auth_user_org_id()
  );

-- ---------------------------------------------------------------------------
-- 10. baseline_task_results — access follows parent baseline_run's org
-- ---------------------------------------------------------------------------
CREATE POLICY "baseline_results_select_org"
  ON baseline_task_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM baseline_runs
      WHERE baseline_runs.id = baseline_task_results.baseline_run_id
        AND baseline_runs.organization_id = auth_user_org_id()
    )
  );

CREATE POLICY "baseline_results_insert_org"
  ON baseline_task_results FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM baseline_runs
      WHERE baseline_runs.id = baseline_task_results.baseline_run_id
        AND baseline_runs.organization_id = auth_user_org_id()
    )
  );

-- ---------------------------------------------------------------------------
-- 11. credentials — org-scoped, admin-only mutation
--     CRITICAL: encrypted_key must NEVER be selected by client queries.
--     RLS blocks cross-tenant access; column-level restriction is handled
--     by the client query contract (only select safe metadata columns).
-- ---------------------------------------------------------------------------
CREATE POLICY "credentials_select_org"
  ON credentials FOR SELECT
  TO authenticated
  USING (
    organization_id = auth_user_org_id()
  );

CREATE POLICY "credentials_insert_admin"
  ON credentials FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = auth_user_org_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "credentials_update_admin"
  ON credentials FOR UPDATE
  TO authenticated
  USING (
    organization_id = auth_user_org_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    organization_id = auth_user_org_id()
  );

CREATE POLICY "credentials_delete_admin"
  ON credentials FOR DELETE
  TO authenticated
  USING (
    organization_id = auth_user_org_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('owner', 'admin')
    )
  );

-- ---------------------------------------------------------------------------
-- 12. docs_pages — public read for all authenticated users
-- ---------------------------------------------------------------------------
CREATE POLICY "docs_pages_select_authenticated"
  ON docs_pages FOR SELECT
  TO authenticated
  USING (true);

-- Docs mutation is admin-only (service role or future admin check)
-- No insert/update/delete policies for anon/authenticated — managed via
-- service role in server-side admin tooling.

-- ---------------------------------------------------------------------------
-- 13. package_artifacts — access follows parent environment's org
-- ---------------------------------------------------------------------------
CREATE POLICY "package_artifacts_select_org"
  ON package_artifacts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM environments
      WHERE environments.id = package_artifacts.environment_id
        AND environments.organization_id = auth_user_org_id()
    )
  );

CREATE POLICY "package_artifacts_insert_admin"
  ON package_artifacts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM environments
      WHERE environments.id = package_artifacts.environment_id
        AND environments.organization_id = auth_user_org_id()
    )
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('owner', 'admin')
    )
  );

-- ---------------------------------------------------------------------------
-- 14. organization_environments — org-scoped
-- ---------------------------------------------------------------------------
CREATE POLICY "org_envs_select_org"
  ON organization_environments FOR SELECT
  TO authenticated
  USING (
    organization_id = auth_user_org_id()
  );

CREATE POLICY "org_envs_insert_admin"
  ON organization_environments FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = auth_user_org_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "org_envs_delete_admin"
  ON organization_environments FOR DELETE
  TO authenticated
  USING (
    organization_id = auth_user_org_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('owner', 'admin')
    )
  );

-- Add missing columns to credentials table
-- base_url: needed for proxy providers (OpenAI-compatible, Azure, LiteLLM)
-- key_suffix: masked last 4 chars for safe display (e.g., "...a1b2")

ALTER TABLE credentials ADD COLUMN IF NOT EXISTS base_url TEXT;
ALTER TABLE credentials ADD COLUMN IF NOT EXISTS key_suffix TEXT NOT NULL DEFAULT '...****';

-- Add comment explaining the encrypted_key field
COMMENT ON COLUMN credentials.encrypted_key IS
  'API key encrypted at rest. Decrypt server-side only when injecting into run execution. '
  'Never expose to browser. The key_suffix column provides safe display text.';

COMMENT ON COLUMN credentials.key_suffix IS
  'Masked suffix of the API key (e.g., "...a1b2"). Safe for browser display. '
  'Generated server-side during credential creation.';

COMMENT ON COLUMN credentials.base_url IS
  'Optional base URL for proxy providers (OpenAI-compatible, Azure, LiteLLM, Bedrock). '
  'NULL for direct providers (Anthropic, Google, Mistral, Moonshot).';

-- =============================================================================
-- Seed data: Athanor internal org + 6 environments + 154 tasks
-- Run after migrations: psql < supabase/seed.sql
-- =============================================================================

-- Internal organization (Athanor team)
INSERT INTO organizations (id, name, slug, plan) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Athanor AI', 'athanor-ai', 'internal')
ON CONFLICT (id) DO NOTHING;

-- 6 environments (using deterministic UUIDs)
INSERT INTO environments (id, organization_id, name, slug, engine, status, config) VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Hardware Verification',     'hw-cbmc',                 'ebmc',       'active', '{"tasks": 26, "repo": "athanor-ai/hw-cbmc"}'),
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Lean Theorem Proving',      'lean-theorem-proving',    'lean4',      'active', '{"tasks": 30, "repo": "athanor-ai/lean-theorem-proving"}'),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'C-to-Rust Porting',         'c-to-rust',               'cargo',      'active', '{"tasks": 28, "repo": "athanor-ai/c-to-rust"}'),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'Network Protocols',          'congestion-control',      'network-sim','active', '{"tasks": 24, "repo": "athanor-ai/congestion-control"}'),
  ('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', 'Distributed Consensus',      'distributed-consensus',   'go-test',    'active', '{"tasks": 26, "repo": "athanor-ai/distributed-consensus"}'),
  ('00000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', 'Authorization Policies',     'cedar-policy-verification','cedar-cli', 'active', '{"tasks": 20, "repo": "athanor-ai/cedar-policy-verification"}')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, config = EXCLUDED.config;

-- Internal org has access to all environments
INSERT INTO organization_environments (organization_id, environment_id, access_level) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'full'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'full'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', 'full'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013', 'full'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000014', 'full'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000015', 'full')
ON CONFLICT DO NOTHING;

-- Environment versions (v1.0.0 for all)
INSERT INTO environment_versions (id, environment_id, version_tag, changelog, docker_image, status) VALUES
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010', '1.0.0', 'Initial release: 26 tasks, 5-model baselines', 'athanor/hw-cbmc:1.0.0',                 'active'),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000011', '1.0.0', 'Initial release: 30 tasks, 5-model baselines', 'athanor/lean-theorem-proving:1.0.0',    'active'),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000012', '1.0.0', 'Initial release: 28 tasks, 5-model baselines', 'athanor/c-to-rust:1.0.0',               'active'),
  ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000013', '1.0.0', 'Initial release: 24 tasks, 5-model baselines', 'athanor/congestion-control:1.0.0',      'active'),
  ('00000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000014', '1.0.0', 'Initial release: 26 tasks, 5-model baselines', 'athanor/distributed-consensus:1.0.0',   'active'),
  ('00000000-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000015', '1.0.0', 'Initial release: 20 tasks, 5-model baselines', 'athanor/cedar-policy-verification:1.0.0','active')
ON CONFLICT (id) DO NOTHING;
