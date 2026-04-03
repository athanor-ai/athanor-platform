-- =============================================================================
-- Seed data: Athanor internal org + 6 environments + 154 tasks
-- Run after migrations: psql < supabase/seed.sql
-- =============================================================================

-- Internal organization (Athanor team)
INSERT INTO organizations (id, name, slug, plan) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Athanor AI', 'athanor-ai', 'internal')
ON CONFLICT (id) DO NOTHING;

-- 6 environments
INSERT INTO environments (id, organization_id, name, slug, engine, status, config) VALUES
  ('env-hw-cbmc',   '00000000-0000-0000-0000-000000000001', 'Hardware Verification',     'hw-cbmc',                 'ebmc',       'active', '{"tasks": 26, "repo": "athanor-ai/hw-cbmc"}'),
  ('env-lean',      '00000000-0000-0000-0000-000000000001', 'Lean Theorem Proving',      'lean-theorem-proving',    'lean4',      'active', '{"tasks": 30, "repo": "athanor-ai/lean-theorem-proving"}'),
  ('env-csparse',   '00000000-0000-0000-0000-000000000001', 'C-to-Rust Porting',         'c-to-rust',               'cargo',      'active', '{"tasks": 28, "repo": "athanor-ai/c-to-rust"}'),
  ('env-cc',        '00000000-0000-0000-0000-000000000001', 'Network Protocols',          'congestion-control',      'network-sim','active', '{"tasks": 24, "repo": "athanor-ai/congestion-control"}'),
  ('env-dc',        '00000000-0000-0000-0000-000000000001', 'Distributed Consensus',      'distributed-consensus',   'go-test',    'active', '{"tasks": 26, "repo": "athanor-ai/distributed-consensus"}'),
  ('env-cedar',     '00000000-0000-0000-0000-000000000001', 'Authorization Policies',     'cedar-policy-verification','cedar-cli', 'active', '{"tasks": 20, "repo": "athanor-ai/cedar-policy-verification"}')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, config = EXCLUDED.config;

-- Internal org has access to all environments
INSERT INTO organization_environments (organization_id, environment_id, access_level) VALUES
  ('00000000-0000-0000-0000-000000000001', 'env-hw-cbmc',  'full'),
  ('00000000-0000-0000-0000-000000000001', 'env-lean',     'full'),
  ('00000000-0000-0000-0000-000000000001', 'env-csparse',  'full'),
  ('00000000-0000-0000-0000-000000000001', 'env-cc',       'full'),
  ('00000000-0000-0000-0000-000000000001', 'env-dc',       'full'),
  ('00000000-0000-0000-0000-000000000001', 'env-cedar',    'full')
ON CONFLICT DO NOTHING;

-- Environment versions (v1.0.0 for all)
INSERT INTO environment_versions (id, environment_id, version, changelog, docker_image, status) VALUES
  ('ver-hw-1',  'env-hw-cbmc',  '1.0.0', 'Initial release: 26 tasks, 5-model baselines', 'athanor/hw-cbmc:1.0.0',                 'active'),
  ('ver-lean-1','env-lean',     '1.0.0', 'Initial release: 30 tasks, 5-model baselines', 'athanor/lean-theorem-proving:1.0.0',    'active'),
  ('ver-cs-1',  'env-csparse',  '1.0.0', 'Initial release: 28 tasks, 5-model baselines', 'athanor/c-to-rust:1.0.0',               'active'),
  ('ver-cc-1',  'env-cc',       '1.0.0', 'Initial release: 24 tasks, 5-model baselines', 'athanor/congestion-control:1.0.0',      'active'),
  ('ver-dc-1',  'env-dc',       '1.0.0', 'Initial release: 26 tasks, 5-model baselines', 'athanor/distributed-consensus:1.0.0',   'active'),
  ('ver-ced-1', 'env-cedar',    '1.0.0', 'Initial release: 20 tasks, 5-model baselines', 'athanor/cedar-policy-verification:1.0.0','active')
ON CONFLICT (id) DO NOTHING;
