/**
 * Single source of truth for all Athanor environment configurations.
 *
 * Adding a new environment? Just add ONE entry to ENVIRONMENT_REGISTRY below.
 * All other files (environments.ts, executor.ts, sync/route.ts) derive from
 * this registry automatically.
 */

/* ------------------------------------------------------------------ */
/*  Config interface                                                    */
/* ------------------------------------------------------------------ */

export interface EnvironmentConfig {
  /** Stable short id used as the primary key in seed data (e.g. "env-lean"). */
  id: string;
  /** Human-readable name shown in the UI. */
  name: string;
  /** URL-safe slug matching the GitHub repo name. */
  slug: string;
  /** One-liner shown on cards and in page headers. */
  description: string;
  /** Underlying execution engine / runtime category. */
  engine: string;
  /** Domain tag for grouping and filtering. */
  domain: string;
  /** GitHub org/repo path (athanor-ai/<slug>). */
  repo: string;
  /** Docker image prefix used for versioned environment images. */
  dockerPrefix: string;
  /** Task family categories specific to this environment. */
  taskFamilies: string[];
  /** Name of the directory on the VM (under /home/azureuser/athanor-ai-repos/). */
  vmDirName: string;
}

/* ------------------------------------------------------------------ */
/*  Registry                                                           */
/* ------------------------------------------------------------------ */

/**
 * The canonical Athanor environments.
 *
 * Order matters — it drives the default sort in the Environments grid.
 */
export const ENVIRONMENT_REGISTRY: EnvironmentConfig[] = [
  {
    id: "env-lean",
    name: "Lean Theorem Proving",
    slug: "lean-theorem-proving",
    description:
      "Lean 4 interactive theorem proving environment for evaluating formal proof synthesis, tactic generation, and mathematical reasoning.",
    engine: "lean4",
    domain: "formal-verification",
    repo: "athanor-ai/lean-theorem-proving",
    dockerPrefix: "athanor/lean-theorem-proving",
    taskFamilies: [
      "tactic-generation",
      "proof-synthesis",
      "type-inhabitation",
      "lemma-discovery",
    ],
    vmDirName: "lean-demo",
  },
  {
    id: "env-cedar",
    name: "Cedar Policy Verification",
    slug: "cedar-policy-verification",
    description:
      "Cedar authorization policy verification environment for testing policy authoring, entailment checking, and access-control reasoning.",
    engine: "cedar-cli",
    domain: "authorization",
    repo: "athanor-ai/cedar-policy-verification",
    dockerPrefix: "athanor/cedar-policy-verification",
    taskFamilies: [
      "policy-authoring",
      "entailment-checking",
      "policy-repair",
      "access-control-audit",
    ],
    vmDirName: "cedar-env",
  },
  {
    id: "env-consensus",
    name: "Distributed Consensus",
    slug: "distributed-consensus",
    description:
      "Distributed consensus protocol environment for evaluating protocol design, fault injection response, and liveness/safety property verification.",
    engine: "network-sim",
    domain: "distributed-systems",
    repo: "athanor-ai/distributed-consensus",
    dockerPrefix: "athanor/distributed-consensus",
    taskFamilies: [
      "protocol-design",
      "fault-injection",
      "liveness-proof",
      "safety-invariant",
    ],
    vmDirName: "distributed-consensus",
  },
  {
    id: "env-congestion",
    name: "Congestion Control",
    slug: "congestion-control",
    description:
      "TCP congestion control environment for evaluating algorithm design, fairness tuning, and bandwidth utilization under variable network conditions.",
    engine: "ns3-sim",
    domain: "networking",
    repo: "athanor-ai/congestion-control",
    dockerPrefix: "athanor/congestion-control",
    taskFamilies: [
      "algorithm-design",
      "fairness-tuning",
      "bandwidth-optimization",
      "loss-recovery",
    ],
    vmDirName: "congestion-control",
  },
  {
    id: "env-c2rust",
    name: "C-to-Rust",
    slug: "c-to-rust",
    description:
      "C-to-Rust FFI porting and verification environment for evaluating safe translation, memory-safety guarantees, and FFI boundary correctness.",
    engine: "cargo-build",
    domain: "transpilation",
    repo: "athanor-ai/c-to-rust",
    dockerPrefix: "athanor/c-to-rust",
    taskFamilies: [
      "safe-translation",
      "ffi-boundary",
      "memory-safety-proof",
      "idiomatic-rewrite",
    ],
    vmDirName: "csparse-rust-env",
  },
  {
    id: "env-hwcbmc",
    name: "Hardware Verification (EBMC)",
    slug: "hw-cbmc",
    description:
      "Hardware verification environment using EBMC for evaluating RTL property checking, bounded model checking, and assertion synthesis on hardware designs.",
    engine: "ebmc",
    domain: "hardware-verification",
    repo: "athanor-ai/hw-cbmc",
    dockerPrefix: "athanor/hw-cbmc",
    taskFamilies: [
      "property-checking",
      "bounded-model-checking",
      "assertion-synthesis",
      "counter-example-analysis",
    ],
    vmDirName: "hw-cbmc-env",
  },
  {
    id: "env-protein",
    name: "Protein Synthesis & Computational Neuroscience",
    slug: "protein-synthesis",
    description:
      "Protein synthesis and computational neuroscience environment for evaluating molecular simulation, neural circuit modeling, and systems biology analysis.",
    engine: "python-sci",
    domain: "computational-biology",
    repo: "athanor-ai/protein-synthesis",
    dockerPrefix: "athanor/protein-synthesis",
    taskFamilies: [
      "protein",
      "neuroscience",
      "systems_biology",
      "population_genetics",
      "connectomics",
      "pharmacology",
    ],
    vmDirName: "computational-biology",
  },
];

/* ------------------------------------------------------------------ */
/*  Derived lookups                                                    */
/* ------------------------------------------------------------------ */

/** Map environment slug → VM directory name. Used by executor.ts. */
export const ENV_REPO_MAP: Record<string, string> = Object.fromEntries(
  ENVIRONMENT_REGISTRY.map((e) => [e.slug, e.vmDirName]),
);

/** List of all VM directory names. Used by sync/route.ts. */
export const ALL_VM_DIR_NAMES: string[] = ENVIRONMENT_REGISTRY.map(
  (e) => e.vmDirName,
);
