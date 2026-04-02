/**
 * Tahoe seed / demo data.
 *
 * All environment, task, run, and baseline records are derived from the
 * canonical Athanor environment definitions in `./environments.ts`.  When we
 * cut over to real Supabase data the hooks simply stop importing from
 * here — the page model stays the same.
 */

import type {
  Organization,
  Environment,
  EnvironmentVersion,
  Task,
  CalibrationProfile,
  Run,
  RunResult,
  BaselineRun,
  Credential,
  DocsPage,
} from "@/types/database";
import { ATHANOR_ENVIRONMENTS } from "./environments";

/* ------------------------------------------------------------------ */
/*  Timestamps                                                         */
/* ------------------------------------------------------------------ */

const now = new Date().toISOString();
const hourAgo = new Date(Date.now() - 3600000).toISOString();
const dayAgo = new Date(Date.now() - 86400000).toISOString();
const weekAgo = new Date(Date.now() - 604800000).toISOString();

/* ------------------------------------------------------------------ */
/*  Organization                                                       */
/* ------------------------------------------------------------------ */

export const mockOrganization: Organization = {
  id: "org-001",
  name: "Athanor Labs",
  slug: "athanor-labs",
  plan: "pro",
  created_at: weekAgo,
  updated_at: now,
};

/* ------------------------------------------------------------------ */
/*  Environments  (derived from ATHANOR_ENVIRONMENTS)                  */
/* ------------------------------------------------------------------ */

export const mockEnvironments: Environment[] = ATHANOR_ENVIRONMENTS.map(
  (def) => ({
    id: def.id,
    organization_id: "org-001",
    name: def.name,
    slug: def.slug,
    description: def.description,
    engine: def.engine,
    status: "active" as const,
    config: { repo: def.repo, domain: def.domain },
    created_at: weekAgo,
    updated_at: dayAgo,
  }),
);

/* ------------------------------------------------------------------ */
/*  Environment versions                                               */
/* ------------------------------------------------------------------ */

export const mockEnvironmentVersions: EnvironmentVersion[] = [
  // Lean Theorem Proving
  {
    id: "ver-lean-01",
    environment_id: "env-lean",
    version_tag: "v1.2.0",
    changelog:
      "Added 150 new Mathlib4 tactic-generation tasks, improved timeout handling for long proofs",
    docker_image: "athanor/lean-theorem-proving:1.2.0",
    status: "published",
    published_at: dayAgo,
    created_at: dayAgo,
    updated_at: dayAgo,
  },
  {
    id: "ver-lean-02",
    environment_id: "env-lean",
    version_tag: "v1.1.0",
    changelog:
      "Initial public release with 320 proof synthesis tasks from Mathlib4",
    docker_image: "athanor/lean-theorem-proving:1.1.0",
    status: "published",
    published_at: weekAgo,
    created_at: weekAgo,
    updated_at: weekAgo,
  },
  // Cedar Policy Verification
  {
    id: "ver-cedar-01",
    environment_id: "env-cedar",
    version_tag: "v1.0.0",
    changelog:
      "Initial release with 200 policy authoring and entailment-checking tasks",
    docker_image: "athanor/cedar-policy-verification:1.0.0",
    status: "published",
    published_at: weekAgo,
    created_at: weekAgo,
    updated_at: weekAgo,
  },
  // Distributed Consensus
  {
    id: "ver-consensus-01",
    environment_id: "env-consensus",
    version_tag: "v0.9.0",
    changelog:
      "Beta release with Raft and Paxos protocol design tasks plus fault-injection scenarios",
    docker_image: "athanor/distributed-consensus:0.9.0",
    status: "published",
    published_at: dayAgo,
    created_at: dayAgo,
    updated_at: dayAgo,
  },
  // Congestion Control
  {
    id: "ver-congestion-01",
    environment_id: "env-congestion",
    version_tag: "v1.0.0",
    changelog:
      "Initial release with BBR, CUBIC, and custom algorithm design tasks in ns-3 sim",
    docker_image: "athanor/congestion-control:1.0.0",
    status: "published",
    published_at: weekAgo,
    created_at: weekAgo,
    updated_at: weekAgo,
  },
  // C-to-Rust
  {
    id: "ver-c2rust-01",
    environment_id: "env-c2rust",
    version_tag: "v1.1.0",
    changelog:
      "Added FFI boundary verification tasks and expanded safe-translation corpus to 180 programs",
    docker_image: "athanor/c-to-rust:1.1.0",
    status: "published",
    published_at: hourAgo,
    created_at: hourAgo,
    updated_at: hourAgo,
  },
  {
    id: "ver-c2rust-02",
    environment_id: "env-c2rust",
    version_tag: "v1.0.0",
    changelog:
      "Initial release with 120 C-to-Rust translation tasks from real-world C codebases",
    docker_image: "athanor/c-to-rust:1.0.0",
    status: "published",
    published_at: weekAgo,
    created_at: weekAgo,
    updated_at: weekAgo,
  },
  // Hardware Verification
  {
    id: "ver-hwcbmc-01",
    environment_id: "env-hwcbmc",
    version_tag: "v0.8.0-beta",
    changelog:
      "Beta release with 95 RTL property-checking and bounded model-checking tasks",
    docker_image: "athanor/hw-cbmc:0.8.0-beta",
    status: "draft",
    published_at: null,
    created_at: dayAgo,
    updated_at: dayAgo,
  },
];

