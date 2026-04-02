/**
 * Real model lineup — sourced from dryrun/baseline run files across all 6
 * Athanor environment repos.
 *
 * Every repo uses exactly these 5 models with 3 runs each.
 * Model slugs match the file-name convention: `<slug>_run<n>.json`.
 */

export interface AthanorModel {
  /** File-name slug used in runs/ directory (e.g. "claude-sonnet-4-6"). */
  slug: string;
  /** Human-readable display name. */
  displayName: string;
  /** Provider for credential mapping. */
  provider: "anthropic" | "google" | "moonshot" | "mistral";
}

/**
 * The real 5-model baseline lineup, ordered by provider.
 * Source: `runs/` directory listings in all athanor-ai/* repos.
 */
export const ATHANOR_MODELS: AthanorModel[] = [
  {
    slug: "claude-sonnet-4-6",
    displayName: "Claude Sonnet 4.6",
    provider: "anthropic",
  },
  {
    slug: "mistral-large-3",
    displayName: "Mistral Large 3",
    provider: "mistral",
  },
  {
    slug: "kimi-k2.5",
    displayName: "Kimi K2.5",
    provider: "moonshot",
  },
  {
    slug: "gemini-3.1-pro-preview",
    displayName: "Gemini 3.1 Pro",
    provider: "google",
  },
  {
    slug: "gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    provider: "google",
  },
];

/** Quick lookup by slug. */
export const MODEL_BY_SLUG = new Map(
  ATHANOR_MODELS.map((m) => [m.slug, m]),
);

/** Number of runs per model in each environment (repo convention). */
export const RUNS_PER_MODEL = 3;
