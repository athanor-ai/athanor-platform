/**
 * Athanor environment definitions — single source of truth for Tahoe.
 *
 * These map 1-to-1 with the six real environments in the athanor-ai GitHub org.
 * Every Tahoe page (overview, environments, tasks, runs, baselines, training)
 * derives its data from these definitions so that swapping to live API data
 * later only requires changing the fetch layer, not the page model.
 */

/* ------------------------------------------------------------------ */
/*  Environment registry                                               */
/* ------------------------------------------------------------------ */

export interface AthanorEnvironmentDef {
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
}

/**
 * The canonical six Athanor environments.
 *
 * Order matters — it drives the default sort in the Environments grid.
 */
export const ATHANOR_ENVIRONMENTS: AthanorEnvironmentDef[] = [
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
  },
];

/** Quick lookup by environment id. */
export const ENVIRONMENT_BY_ID = new Map(
  ATHANOR_ENVIRONMENTS.map((e) => [e.id, e]),
);

/** Quick lookup by slug. */
export const ENVIRONMENT_BY_SLUG = new Map(
  ATHANOR_ENVIRONMENTS.map((e) => [e.slug, e]),
);
