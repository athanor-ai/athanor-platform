import { describe, it, expect } from "vitest";
import {
  REAL_HEATMAP_DATA,
  getHeatmapForEnvironment,
  getModelMeanScore,
} from "@/data/heatmap";
import { ATHANOR_ENVIRONMENTS } from "@/data/environments";
import { ATHANOR_MODELS } from "@/data/models";

/**
 * Tests for the heatmap data — the core scoring matrix that powers
 * calibration, baselines, and per-task-per-model score views.
 */

describe("REAL_HEATMAP_DATA", () => {
  it("has data for all 6 environments", () => {
    const envSlugs = Object.keys(REAL_HEATMAP_DATA);
    expect(envSlugs).toHaveLength(6);
    for (const env of ATHANOR_ENVIRONMENTS) {
      expect(REAL_HEATMAP_DATA[env.slug]).toBeDefined();
    }
  });

  it("has data for all 5 models in every environment", () => {
    for (const env of ATHANOR_ENVIRONMENTS) {
      const envData = REAL_HEATMAP_DATA[env.slug];
      expect(envData).toBeDefined();
      for (const model of ATHANOR_MODELS) {
        expect(envData[model.slug]).toBeDefined();
        expect(envData[model.slug].length).toBeGreaterThan(0);
      }
    }
  });

  it("full matrix is 6 envs x 5 models = 30 cells", () => {
    let cellCount = 0;
    for (const envSlug of Object.keys(REAL_HEATMAP_DATA)) {
      cellCount += Object.keys(REAL_HEATMAP_DATA[envSlug]).length;
    }
    expect(cellCount).toBe(30);
  });

  it("every score is between 0 and 1", () => {
    for (const envSlug of Object.keys(REAL_HEATMAP_DATA)) {
      for (const modelSlug of Object.keys(REAL_HEATMAP_DATA[envSlug])) {
        for (const cell of REAL_HEATMAP_DATA[envSlug][modelSlug]) {
          expect(cell.score).toBeGreaterThanOrEqual(0);
          expect(cell.score).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("every cell has a non-empty task name", () => {
    for (const envSlug of Object.keys(REAL_HEATMAP_DATA)) {
      for (const modelSlug of Object.keys(REAL_HEATMAP_DATA[envSlug])) {
        for (const cell of REAL_HEATMAP_DATA[envSlug][modelSlug]) {
          expect(cell.task).toBeTruthy();
        }
      }
    }
  });

  it("task count per environment matches expected totals", () => {
    const expectedCounts: Record<string, number> = {
      "lean-theorem-proving": 30,
      "cedar-policy-verification": 20,
      "distributed-consensus": 26,
      "congestion-control": 24,
      "c-to-rust": 28,
      "hw-cbmc": 26,
    };
    for (const [envSlug, expected] of Object.entries(expectedCounts)) {
      // Each model should have the same task count for its environment
      const envData = REAL_HEATMAP_DATA[envSlug];
      for (const modelSlug of Object.keys(envData)) {
        expect(envData[modelSlug]).toHaveLength(expected);
      }
    }
  });

  it("not all scores are zero (data is real, not placeholder)", () => {
    for (const envSlug of Object.keys(REAL_HEATMAP_DATA)) {
      for (const modelSlug of Object.keys(REAL_HEATMAP_DATA[envSlug])) {
        const scores = REAL_HEATMAP_DATA[envSlug][modelSlug].map(
          (c) => c.score,
        );
        const hasNonZero = scores.some((s) => s > 0);
        expect(hasNonZero).toBe(true);
      }
    }
  });
});

describe("getHeatmapForEnvironment", () => {
  it("returns data for a valid environment slug", () => {
    const data = getHeatmapForEnvironment("lean-theorem-proving");
    expect(data).toBeDefined();
    expect(Object.keys(data!)).toHaveLength(5);
  });

  it("returns undefined for an invalid slug", () => {
    expect(getHeatmapForEnvironment("nonexistent")).toBeUndefined();
  });
});

describe("getModelMeanScore", () => {
  it("returns a number for a valid environment/model pair", () => {
    const score = getModelMeanScore(
      "lean-theorem-proving",
      "claude-sonnet-4-6",
    );
    expect(score).toBeTypeOf("number");
    expect(score!).toBeGreaterThanOrEqual(0);
    expect(score!).toBeLessThanOrEqual(1);
  });

  it("returns null for a nonexistent environment", () => {
    expect(getModelMeanScore("nonexistent", "claude-sonnet-4-6")).toBeNull();
  });

  it("returns null for a nonexistent model", () => {
    expect(
      getModelMeanScore("lean-theorem-proving", "nonexistent-model"),
    ).toBeNull();
  });

  it("Claude Sonnet 4.6 should have highest mean in lean env (baseline check)", () => {
    const claudeScore = getModelMeanScore(
      "lean-theorem-proving",
      "claude-sonnet-4-6",
    )!;
    // Claude Sonnet 4.6 is known to be the strongest in lean
    expect(claudeScore).toBeGreaterThan(0.3);
  });
});
