# Athanor Platform — Architecture Investigation Report

**Branch:** `cofounder-cto/investigate-env-connection`
**Date:** 2026-04-04
**Author:** Investigation agent

---

## Executive Summary

Athanor is a **Next.js 15 + Supabase** platform for evaluating LLM agents against curated, deterministic coding environments. Runs execute on a **single Azure VM** via SSH — there is **no Kubernetes, no container orchestration, and no k8s** involved. The platform currently has 6 hardcoded environments. Adding a new environment (e.g., `protein-synthesis`) requires changes in **5 places**: database seed, frontend registry, executor mapping, sync mapping, and the Azure VM filesystem.

---

## 1. Database Schema (14 tables)

**Source:** `supabase/migrations/20250101000000_initial_schema.sql` + 3 follow-up migrations

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `organizations` | Multi-tenant orgs | `id`, `name`, `slug`, `plan` |
| `profiles` | User accounts linked to orgs | `id`, `organization_id`, `email`, `role` |
| `environments` | Registered evaluation environments | `id`, `organization_id`, `name`, `slug`, `engine`, `status`, `config` (JSONB) |
| `environment_versions` | Versioned releases of envs | `environment_id`, `version_tag`, `docker_image`, `status` |
| `tasks` | Individual tasks within environments | `environment_id`, `name`, `slug`, `difficulty`, `category`, `max_steps`, `metadata` |
| `calibration_profiles` | Scoring calibration params | `sigmoid_center`, `sigmoid_steepness`, `time_weight`, `step_penalty` |
| `runs` | Evaluation run records | `organization_id`, `environment_id`, `model_name`, `status`, `mean_score`, `config` |
| `run_results` | Per-task results within a run | `run_id`, `task_id`, `raw_score`, `calibrated_score`, `steps_used`, `trajectory` |
| `baseline_runs` | Pre-computed baseline run records | `environment_id`, `model_name`, `label`, `mean_score` |
| `baseline_task_results` | Per-task baseline scores | `baseline_run_id`, `task_id`, `score` |
| `credentials` | Encrypted API keys per org | `provider`, `label`, `encrypted_key`, `base_url`, `key_suffix` |
| `docs_pages` | Documentation content | `slug`, `title`, `content`, `category` |
| `package_artifacts` | Downloadable env packages | `environment_id`, `version_id`, `artifact_type`, `storage_path` |
| `organization_environments` | Join table: org ↔ env access control | `organization_id`, `environment_id`, `access_level` |

**Key relationships:**
- Environments belong to an organization (the creator)
- Other orgs access environments via `organization_environments` join table
- Runs reference both an org and an environment
- Tasks belong to an environment
- Run results reference both a run and a task
- All tables have RLS enabled with org-scoped policies

### Seed data (`supabase/seed.sql`)

- 1 org: "Athanor AI" (`athanor-ai`, plan `internal`)
- 6 environments with deterministic UUIDs (`00000000-0000-0000-0000-00000000001x`)
- Environment `config` JSONB stores `{"tasks": N, "repo": "athanor-ai/<slug>"}`
- 6 environment_versions (v1.0.0 each) with docker images like `athanor/hw-cbmc:1.0.0`
- Full access granted in `organization_environments`

---

## 2. How Environments Are Registered/Connected

### 2a. Database level

Environments are **rows in the `environments` table**, inserted via seed SQL. Each has:
- `slug` — matches the GitHub repo name (e.g., `lean-theorem-proving`)
- `engine` — the runtime engine (e.g., `lean4`, `ebmc`, `cargo`, `cedar-cli`)
- `config` — JSONB blob with `{"tasks": N, "repo": "athanor-ai/<slug>"}`

**There is NO API to create environments dynamically.** The `GET /api/environments` route only reads existing environments filtered by org access. There is no `POST /api/environments`.

### 2b. Frontend registry (`src/data/environments.ts`)

