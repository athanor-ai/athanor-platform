/**
 * Real model lineup — sourced from dryrun/baseline run files across all 6
 * Athanor environment repos, plus additional models accessible via
 * OpenAI-compatible, LiteLLM, Azure, and Bedrock credential configurations.
 *
 * The original 5 baseline models use exactly 3 runs each per repo.
 * Model slugs match the file-name convention: `<slug>_run<n>.json`.
 */

import type { CredentialProvider } from "@/types/database";

export interface AthanorModel {
  /** File-name slug used in runs/ directory (e.g. "claude-sonnet-4-6"). */
  slug: string;
  /** Human-readable display name. */
  displayName: string;
  /** Primary provider for credential mapping. */
  provider: CredentialProvider;
  /**
   * Alternative credential providers that can serve this model.
   * e.g. Mistral/Moonshot models can also be accessed via OpenAI-compatible
   * or LiteLLM proxy endpoints.
   */
  compatibleProviders?: CredentialProvider[];
  /** Whether this model was in the original 5-model baseline lineup. */
  isBaseline: boolean;
}

/**
 * The real 5-model baseline lineup, ordered by provider.
 * Source: `runs/` directory listings in all athanor-ai/* repos.
 */
export const BASELINE_MODELS: AthanorModel[] = [
  {
    slug: "claude-sonnet-4-6",
    displayName: "Claude Sonnet 4.6",
    provider: "anthropic",
    compatibleProviders: ["litellm", "bedrock"],
    isBaseline: true,
  },
  {
    slug: "mistral-large-3",
    displayName: "Mistral Large 3",
    provider: "mistral",
    compatibleProviders: ["openai", "litellm", "azure"],
    isBaseline: true,
  },
  {
    slug: "kimi-k2.5",
    displayName: "Kimi K2.5",
    provider: "moonshot",
    compatibleProviders: ["openai", "litellm"],
    isBaseline: true,
  },
  {
    slug: "gemini-3.1-pro-preview",
    displayName: "Gemini 3.1 Pro",
    provider: "google",
    compatibleProviders: ["litellm"],
    isBaseline: true,
  },
  {
    slug: "gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    provider: "google",
    compatibleProviders: ["litellm"],
    isBaseline: true,
  },
];

/**
 * Extended model roster — additional models available via proxy/compatible
 * credential configurations. These are not part of the original baseline but
 * are selectable for new evaluation runs.
 */
export const EXTENDED_MODELS: AthanorModel[] = [
  {
    slug: "gpt-4.1",
    displayName: "GPT-4.1",
    provider: "openai",
    compatibleProviders: ["litellm", "azure"],
    isBaseline: false,
  },
  {
    slug: "gpt-4.1-mini",
    displayName: "GPT-4.1 Mini",
    provider: "openai",
    compatibleProviders: ["litellm", "azure"],
    isBaseline: false,
  },
  {
    slug: "o3",
    displayName: "o3",
    provider: "openai",
    compatibleProviders: ["litellm", "azure"],
    isBaseline: false,
  },
  {
    slug: "claude-sonnet-4",
    displayName: "Claude Sonnet 4",
    provider: "anthropic",
    compatibleProviders: ["litellm", "bedrock"],
    isBaseline: false,
  },
  {
    slug: "claude-opus-4",
    displayName: "Claude Opus 4",
    provider: "anthropic",
    compatibleProviders: ["litellm", "bedrock"],
    isBaseline: false,
  },
];

/** All models: baseline + extended. */
export const ATHANOR_MODELS: AthanorModel[] = [
  ...BASELINE_MODELS,
  ...EXTENDED_MODELS,
];

/** Quick lookup by slug. */
export const MODEL_BY_SLUG = new Map(
  ATHANOR_MODELS.map((m) => [m.slug, m]),
);

/** Number of runs per model in each environment (repo convention). */
export const RUNS_PER_MODEL = 3;

/**
 * Check whether a model can be used with a given set of active credential
 * providers. A model is usable if its primary provider OR any of its
 * compatible providers have active credentials.
 */
export function isModelUsable(
  model: AthanorModel,
  activeProviders: Set<CredentialProvider>,
): boolean {
  if (activeProviders.has(model.provider)) return true;
  return (model.compatibleProviders ?? []).some((p) => activeProviders.has(p));
}
