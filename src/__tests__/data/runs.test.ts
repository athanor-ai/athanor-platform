/**
 * Data-shape regression tests for real runs, run results, and baseline runs.
 *
 * These tests lock down the exact counts (30 runs, 770 results, 30 baselines),
 * verify status fields, score ranges, and referential integrity between
 * runs and run results.
 */

import { realRuns, realRunResults, realBaselineRuns } from "@/data/runs";

/* ------------------------------------------------------------------ */
/*  Expected constants                                                  */
/* ------------------------------------------------------------------ */

const VALID_ENV_IDS = new Set([
  "env-lean",
  "env-cedar",
  "env-consensus",
  "env-congestion",
  "env-c2rust",
  "env-hwcbmc",
]);

const VALID_MODEL_SLUGS = new Set([
  "claude-sonnet-4-6",
  "mistral-large-3",
  "kimi-k2.5",
  "gemini-3.1-pro-preview",
  "gemini-2.5-flash",
]);

const TASKS_PER_ENV: Record<string, number> = {
  "env-lean": 30,
  "env-cedar": 20,
  "env-consensus": 26,
  "env-congestion": 24,
  "env-c2rust": 28,
  "env-hwcbmc": 26,
};

/* ------------------------------------------------------------------ */
/*  realRuns tests                                                      */
/* ------------------------------------------------------------------ */

describe("realRuns", () => {
  it("contains exactly 30 runs (6 envs x 5 models)", () => {
    expect(realRuns).toHaveLength(30);
  });

  it("all runs have status 'completed'", () => {
    for (const run of realRuns) {
      expect(run.status).toBe("completed");
    }
  });

  it("all 6 environment IDs are represented", () => {
    const envIds = new Set(realRuns.map((r) => r.environment_id));
    for (const id of VALID_ENV_IDS) {
      expect(envIds.has(id)).toBe(true);
    }
  });

  it("all 5 model slugs are represented", () => {
    const models = new Set(realRuns.map((r) => r.model_name));
    for (const slug of VALID_MODEL_SLUGS) {
      expect(models.has(slug)).toBe(true);
    }
  });

  it("each run has total_tasks equal to its environment task count", () => {
    for (const run of realRuns) {
      const expected = TASKS_PER_ENV[run.environment_id];
      expect(run.total_tasks).toBe(expected);
    }
  });

  it("each run has completed_tasks equal to total_tasks", () => {
    for (const run of realRuns) {
      expect(run.completed_tasks).toBe(run.total_tasks);
    }
  });

  it("each run has a mean_score between 0 and 1", () => {
    for (const run of realRuns) {
      expect(run.mean_score).toBeGreaterThanOrEqual(0);
      expect(run.mean_score).toBeLessThanOrEqual(1);
    }
  });
});

/* ------------------------------------------------------------------ */
/*  realRunResults tests                                                */
/* ------------------------------------------------------------------ */

describe("realRunResults", () => {
  it("contains exactly 770 run results", () => {
    expect(realRunResults).toHaveLength(770);
  });

  it("every result has raw_score between 0 and 1", () => {
    for (const result of realRunResults) {
      expect(result.raw_score).toBeGreaterThanOrEqual(0);
      expect(result.raw_score).toBeLessThanOrEqual(1);
    }
  });

  it("every result run_id maps to a valid run", () => {
    const runIds = new Set(realRuns.map((r) => r.id));
    for (const result of realRunResults) {
      expect(runIds.has(result.run_id)).toBe(true);
    }
  });
});

/* ------------------------------------------------------------------ */
/*  realBaselineRuns tests                                              */
/* ------------------------------------------------------------------ */

describe("realBaselineRuns", () => {
  it("contains exactly 30 baseline runs", () => {
    expect(realBaselineRuns).toHaveLength(30);
  });

  it("all baseline runs have status 'completed'", () => {
    for (const baseline of realBaselineRuns) {
      expect(baseline.status).toBe("completed");
    }
  });
});
