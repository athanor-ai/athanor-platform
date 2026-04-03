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
