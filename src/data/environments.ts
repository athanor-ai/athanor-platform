/**
 * Athanor environment definitions — derived from the single-source-of-truth
 * registry in environment-registry.ts.
 *
 * Every Tahoe page (overview, environments, tasks, runs, baselines, training)
 * derives its data from these definitions so that swapping to live API data
 * later only requires changing the fetch layer, not the page model.
 */

import {
  ENVIRONMENT_REGISTRY,
  type EnvironmentConfig,
} from "@/data/environment-registry";

/* ------------------------------------------------------------------ */
/*  Environment type (re-exported for backwards compatibility)          */
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

/* ------------------------------------------------------------------ */
/*  Derived from registry                                              */
/* ------------------------------------------------------------------ */

function toEnvironmentDef(cfg: EnvironmentConfig): AthanorEnvironmentDef {
  return {
    id: cfg.id,
    name: cfg.name,
    slug: cfg.slug,
    description: cfg.description,
    engine: cfg.engine,
    domain: cfg.domain,
    repo: cfg.repo,
    dockerPrefix: cfg.dockerPrefix,
    taskFamilies: cfg.taskFamilies,
  };
}

/**
 * The canonical Athanor environments, derived from ENVIRONMENT_REGISTRY.
 *
 * Order matches the registry (drives the default sort in the Environments grid).
 */
export const ATHANOR_ENVIRONMENTS: AthanorEnvironmentDef[] =
  ENVIRONMENT_REGISTRY.map(toEnvironmentDef);

/** Quick lookup by environment id. */
export const ENVIRONMENT_BY_ID = new Map(
  ATHANOR_ENVIRONMENTS.map((e) => [e.id, e]),
);

/** Quick lookup by slug. */
export const ENVIRONMENT_BY_SLUG = new Map(
  ATHANOR_ENVIRONMENTS.map((e) => [e.slug, e]),
);