/* ------------------------------------------------------------------ */
/*  Tasks — realistic examples for each environment                    */
/* ------------------------------------------------------------------ */

export const mockTasks: Task[] = [
  /* ---------- Lean Theorem Proving ---------- */
  {
    id: "task-lean-001",
    environment_id: "env-lean",
    name: "Prove commutativity of natural number addition",
    slug: "nat-add-comm",
    description:
      "Construct a Lean 4 tactic proof that Nat.add is commutative, using only core Mathlib tactics.",
    difficulty: "medium",
    category: "tactic-generation",
    max_steps: 40,
    reward_range: { min: 0, max: 1 },
    metadata: { lib: "Mathlib4", module: "Mathlib.Data.Nat.Basic" },
    created_at: weekAgo,
    updated_at: weekAgo,
  },
  {
    id: "task-lean-002",
    environment_id: "env-lean",
    name: "Synthesize proof of list reverse involution",
    slug: "list-reverse-invol",
    description:
      "Generate a complete proof term showing that List.reverse (List.reverse l) = l for all lists l.",
    difficulty: "hard",
    category: "proof-synthesis",
    max_steps: 80,
    reward_range: { min: 0, max: 1 },
    metadata: { lib: "Mathlib4", module: "Mathlib.Data.List.Basic" },
    created_at: weekAgo,
    updated_at: weekAgo,
  },

  /* ---------- Cedar Policy Verification ---------- */
  {
    id: "task-cedar-001",
    environment_id: "env-cedar",
    name: "Author RBAC policy for document sharing",
    slug: "rbac-doc-sharing",
    description:
      "Write a Cedar policy that permits read access to documents when the principal has role 'viewer' or 'editor' in the resource's parent folder.",
    difficulty: "easy",
    category: "policy-authoring",
    max_steps: 20,
    reward_range: { min: 0, max: 1 },
    metadata: { schema: "document-sharing-v2" },
    created_at: weekAgo,
    updated_at: weekAgo,
  },
  {
    id: "task-cedar-002",
    environment_id: "env-cedar",
    name: "Verify policy entailment for multi-tenant isolation",
    slug: "multitenant-entailment",
    description:
      "Determine whether a given policy set guarantees that principals from tenant A can never access resources belonging to tenant B.",
    difficulty: "hard",
    category: "entailment-checking",
    max_steps: 60,
    reward_range: { min: 0, max: 1 },
    metadata: { schema: "multi-tenant-saas-v1" },
    created_at: dayAgo,
    updated_at: dayAgo,
  },

  /* ---------- Distributed Consensus ---------- */
  {
    id: "task-consensus-001",
    environment_id: "env-consensus",
    name: "Design leader election for 5-node Raft cluster",
    slug: "raft-leader-election",
    description:
      "Implement the leader-election phase of Raft for a 5-node cluster, handling split votes and term increments correctly.",
    difficulty: "medium",
    category: "protocol-design",
    max_steps: 100,
    reward_range: { min: 0, max: 1 },
    metadata: { protocol: "raft", nodes: 5 },
    created_at: weekAgo,
    updated_at: weekAgo,
  },
  {
    id: "task-consensus-002",
    environment_id: "env-consensus",
    name: "Prove safety invariant under network partition",
    slug: "safety-partition",
    description:
      "Prove that the consensus protocol maintains the safety invariant (no two leaders in the same term) when an asymmetric network partition occurs.",
    difficulty: "expert",
    category: "safety-invariant",
    max_steps: 150,
    reward_range: { min: 0, max: 1 },
    metadata: { protocol: "raft", fault: "asymmetric-partition" },
    created_at: dayAgo,
    updated_at: dayAgo,
  },

  /* ---------- Congestion Control ---------- */
  {
    id: "task-congestion-001",
    environment_id: "env-congestion",
    name: "Tune BBR parameters for high-latency link",
    slug: "bbr-high-latency",
    description:
      "Adjust BBR pacing gain and cwnd parameters to maximize throughput on a 200 ms RTT, 100 Mbps bottleneck link with 1% random loss.",
    difficulty: "medium",
    category: "algorithm-design",
    max_steps: 60,
    reward_range: { min: 0, max: 1 },
    metadata: { simulator: "ns-3", topology: "dumbbell", rtt_ms: 200 },
    created_at: weekAgo,
    updated_at: weekAgo,
  },
  {
    id: "task-congestion-002",
    environment_id: "env-congestion",
    name: "Achieve Jain fairness index > 0.95 for 10 competing flows",
    slug: "fairness-10-flows",
    description:
      "Design or configure a congestion control algorithm that achieves Jain fairness index above 0.95 when 10 flows compete on a shared bottleneck.",
    difficulty: "hard",
    category: "fairness-tuning",
    max_steps: 80,
    reward_range: { min: 0, max: 1 },
    metadata: { simulator: "ns-3", flows: 10 },
    created_at: dayAgo,
    updated_at: dayAgo,
  },

  /* ---------- C-to-Rust ---------- */
  {
    id: "task-c2rust-001",
    environment_id: "env-c2rust",
    name: "Translate zlib inflate to safe Rust",
    slug: "zlib-inflate-safe",
    description:
      "Convert the zlib inflate() function from C to idiomatic safe Rust, eliminating all unsafe blocks while preserving byte-exact output.",
    difficulty: "hard",
    category: "safe-translation",
    max_steps: 120,
    reward_range: { min: 0, max: 1 },
    metadata: { source: "zlib-1.3", function: "inflate" },
    created_at: weekAgo,
    updated_at: weekAgo,
  },
  {
    id: "task-c2rust-002",
    environment_id: "env-c2rust",
    name: "Verify FFI boundary for OpenSSL EVP interface",
    slug: "openssl-evp-ffi",
    description:
      "Create correct Rust FFI bindings for OpenSSL's EVP_DigestInit / Update / Final and prove memory safety at the boundary.",
    difficulty: "expert",
    category: "ffi-boundary",
    max_steps: 100,
    reward_range: { min: 0, max: 1 },
    metadata: { source: "openssl-3.x", api: "EVP_Digest" },
    created_at: dayAgo,
    updated_at: dayAgo,
  },

  /* ---------- Hardware Verification (EBMC) ---------- */
  {
    id: "task-hwcbmc-001",
    environment_id: "env-hwcbmc",
    name: "Check FIFO overflow assertion on AXI bus",
    slug: "axi-fifo-overflow",
    description:
      "Use EBMC to verify that the AXI-stream FIFO never overflows under all valid input sequences within a 20-cycle bound.",
    difficulty: "medium",
    category: "property-checking",
    max_steps: 50,
    reward_range: { min: 0, max: 1 },
    metadata: { design: "axi-stream-fifo", bound: 20 },
    created_at: weekAgo,
    updated_at: weekAgo,
  },
  {
    id: "task-hwcbmc-002",
    environment_id: "env-hwcbmc",
    name: "Synthesize liveness assertion for arbiter grant",
    slug: "arbiter-liveness",
    description:
      "Automatically synthesize a SystemVerilog assertion that captures the liveness property: every request is eventually granted within N cycles.",
    difficulty: "hard",
    category: "assertion-synthesis",
    max_steps: 70,
    reward_range: { min: 0, max: 1 },
    metadata: { design: "round-robin-arbiter", ports: 4 },
    created_at: dayAgo,
    updated_at: dayAgo,
  },
];

