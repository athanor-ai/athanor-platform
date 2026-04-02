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