A **hardcoded TypeScript array** `ATHANOR_ENVIRONMENTS` defines all 6 environments with rich metadata:

```typescript
{
  id: "env-lean",
  name: "Lean Theorem Proving",
  slug: "lean-theorem-proving",
  repo: "athanor-ai/lean-theorem-proving",
  dockerPrefix: "athanor/lean-theorem-proving",
  engine: "lean4",
  domain: "formal-verification",
  taskFamilies: ["tactic-generation", "proof-synthesis", ...]
}
```

This is the **single source of truth** for UI rendering. The `useEnvironments` hook currently returns **mock data** (not Supabase data):

```typescript
// src/hooks/useEnvironments.ts
// "In V1, return mock data. Swap to Supabase fetch when ready."
async function fetchEnvironments(): Promise<Environment[]> {
  await new Promise((r) => setTimeout(r, 300)); // simulated delay
  return mockEnvironments;
}
```

The `useOrgEnvironments` hook tries the real API first but falls back to all environments:

```typescript
// src/hooks/useOrgEnvironments.ts
async function fetchOrgEnvironments() {
  try {
    const res = await fetch("/api/environments");
    if (res.ok) { ... } // filter ATHANOR_ENVIRONMENTS by API response
  } catch { }
  return ATHANOR_ENVIRONMENTS; // fallback: show all
}
```

### 2c. Executor-level mapping (`src/lib/executor.ts`)

A **hardcoded map** translates environment slugs to VM directory names:

```typescript
export const ENV_REPO_MAP: Record<string, string> = {
  "lean-theorem-proving": "lean-demo",
  "cedar-policy-verification": "cedar-env",
  "distributed-consensus": "distributed-consensus",
  "congestion-control": "congestion-control",
  "c-to-rust": "csparse-rust-env",
  "hw-cbmc": "hw-cbmc-env",
};
```

**Note:** The directory names on the VM don't always match the slug (e.g., `lean-theorem-proving` → `lean-demo`, `c-to-rust` → `csparse-rust-env`).

### 2d. Sync-level mapping (`src/app/api/sync/route.ts`)

Another **hardcoded array** of VM directory names:

```typescript
const ENVS = [
  "hw-cbmc-env", "lean-demo", "csparse-rust-env",
  "congestion-control", "distributed-consensus", "cedar-env",
];
```

---

## 3. How Runs Are Launched

### 3a. Launch flow (end-to-end)

