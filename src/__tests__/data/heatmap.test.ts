/**
 * Data-shape regression tests for the heatmap data module.
 *
 * These tests verify the real heatmap data has entries for all 6 environments
 * and 5 models, that score values are valid, and that helper functions
 * behave correctly.
 */

import {
  REAL_HEATMAP_DATA,
  getHeatmapForEnvironment,
  getModelMeanScore,
} from "@/data/heatmap";

/* ------------------------------------------------------------------ */
/*  Expected constants                                                  */
/* ------------------------------------------------------------------ */

const ENV_SLUGS = [
  "lean-theorem-proving",
  "cedar-policy-verification",
  "distributed-consensus",
  "congestion-control",
  "c-to-rust",
  "hw-cbmc",
] as const;

const MODEL_SLUGS = [
  "claude-sonnet-4-6",
  "mistral-large-3",
  "kimi-k2.5",
  "gemini-3.1-pro-preview",
  "gemini-2.5-flash",
] as const;

const EXPECTED_TASKS_PER_ENV: Record<string, number> = {
  "lean-theorem-proving": 30,
  "cedar-policy-verification": 20,
  "distributed-consensus": 26,
  "congestion-control": 24,
  "c-to-rust": 28,
  "hw-cbmc": 26,
};

/* ------------------------------------------------------------------ */
/*  Tests                                                               */
/* ------------------------------------------------------------------ */

describe("REAL_HEATMAP_DATA", () => {
  it("has entries for all 6 environment slugs", () => {
    for (const slug of ENV_SLUGS) {
      expect(REAL_HEATMAP_DATA[slug]).toBeDefined();
    }
  });

  it("each environment has data for all 5 model slugs", () => {
    for (const envSlug of ENV_SLUGS) {
      const envData = REAL_HEATMAP_DATA[envSlug];
      for (const modelSlug of MODEL_SLUGS) {
        expect(envData[modelSlug]).toBeDefined();
        expect(Array.isArray(envData[modelSlug])).toBe(true);
      }
    }
  });

  it("has a total of 770 heatmap cells", () => {
    let total = 0;
    for (const envSlug of ENV_SLUGS) {
      const envData = REAL_HEATMAP_DATA[envSlug];
      for (const modelSlug of MODEL_SLUGS) {
        total += envData[modelSlug].length;
      }
    }
    expect(total).toBe(770);
  });

  it("all scores are between 0 and 1 inclusive", () => {
    for (const envSlug of ENV_SLUGS) {
      const envData = REAL_HEATMAP_DATA[envSlug];
      for (const modelSlug of MODEL_SLUGS) {
        for (const cell of envData[modelSlug]) {
          expect(cell.score).toBeGreaterThanOrEqual(0);
          expect(cell.score).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("no cell has an empty task string", () => {
    for (const envSlug of ENV_SLUGS) {
      const envData = REAL_HEATMAP_DATA[envSlug];
      for (const modelSlug of MODEL_SLUGS) {
        for (const cell of envData[modelSlug]) {
          expect(cell.task.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("task counts per environment match expected values", () => {
    for (const envSlug of ENV_SLUGS) {
      const envData = REAL_HEATMAP_DATA[envSlug];
      // Each model within an environment should have the same number of cells
      // equal to the task count for that environment.
      for (const modelSlug of MODEL_SLUGS) {
        expect(envData[modelSlug]).toHaveLength(EXPECTED_TASKS_PER_ENV[envSlug]);
      }
    }
  });
});

describe("getHeatmapForEnvironment", () => {
  it("returns data for valid environment slugs", () => {
    for (const slug of ENV_SLUGS) {
      const result = getHeatmapForEnvironment(slug);
      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
    }
  });

  it("returns undefined for an invalid slug", () => {
    const result = getHeatmapForEnvironment("nonexistent-env");
    expect(result).toBeUndefined();
  });
});

describe("getModelMeanScore", () => {
  it("returns a number between 0 and 1 for valid (env, model) pairs", () => {
    for (const envSlug of ENV_SLUGS) {
      for (const modelSlug of MODEL_SLUGS) {
        const score = getModelMeanScore(envSlug, modelSlug);
        expect(typeof score).toBe("number");
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      }
    }
  });

  it("returns null for an invalid environment slug", () => {
    const result = getModelMeanScore("nonexistent", "claude-sonnet-4-6");
    expect(result).toBeNull();
  });

  it("returns null for an invalid model slug", () => {
    const result = getModelMeanScore("lean-theorem-proving", "nonexistent-model");
    expect(result).toBeNull();
  });
});