/* ------------------------------------------------------------------ */
/*  Calibration profiles                                               */
/* ------------------------------------------------------------------ */

export const mockCalibrationProfiles: CalibrationProfile[] = [
  {
    id: "cal-001",
    organization_id: "org-001",
    name: "Default Sigmoid",
    description:
      "Standard sigmoid calibration with moderate steepness for general-purpose evaluation across all environments.",
    sigmoid_center: 0.5,
    sigmoid_steepness: 10.0,
    time_weight: 0.3,
    step_penalty: 0.01,
    config: {},
    is_default: true,
    created_at: weekAgo,
    updated_at: weekAgo,
  },
  {
    id: "cal-002",
    organization_id: "org-001",
    name: "Strict Binary (Verification)",
    description:
      "Near-binary calibration for pass/fail verification tasks — proofs either check or they don't. Best for Lean, Cedar, and EBMC environments.",
    sigmoid_center: 0.5,
    sigmoid_steepness: 50.0,
    time_weight: 0.1,
    step_penalty: 0.005,
    config: {},
    is_default: false,
    created_at: dayAgo,
    updated_at: dayAgo,
  },
  {
    id: "cal-003",
    organization_id: "org-001",
    name: "Lenient Gradient (Iterative)",
    description:
      "Gradual calibration curve that rewards partial progress. Best for C-to-Rust translation and congestion-control tuning where incremental improvement matters.",
    sigmoid_center: 0.3,
    sigmoid_steepness: 5.0,
    time_weight: 0.5,
    step_penalty: 0.002,
    config: {},
    is_default: false,
    created_at: dayAgo,
    updated_at: dayAgo,
  },
];