1. **User UI** (`/launch` page) → 3-step wizard: select environment → select models → review & launch
2. **Frontend hook** `useLaunchRun` → calls `POST /api/vm` (action: "start") then `POST /api/runs`
3. **`POST /api/runs`** → inserts run record in Supabase with status `pending`, then **fire-and-forget** calls `executeRun(runId)` from `src/lib/run-executor.ts`
4. **`executeRun`** (long-running, ~30-120 min):
   - Marks run as `running`
   - Starts Azure VM via `az vm start`
   - Waits for SSH readiness (up to 2 min)
   - Prepares credential env vars (decrypts org's API keys + merges platform keys)
   - Resolves environment slug → VM directory name via `ENV_REPO_MAP`
   - Builds SSH command: `cd ~/<repo-dir> && export <env vars> && python3 scripts/evaluate.py . --all-tasks --model <model> --max-time 900 --output /tmp/platform-run-<runId>.json`
   - Executes via `ssh -o StrictHostKeyChecking=no <target> '<command>'`
   - Streams stdout, parses progress (`Finished Task N/M: task_name ---`)
   - Fetches result JSON from VM via `ssh ... cat /tmp/platform-run-<runId>.json`
   - Parses results, inserts into `run_results` table
   - Calculates mean score, marks run as `completed`
   - Cleans up VM (removes workdirs, temp files, prunes images)
   - If no other runs pending, deallocates VM

5. **Frontend polling** — `useRunPolling` hook polls `GET /api/runs/:id` for status updates

### 3b. The actual evaluation command

```bash
python3 scripts/evaluate.py . --all-tasks --model <model-slug> --max-time 900 --output <output-path>
```

This runs **inside each environment repo directory** on the Azure VM. Each repo contains its own `scripts/evaluate.py` (a.k.a. `dryrun.py`).

### 3c. Credential injection

- Org's credentials are stored encrypted (AES-256-GCM) in the `credentials` table
- At run time, `prepareRunEnvironment()` decrypts all active credentials
- `buildRunEnvVars()` merges platform keys (Athanor's own) with customer keys
- Customer keys override platform keys
- Env vars are exported inline in the SSH command

---

## 4. Infrastructure (NOT Kubernetes)

### 4a. Architecture: Single Azure VM via SSH

**There is NO Kubernetes.** The execution backend is a **single Azure VM** managed via the Azure CLI:

| Component | Value |
|-----------|-------|
| VM Name | `standard-env-runner` (configurable: `AZURE_VM_NAME`) |
| Resource Group | `env-runner` (configurable: `AZURE_VM_RESOURCE_GROUP`) |
| SSH Target | `azureuser@20.245.2.136` (configurable: `AZURE_VM_SSH_TARGET`) |
| Lifecycle | Start via `az vm start`, stop via `az vm deallocate` |
| Max uptime | 6 hours (safety limit, enforced by watchdog) |

### 4b. VM lifecycle management (`src/lib/vm-manager.ts`)

- `startVM()` — `az vm start -g env-runner -n standard-env-runner`
- `stopVM()` — `az vm deallocate -g env-runner -n standard-env-runner` (stops billing)
- `getVMStatus()` — `az vm get-instance-view` (returns: running/deallocated/starting/stopping)
- `cleanupVM()` — SSH in and remove workdirs, temp files, prune containers, clear caches
- `checkVMHealth()` — SSH to check disk usage, memory, active processes
- `enforceVMSafetyLimits()` — Cron watchdog: shuts down idle or over-time VMs

### 4c. Container usage on the VM

Containers are built and run using **Podman** (not Docker), as seen in the sync route:

```typescript
`cd ~/${env} && podman build -f Containerfile -t ${env} . 2>&1 | tail -3`
```

Each environment repo on the VM has a `Containerfile` for building its scoring container.

### 4d. Cron/watchdog

- `GET /api/cron` — called by Vercel Cron or external service
- Authenticated via `CRON_SECRET` bearer token
- Calls `enforceVMSafetyLimits()` to auto-deallocate idle VMs

---

## 5. API Routes Summary

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/environments` | GET | List environments (org-filtered) |
| `/api/runs` | GET | List runs for org |
| `/api/runs` | POST | Create & launch a run |
| `/api/runs/[id]` | GET | Get run details |
| `/api/runs/[id]` | PATCH | Update run status (executor callback) |
| `/api/runs/[id]/results` | GET | Get run results |
| `/api/runs/[id]/results` | POST | Insert run results (executor callback) |
| `/api/vm` | GET | Get VM status |
| `/api/vm` | POST | Start/stop/cleanup/health/watchdog VM |
| `/api/sync` | POST | Sync scores/validate/rebuild on VM |
| `/api/cron` | GET | Safety watchdog (Vercel cron) |
| `/api/credentials` | GET/POST | List/create credentials |
| `/api/credentials/[id]` | PATCH/DELETE | Update/revoke credentials |
| `/api/credentials/verify` | POST | Verify a credential works |
| `/api/admin` | GET/POST | Admin panel operations |
| `/api/admin/invite` | POST | Invite users |
| `/api/auth/signup` | POST | User signup |

---

## 6. App Pages

| Route | Purpose |
|-------|---------|
| `/` | Root redirect |
| `/overview` | Dashboard: metrics, recent runs, quick nav |
| `/environments` | Grid of all 6 environments |
| `/environments/[id]` | Environment detail: versions, tasks, baselines |
| `/launch` | 3-step run launch wizard |
| `/runs` | Run history list |
| `/runs/[id]` | Run detail with live polling |
| `/tasks` | All tasks across environments |
| `/scores` | Score heatmap/visualization |
| `/baselines` | Baseline run comparison |
| `/calibration` | Scoring calibration profiles |
| `/credentials` | API key management |
| `/training` | RL training integration guide |
| `/quickstart` | Quick start guide with CLI commands |
| `/download` | Environment package downloads |
| `/docs` | Documentation |
| `/admin` | Admin panel |

---

## 7. How to Add `protein-synthesis` as a New Environment

Based on the investigation, you would need to modify these **5 locations**:

### 7a. Database: `supabase/seed.sql`

Add a new row to `environments`:
```sql
INSERT INTO environments (id, organization_id, name, slug, engine, status, config) VALUES
  ('00000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000001',
   'Protein Synthesis', 'protein-synthesis', '<engine>', 'active',
   '{"tasks": N, "repo": "athanor-ai/protein-synthesis"}');
```
Plus: `organization_environments` access grant and `environment_versions` row.

### 7b. Frontend registry: `src/data/environments.ts`

Add entry to `ATHANOR_ENVIRONMENTS`:
```typescript
{
  id: "env-protein",
  name: "Protein Synthesis",
  slug: "protein-synthesis",
  description: "...",
  engine: "<engine>",
  domain: "biology",
  repo: "athanor-ai/protein-synthesis",
  dockerPrefix: "athanor/protein-synthesis",
  taskFamilies: ["..."],
}
```

### 7c. Executor mapping: `src/lib/executor.ts`

Add to `ENV_REPO_MAP`:
```typescript
"protein-synthesis": "protein-synthesis-env", // or whatever the VM dir name is
```

### 7d. Sync mapping: `src/app/api/sync/route.ts`

Add to the `ENVS` array:
```typescript
const ENVS = [..., "protein-synthesis-env"];
```

### 7e. Azure VM: Clone and set up the repo

```bash
ssh azureuser@<vm-ip>
cd ~
git clone git@github.com:athanor-ai/protein-synthesis.git protein-synthesis-env
cd protein-synthesis-env
./build.sh  # or podman build -f Containerfile
```

### 7f. Mock data: `src/data/mock.ts`

Add mock environment, tasks, and baseline data for the new environment so the UI renders it in dev mode.

---

## 8. Key Findings & Gaps

### What's working:
- Full run execution pipeline: launch → VM start → SSH → evaluate.py → results → DB
- Multi-tenant org isolation with RLS
- Credential encryption (AES-256-GCM) with provider-specific env var mapping
- VM lifecycle management with safety limits and auto-shutdown
- 3-step launch wizard UI with credential readiness checking

### What's hardcoded/fragile:
1. **Environment registry is hardcoded in 4 places** (seed SQL, `environments.ts`, `executor.ts`, `sync/route.ts`) — adding a new env requires touching all 4
2. **`useEnvironments` hook returns mock data**, not real Supabase data — the comment says "Swap to Supabase fetch when ready"
3. **`ENV_REPO_MAP` slug→directory mapping** is manual and inconsistent (e.g., `lean-theorem-proving` → `lean-demo`)
4. **Single VM** — no horizontal scaling, no queue, no concurrent multi-env runs
5. **No environment creation API** — no `POST /api/environments`, all setup is manual
6. **No GitHub integration** — despite storing `repo` in config, there's no webhook/API that auto-syncs from GitHub repos

### Security notes:
- Service role key properly restricted to server-side code
- Credentials encrypted at rest, decrypted only during run execution
- RLS policies enforce org isolation on all tables
- Cloudflare Access for customer email management
- VM SSH uses `-o StrictHostKeyChecking=no` (acceptable for a fixed internal VM)
