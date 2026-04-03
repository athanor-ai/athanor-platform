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