/* ------------------------------------------------------------------ */
/*  Runs                                                               */
/* ------------------------------------------------------------------ */

export const mockRuns: Run[] = [
  {
    id: "run-001",
    organization_id: "org-001",
    environment_id: "env-lean",
    calibration_profile_id: "cal-002",
    model_name: "claude-sonnet-4.6",
    status: "completed",
    started_at: hourAgo,
    completed_at: now,
    total_tasks: 40,
    completed_tasks: 40,
    mean_score: 0.68,
    config: { temperature: 0.0, max_tokens: 4096 },
    created_at: hourAgo,
    updated_at: now,
  },
  {
    id: "run-002",
    organization_id: "org-001",
    environment_id: "env-cedar",
    calibration_profile_id: "cal-002",
    model_name: "mistral-large-3",
    status: "running",
    started_at: hourAgo,
    completed_at: null,
    total_tasks: 50,
    completed_tasks: 31,
    mean_score: 0.55,
    config: { temperature: 0.0, max_tokens: 8192 },
    created_at: hourAgo,
    updated_at: now,
  },
  {
    id: "run-003",
    organization_id: "org-001",
    environment_id: "env-c2rust",
    calibration_profile_id: "cal-003",
    model_name: "gemini-2.5-flash",
    status: "completed",
    started_at: dayAgo,
    completed_at: dayAgo,
    total_tasks: 30,
    completed_tasks: 30,
    mean_score: 0.42,
    config: { temperature: 0.0 },
    created_at: dayAgo,
    updated_at: dayAgo,
  },
  {
    id: "run-004",
    organization_id: "org-001",
    environment_id: "env-consensus",
    calibration_profile_id: null,
    model_name: "kimi-k2.5",
    status: "failed",
    started_at: dayAgo,
    completed_at: dayAgo,
    total_tasks: 15,
    completed_tasks: 4,
    mean_score: null,
    config: { temperature: 0.2 },
    created_at: dayAgo,
    updated_at: dayAgo,
  },
  {
    id: "run-005",
    organization_id: "org-001",
    environment_id: "env-hwcbmc",
    calibration_profile_id: "cal-001",
    model_name: "gemini-3.1-pro",
    status: "pending",
    started_at: null,
    completed_at: null,
    total_tasks: 95,
    completed_tasks: 0,
    mean_score: null,
    config: { temperature: 0.0, max_tokens: 4096 },
    created_at: now,
    updated_at: now,
  },
  {
    id: "run-006",
    organization_id: "org-001",
    environment_id: "env-congestion",
    calibration_profile_id: "cal-003",
    model_name: "claude-sonnet-4.6",
    status: "completed",
    started_at: dayAgo,
    completed_at: dayAgo,
    total_tasks: 20,
    completed_tasks: 20,
    mean_score: 0.61,
    config: { temperature: 0.0, max_tokens: 4096 },
    created_at: dayAgo,
    updated_at: dayAgo,
  },
];

/* ------------------------------------------------------------------ */
/*  Run results (sample results for run-001 — Lean Theorem Proving)    */
/* ------------------------------------------------------------------ */

export const mockRunResults: RunResult[] = [
  {
    id: "rr-001",
    run_id: "run-001",
    task_id: "task-lean-001",
    raw_score: 0.92,
    calibrated_score: 0.88,
    steps_used: 18,
    max_steps: 40,
    duration_ms: 32400,
    trajectory: [],
    error: null,
    created_at: now,
  },
  {
    id: "rr-002",
    run_id: "run-001",
    task_id: "task-lean-002",
    raw_score: 0.45,
    calibrated_score: 0.38,
    steps_used: 80,
    max_steps: 80,
    duration_ms: 95200,
    trajectory: [],
    error: null,
    created_at: now,
  },
  {
    id: "rr-003",
    run_id: "run-003",
    task_id: "task-c2rust-001",
    raw_score: 0.6,
    calibrated_score: 0.52,
    steps_used: 98,
    max_steps: 120,
    duration_ms: 72800,
    trajectory: [],
    error: null,
    created_at: dayAgo,
  },
];

/* ------------------------------------------------------------------ */
/*  Baselines                                                          */
/* ------------------------------------------------------------------ */

