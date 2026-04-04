/**
 * Tahoe data layer — now sourced from real Athanor repo data.
 *
 * All environment, task, run, and baseline records are derived from actual
 * repository content in the athanor-ai GitHub org. The data was extracted
 * from root_data/eval/configs/ and runs/ directories in each environment repo.
 *
 * When we cut over to real Supabase data the hooks simply stop importing from
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
  CredentialSummary,
  DocsPage,
} from "@/types/database";
import { ATHANOR_ENVIRONMENTS } from "./environments";
import { realTasks } from "./tasks";
import { realRuns, realRunResults, realBaselineRuns } from "./runs";

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
  id: "org-athanor",
  name: "Athanor Labs",
  slug: "athanor-labs",
  plan: "enterprise",
  created_at: weekAgo,
  updated_at: now,
};

/* ------------------------------------------------------------------ */
/*  Environments  (derived from ATHANOR_ENVIRONMENTS)                  */
/* ------------------------------------------------------------------ */

export const mockEnvironments: Environment[] = ATHANOR_ENVIRONMENTS.map(
  (def) => ({
    id: def.id,
    organization_id: "org-athanor",
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
/*  Environment versions — sourced from VERSION files in repos         */
/* ------------------------------------------------------------------ */

export const mockEnvironmentVersions: EnvironmentVersion[] = [
  {
    id: "ver-lean-01",
    environment_id: "env-lean",
    version_tag: "v1.0.0",
    changelog:
      "30 Lean 4 theorem-proving tasks: Ackermann, compiler correctness, Church-Rosser, RBT invariants, regex derivatives, and more",
    docker_image: "athanor/lean-theorem-proving:1.0.0",
    status: "published",
    published_at: dayAgo,
    created_at: dayAgo,
    updated_at: dayAgo,
  },
  {
    id: "ver-cedar-01",
    environment_id: "env-cedar",
    version_tag: "v1.0.0",
    changelog:
      "20 Cedar policy tasks: multi-tenant auth debugging, healthcare records, adversarial audit, schema evolution, Lean policy proofs",
    docker_image: "athanor/cedar-policy-verification:1.0.0",
    status: "published",
    published_at: weekAgo,
    created_at: weekAgo,
    updated_at: weekAgo,
  },
  {
    id: "ver-consensus-01",
    environment_id: "env-consensus",
    version_tag: "v1.1.0",
    changelog:
      "26 distributed consensus tasks: Raft safety, PBFT, chain replication, CRDT-Raft, Paxos, 2PC verification, and more",
    docker_image: "athanor/distributed-consensus:1.1.0",
    status: "published",
    published_at: dayAgo,
    created_at: dayAgo,
    updated_at: dayAgo,
  },
  {
    id: "ver-congestion-01",
    environment_id: "env-congestion",
    version_tag: "v1.0.0",
    changelog:
      "24 congestion control tasks: BBR, CUBIC, Vegas, Westwood, LEDBAT, PCC implementations plus AIMD/fairness verification",
    docker_image: "athanor/congestion-control:1.0.0",
    status: "published",
    published_at: weekAgo,
    created_at: weekAgo,
    updated_at: weekAgo,
  },
  {
    id: "ver-c2rust-01",
    environment_id: "env-c2rust",
    version_tag: "v1.0.0",
    changelog:
      "28 C-to-Rust tasks: CSparse matrix ops, vector primitives, CSC format conversions, plus Verus formal verification proofs",
    docker_image: "athanor/c-to-rust:1.0.0",
    status: "published",
    published_at: hourAgo,
    created_at: hourAgo,
    updated_at: hourAgo,
  },
  {
    id: "ver-hwcbmc-01",
    environment_id: "env-hwcbmc",
    version_tag: "v1.0.0",
    changelog:
      "26 hardware verification tasks: Booth multiplier, FIFO async, branch predictor, DMA engine, arbiter lock, assertion synthesis, SMV ring",
    docker_image: "athanor/hw-cbmc:1.0.0",
    status: "published",
    published_at: dayAgo,
    created_at: dayAgo,
    updated_at: dayAgo,
  },
  {
    id: "ver-protein-01",
    environment_id: "env-protein",
    version_tag: "v1.0.0",
    changelog:
      "20 protein synthesis & computational neuroscience tasks: protein folding, neural circuits, gene regulatory networks, pharmacokinetics, population genetics, connectomics",
    docker_image: "athanor/protein-synthesis:1.0.0",
    status: "published",
    published_at: dayAgo,
    created_at: dayAgo,
    updated_at: dayAgo,
  },
];

/* ------------------------------------------------------------------ */
/*  Tasks — real 174 tasks from the 7 Athanor repos                    */
/* ------------------------------------------------------------------ */

export const mockTasks: Task[] = realTasks;

/* ------------------------------------------------------------------ */
/*  Calibration profiles                                               */
/* ------------------------------------------------------------------ */

export const mockCalibrationProfiles: CalibrationProfile[] = [
  {
    id: "cal-001",
    organization_id: "org-athanor",
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
    organization_id: "org-athanor",
    name: "Strict Binary (Verification)",
    description:
      "Near-binary calibration for pass/fail verification tasks. Best for Lean, Cedar, and EBMC environments.",
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
    organization_id: "org-athanor",
    name: "Lenient Gradient (Iterative)",
    description:
      "Gradual calibration curve rewarding partial progress. Best for C-to-Rust and congestion-control where incremental improvement matters.",
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
/*  Runs — real 30 runs from dryrun data (one per env x model)         */
/* ------------------------------------------------------------------ */

export const mockRuns: Run[] = realRuns;

/* ------------------------------------------------------------------ */
/*  Run results — real 770 results from repo dryrun data               */
/* ------------------------------------------------------------------ */

export const mockRunResults: RunResult[] = realRunResults;

/* ------------------------------------------------------------------ */
/*  Baselines — real 30 baselines from repo dryrun data                */
/* ------------------------------------------------------------------ */

export const mockBaselineRuns: BaselineRun[] = realBaselineRuns;

/* ------------------------------------------------------------------ */
/*  Credentials  (provider-level, not benchmark-specific)              */
/* ------------------------------------------------------------------ */

/**
 * Mock credentials — safe metadata only.
 * SECURITY: Never include encrypted_key or raw key material in client data.
 * Only a masked key_suffix is provided for user identification.
 */
export const mockCredentials: CredentialSummary[] = [
  {
    id: "cred-001",
    organization_id: "org-athanor",
    provider: "anthropic",
    label: "Anthropic API Key",
    key_suffix: "...m3k7",
    base_url: null,
    is_active: true,
    last_verified_at: hourAgo,
    created_at: weekAgo,
    updated_at: hourAgo,
  },
  {
    id: "cred-002",
    organization_id: "org-athanor",
    provider: "google",
    label: "Google AI API Key",
    key_suffix: "...p8v2",
    base_url: null,
    is_active: true,
    last_verified_at: dayAgo,
    created_at: weekAgo,
    updated_at: dayAgo,
  },
];

/* ------------------------------------------------------------------ */
/*  Docs pages                                                         */
/* ------------------------------------------------------------------ */

export const mockDocsPages: DocsPage[] = [
  {
    id: "doc-001",
    slug: "getting-started",
    title: "Getting Started",
    content:
      "Welcome to Tahoe, the Athanor private console for monitoring versioned RL training environments across formal verification, systems engineering, and safe code generation.",
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
      "Tahoe connects to six core Athanor environments with 154 total tasks: Lean Theorem Proving (30), Cedar Policy Verification (20), Distributed Consensus (26), Congestion Control (24), C-to-Rust (28), and Hardware Verification EBMC (26). Each environment is tested against 5 models with 3 runs each.",
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
      "Calibration profiles control how raw scores are transformed into calibrated scores. Each task config in the repos includes scoring parameters (sigmoid_center, sigmoid_scale) specific to that task type.",
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
      "REST API documentation for programmatic access to Tahoe environments, runs, calibration profiles, baselines, and results.",
    category: "reference",
    sort_order: 3,
    created_at: weekAgo,
    updated_at: weekAgo,
  },
  {
    id: "doc-005",
    slug: "model-lineup",
    title: "Model Lineup",
    content:
      "All environments use the same 5-model baseline lineup: Claude Sonnet 4.6 (Anthropic), Mistral Large 3, Kimi K2.5 (Moonshot), Gemini 3.1 Pro, and Gemini 2.5 Flash (Google). Each model runs 3 times per environment for statistical reliability.",
    category: "reference",
    sort_order: 4,
    created_at: weekAgo,
    updated_at: weekAgo,
  },
];