export const mockBaselineRuns: BaselineRun[] = [
  {
    id: "bl-001",
    organization_id: "org-001",
    environment_id: "env-lean",
    model_name: "claude-sonnet-4.6",
    label: "Claude Sonnet 4.6 — Lean Theorem Proving (Q2 2025)",
    status: "completed",
    mean_score: 0.68,
    median_score: 0.72,
    config: { temperature: 0.0, runs: 3 },
    created_at: weekAgo,
    updated_at: weekAgo,
  },
  {
    id: "bl-002",
    organization_id: "org-001",
    environment_id: "env-lean",
    model_name: "mistral-large-3",
    label: "Mistral Large 3 — Lean Theorem Proving (Q2 2025)",
    status: "completed",
    mean_score: 0.59,
    median_score: 0.62,
    config: { temperature: 0.0, runs: 3 },
    created_at: weekAgo,
    updated_at: weekAgo,
  },
  {
    id: "bl-003",
    organization_id: "org-001",
    environment_id: "env-cedar",
    model_name: "claude-sonnet-4.6",
    label: "Claude Sonnet 4.6 — Cedar Policy Verification (Q2 2025)",
    status: "completed",
    mean_score: 0.74,
    median_score: 0.77,
    config: { temperature: 0.0, runs: 3 },
    created_at: weekAgo,
    updated_at: weekAgo,
  },
  {
    id: "bl-004",
    organization_id: "org-001",
    environment_id: "env-c2rust",
    model_name: "kimi-k2.5",
    label: "Kimi K2.5 — C-to-Rust (Q2 2025)",
    status: "completed",
    mean_score: 0.38,
    median_score: 0.41,
    config: { temperature: 0.0, runs: 3 },
    created_at: weekAgo,
    updated_at: weekAgo,
  },
  {
    id: "bl-005",
    organization_id: "org-001",
    environment_id: "env-consensus",
    model_name: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash — Distributed Consensus (Q2 2025)",
    status: "completed",
    mean_score: 0.47,
    median_score: 0.50,
    config: { temperature: 0.0, runs: 3 },
    created_at: weekAgo,
    updated_at: weekAgo,
  },
  {
    id: "bl-006",
    organization_id: "org-001",
    environment_id: "env-congestion",
    model_name: "gemini-3.1-pro",
    label: "Gemini 3.1 Pro — Congestion Control (Q2 2025)",
    status: "completed",
    mean_score: 0.61,
    median_score: 0.63,
    config: { temperature: 0.0, runs: 3 },
    created_at: weekAgo,
    updated_at: weekAgo,
  },
  {
    id: "bl-007",
    organization_id: "org-001",
    environment_id: "env-hwcbmc",
    model_name: "mistral-large-3",
    label: "Mistral Large 3 — Hardware Verification EBMC (Q2 2025)",
    status: "completed",
    mean_score: 0.33,
    median_score: 0.35,
    config: { temperature: 0.0, runs: 3 },
    created_at: weekAgo,
    updated_at: weekAgo,
  },
];

/* ------------------------------------------------------------------ */
/*  Credentials  (unchanged — provider-level, not benchmark-specific)  */
/* ------------------------------------------------------------------ */

export const mockCredentials: Credential[] = [
  {
    id: "cred-001",
    organization_id: "org-001",
    provider: "anthropic",
    label: "Anthropic Production",
    encrypted_key: "sk-ant-...redacted",
    is_active: true,
    last_verified_at: hourAgo,
    created_at: weekAgo,
    updated_at: hourAgo,
  },
  {
    id: "cred-002",
    organization_id: "org-001",
    provider: "gemini",
    label: "Google Gemini Production",
    encrypted_key: "AIza...redacted",
    is_active: true,
    last_verified_at: dayAgo,
    created_at: weekAgo,
    updated_at: dayAgo,
  },
];

/* ------------------------------------------------------------------ */
/*  Docs pages                                                         */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Calibration heatmap data — per-environment, per-model scores       */
/*  These represent calibrated scores for each model across task       */
/*  families within each environment, suitable for heatmap rendering.  */
/* ------------------------------------------------------------------ */

export const HEATMAP_MODELS = [
  "Claude Sonnet 4.6",
  "Mistral Large 3",
  "Kimi K2.5",
  "Gemini 3.1 Pro",
  "Gemini 2.5 Flash",
] as const;

export type HeatmapModel = (typeof HEATMAP_MODELS)[number];

export interface HeatmapCell {
  model: HeatmapModel;
  task: string;
  score: number;
}

export interface EnvironmentHeatmap {
  environmentId: string;
  environmentName: string;
  tasks: string[];
  models: readonly HeatmapModel[];
  cells: HeatmapCell[];
}

export const mockCalibrationHeatmaps: EnvironmentHeatmap[] = [
  {
    environmentId: "env-lean",
    environmentName: "Lean Theorem Proving",
    tasks: [
      "tactic-generation",
      "proof-synthesis",
      "type-inhabitation",
      "lemma-discovery",
    ],
    models: HEATMAP_MODELS,
    cells: [
      // Claude Sonnet 4.6
      { model: "Claude Sonnet 4.6", task: "tactic-generation", score: 0.82 },
      { model: "Claude Sonnet 4.6", task: "proof-synthesis", score: 0.71 },
      { model: "Claude Sonnet 4.6", task: "type-inhabitation", score: 0.65 },
      { model: "Claude Sonnet 4.6", task: "lemma-discovery", score: 0.58 },
      // Mistral Large 3
      { model: "Mistral Large 3", task: "tactic-generation", score: 0.68 },
      { model: "Mistral Large 3", task: "proof-synthesis", score: 0.61 },
      { model: "Mistral Large 3", task: "type-inhabitation", score: 0.54 },
      { model: "Mistral Large 3", task: "lemma-discovery", score: 0.49 },
      // Kimi K2.5
      { model: "Kimi K2.5", task: "tactic-generation", score: 0.59 },
      { model: "Kimi K2.5", task: "proof-synthesis", score: 0.52 },
      { model: "Kimi K2.5", task: "type-inhabitation", score: 0.47 },
      { model: "Kimi K2.5", task: "lemma-discovery", score: 0.41 },
      // Gemini 3.1 Pro
      { model: "Gemini 3.1 Pro", task: "tactic-generation", score: 0.73 },
      { model: "Gemini 3.1 Pro", task: "proof-synthesis", score: 0.64 },
      { model: "Gemini 3.1 Pro", task: "type-inhabitation", score: 0.56 },
      { model: "Gemini 3.1 Pro", task: "lemma-discovery", score: 0.51 },
      // Gemini 2.5 Flash
      { model: "Gemini 2.5 Flash", task: "tactic-generation", score: 0.62 },
      { model: "Gemini 2.5 Flash", task: "proof-synthesis", score: 0.55 },
      { model: "Gemini 2.5 Flash", task: "type-inhabitation", score: 0.48 },
      { model: "Gemini 2.5 Flash", task: "lemma-discovery", score: 0.39 },
    ],
  },
  {
    environmentId: "env-cedar",
    environmentName: "Cedar Policy Verification",
    tasks: [
      "policy-authoring",
      "entailment-checking",
      "policy-repair",
      "access-control-audit",
    ],
    models: HEATMAP_MODELS,
    cells: [
      { model: "Claude Sonnet 4.6", task: "policy-authoring", score: 0.88 },
      { model: "Claude Sonnet 4.6", task: "entailment-checking", score: 0.76 },
      { model: "Claude Sonnet 4.6", task: "policy-repair", score: 0.69 },
      { model: "Claude Sonnet 4.6", task: "access-control-audit", score: 0.72 },
      { model: "Mistral Large 3", task: "policy-authoring", score: 0.74 },
      { model: "Mistral Large 3", task: "entailment-checking", score: 0.63 },
      { model: "Mistral Large 3", task: "policy-repair", score: 0.58 },
      { model: "Mistral Large 3", task: "access-control-audit", score: 0.61 },
      { model: "Kimi K2.5", task: "policy-authoring", score: 0.65 },
      { model: "Kimi K2.5", task: "entailment-checking", score: 0.54 },
      { model: "Kimi K2.5", task: "policy-repair", score: 0.49 },
      { model: "Kimi K2.5", task: "access-control-audit", score: 0.52 },
      { model: "Gemini 3.1 Pro", task: "policy-authoring", score: 0.79 },
      { model: "Gemini 3.1 Pro", task: "entailment-checking", score: 0.68 },
      { model: "Gemini 3.1 Pro", task: "policy-repair", score: 0.61 },
      { model: "Gemini 3.1 Pro", task: "access-control-audit", score: 0.66 },
      { model: "Gemini 2.5 Flash", task: "policy-authoring", score: 0.70 },
      { model: "Gemini 2.5 Flash", task: "entailment-checking", score: 0.58 },
      { model: "Gemini 2.5 Flash", task: "policy-repair", score: 0.51 },
      { model: "Gemini 2.5 Flash", task: "access-control-audit", score: 0.55 },
    ],
  },
  {
    environmentId: "env-consensus",
    environmentName: "Distributed Consensus",
    tasks: [
      "protocol-design",
      "fault-injection",
      "liveness-proof",
      "safety-invariant",
    ],
    models: HEATMAP_MODELS,
    cells: [
      { model: "Claude Sonnet 4.6", task: "protocol-design", score: 0.72 },
      { model: "Claude Sonnet 4.6", task: "fault-injection", score: 0.64 },
      { model: "Claude Sonnet 4.6", task: "liveness-proof", score: 0.53 },
      { model: "Claude Sonnet 4.6", task: "safety-invariant", score: 0.61 },
      { model: "Mistral Large 3", task: "protocol-design", score: 0.61 },
      { model: "Mistral Large 3", task: "fault-injection", score: 0.55 },
      { model: "Mistral Large 3", task: "liveness-proof", score: 0.44 },
      { model: "Mistral Large 3", task: "safety-invariant", score: 0.51 },
      { model: "Kimi K2.5", task: "protocol-design", score: 0.55 },
      { model: "Kimi K2.5", task: "fault-injection", score: 0.48 },
      { model: "Kimi K2.5", task: "liveness-proof", score: 0.38 },
      { model: "Kimi K2.5", task: "safety-invariant", score: 0.43 },
      { model: "Gemini 3.1 Pro", task: "protocol-design", score: 0.66 },
      { model: "Gemini 3.1 Pro", task: "fault-injection", score: 0.58 },
      { model: "Gemini 3.1 Pro", task: "liveness-proof", score: 0.47 },
      { model: "Gemini 3.1 Pro", task: "safety-invariant", score: 0.55 },
      { model: "Gemini 2.5 Flash", task: "protocol-design", score: 0.52 },
      { model: "Gemini 2.5 Flash", task: "fault-injection", score: 0.46 },
      { model: "Gemini 2.5 Flash", task: "liveness-proof", score: 0.35 },
      { model: "Gemini 2.5 Flash", task: "safety-invariant", score: 0.41 },
    ],
  },
  {
    environmentId: "env-congestion",
    environmentName: "Congestion Control",
    tasks: [
      "algorithm-design",
      "fairness-tuning",
      "bandwidth-optimization",
      "loss-recovery",
    ],
    models: HEATMAP_MODELS,
    cells: [
      { model: "Claude Sonnet 4.6", task: "algorithm-design", score: 0.75 },
      { model: "Claude Sonnet 4.6", task: "fairness-tuning", score: 0.62 },
      { model: "Claude Sonnet 4.6", task: "bandwidth-optimization", score: 0.68 },
      { model: "Claude Sonnet 4.6", task: "loss-recovery", score: 0.59 },
      { model: "Mistral Large 3", task: "algorithm-design", score: 0.64 },
      { model: "Mistral Large 3", task: "fairness-tuning", score: 0.53 },
      { model: "Mistral Large 3", task: "bandwidth-optimization", score: 0.58 },
      { model: "Mistral Large 3", task: "loss-recovery", score: 0.51 },
      { model: "Kimi K2.5", task: "algorithm-design", score: 0.57 },
      { model: "Kimi K2.5", task: "fairness-tuning", score: 0.46 },
      { model: "Kimi K2.5", task: "bandwidth-optimization", score: 0.52 },
      { model: "Kimi K2.5", task: "loss-recovery", score: 0.44 },
      { model: "Gemini 3.1 Pro", task: "algorithm-design", score: 0.69 },
      { model: "Gemini 3.1 Pro", task: "fairness-tuning", score: 0.57 },
      { model: "Gemini 3.1 Pro", task: "bandwidth-optimization", score: 0.63 },
      { model: "Gemini 3.1 Pro", task: "loss-recovery", score: 0.54 },
      { model: "Gemini 2.5 Flash", task: "algorithm-design", score: 0.55 },
      { model: "Gemini 2.5 Flash", task: "fairness-tuning", score: 0.44 },
      { model: "Gemini 2.5 Flash", task: "bandwidth-optimization", score: 0.49 },
      { model: "Gemini 2.5 Flash", task: "loss-recovery", score: 0.42 },
    ],
  },
  {
    environmentId: "env-c2rust",
    environmentName: "C-to-Rust",
    tasks: [
      "safe-translation",
      "ffi-boundary",
      "memory-safety-proof",
      "idiomatic-rewrite",
    ],
    models: HEATMAP_MODELS,
    cells: [
      { model: "Claude Sonnet 4.6", task: "safe-translation", score: 0.71 },
      { model: "Claude Sonnet 4.6", task: "ffi-boundary", score: 0.58 },
      { model: "Claude Sonnet 4.6", task: "memory-safety-proof", score: 0.49 },
      { model: "Claude Sonnet 4.6", task: "idiomatic-rewrite", score: 0.66 },
      { model: "Mistral Large 3", task: "safe-translation", score: 0.59 },
      { model: "Mistral Large 3", task: "ffi-boundary", score: 0.47 },
      { model: "Mistral Large 3", task: "memory-safety-proof", score: 0.38 },
      { model: "Mistral Large 3", task: "idiomatic-rewrite", score: 0.55 },
      { model: "Kimi K2.5", task: "safe-translation", score: 0.52 },
      { model: "Kimi K2.5", task: "ffi-boundary", score: 0.41 },
      { model: "Kimi K2.5", task: "memory-safety-proof", score: 0.33 },
      { model: "Kimi K2.5", task: "idiomatic-rewrite", score: 0.48 },
      { model: "Gemini 3.1 Pro", task: "safe-translation", score: 0.64 },
      { model: "Gemini 3.1 Pro", task: "ffi-boundary", score: 0.52 },
      { model: "Gemini 3.1 Pro", task: "memory-safety-proof", score: 0.42 },
      { model: "Gemini 3.1 Pro", task: "idiomatic-rewrite", score: 0.60 },
      { model: "Gemini 2.5 Flash", task: "safe-translation", score: 0.48 },
      { model: "Gemini 2.5 Flash", task: "ffi-boundary", score: 0.37 },
      { model: "Gemini 2.5 Flash", task: "memory-safety-proof", score: 0.28 },
      { model: "Gemini 2.5 Flash", task: "idiomatic-rewrite", score: 0.43 },
    ],
  },
  {
    environmentId: "env-hwcbmc",
    environmentName: "Hardware Verification (EBMC)",
    tasks: [
      "property-checking",
      "bounded-model-checking",
      "assertion-synthesis",
      "counter-example-analysis",
    ],
    models: HEATMAP_MODELS,
    cells: [
      { model: "Claude Sonnet 4.6", task: "property-checking", score: 0.63 },
      { model: "Claude Sonnet 4.6", task: "bounded-model-checking", score: 0.51 },
      { model: "Claude Sonnet 4.6", task: "assertion-synthesis", score: 0.45 },
      { model: "Claude Sonnet 4.6", task: "counter-example-analysis", score: 0.55 },
      { model: "Mistral Large 3", task: "property-checking", score: 0.52 },
      { model: "Mistral Large 3", task: "bounded-model-checking", score: 0.43 },
      { model: "Mistral Large 3", task: "assertion-synthesis", score: 0.36 },
      { model: "Mistral Large 3", task: "counter-example-analysis", score: 0.46 },
      { model: "Kimi K2.5", task: "property-checking", score: 0.44 },
      { model: "Kimi K2.5", task: "bounded-model-checking", score: 0.37 },
      { model: "Kimi K2.5", task: "assertion-synthesis", score: 0.29 },
      { model: "Kimi K2.5", task: "counter-example-analysis", score: 0.38 },
      { model: "Gemini 3.1 Pro", task: "property-checking", score: 0.57 },
      { model: "Gemini 3.1 Pro", task: "bounded-model-checking", score: 0.47 },
      { model: "Gemini 3.1 Pro", task: "assertion-synthesis", score: 0.39 },
      { model: "Gemini 3.1 Pro", task: "counter-example-analysis", score: 0.49 },
      { model: "Gemini 2.5 Flash", task: "property-checking", score: 0.41 },
      { model: "Gemini 2.5 Flash", task: "bounded-model-checking", score: 0.33 },
      { model: "Gemini 2.5 Flash", task: "assertion-synthesis", score: 0.25 },
      { model: "Gemini 2.5 Flash", task: "counter-example-analysis", score: 0.35 },
    ],
  },
];

export const mockDocsPages: DocsPage[] = [
  {
    id: "doc-001",
    slug: "getting-started",
    title: "Getting Started",
    content:
      "Welcome to Tahoe — Athanor's private console for monitoring versioned RL training environments across formal verification, systems engineering, and safe code generation.",
    category: "quickstart",
    sort_order: 0,
    created_at: weekAgo,
    updated_at: weekAgo,
  },
  {
    id: "doc-002",
    slug: "environments-overview",
    title: "Environments Overview",
    content:
      "Tahoe connects to six core Athanor environments: Lean Theorem Proving, Cedar Policy Verification, Distributed Consensus, Congestion Control, C-to-Rust, and Hardware Verification (EBMC). Each is a versioned, reproducible sandbox with its own task families and scoring criteria.",
    category: "concepts",
    sort_order: 1,
    created_at: weekAgo,
    updated_at: weekAgo,
  },
  {
    id: "doc-003",
    slug: "calibration-guide",
    title: "Calibration Guide",
    content:
      "Calibration profiles control how raw scores are transformed into calibrated scores. The 'Strict Binary' profile works well for verification environments (Lean, Cedar, EBMC) where proofs either check or don't. The 'Lenient Gradient' profile is better for translation and tuning environments (C-to-Rust, Congestion Control) where partial progress matters.",
    category: "concepts",
    sort_order: 2,
    created_at: weekAgo,
    updated_at: weekAgo,
  },
  {
    id: "doc-004",
    slug: "api-reference",
    title: "API Reference",
    content:
      "REST API documentation for programmatic access to Tahoe — environments, runs, calibration profiles, baselines, and results.",
    category: "reference",
    sort_order: 3,
    created_at: weekAgo,
    updated_at: weekAgo,
  },
  {
    id: "doc-005",
    slug: "training-integration",
    title: "Training Integration",
    content:
      "Guide for integrating Athanor environments with RL training pipelines via the Tahoe SDK. Covers Docker containers, Kubernetes job specs, and the Python SDK for connecting training loops to Lean, Cedar, Consensus, Congestion-Control, C-to-Rust, and EBMC environments.",
    category: "guides",
    sort_order: 4,
    created_at: weekAgo,
    updated_at: weekAgo,
  },
];
