import { describe, it, expect } from "vitest";
import { realRuns, realRunResults, realBaselineRuns } from "@/data/runs";
import { ATHANOR_ENVIRONMENTS } from "@/data/environments";
import { ATHANOR_MODELS } from "@/data/models";

/**
 * Data-shape tests for the auto-generated run, run-result, and baseline data.
 */

describe("realRuns", () => {
  it("has exactly 30 runs (6 envs x 5 models)", () => {
    expect(realRuns).toHaveLength(30);
  });

  it("every run is completed", () => {
    for (const run of realRuns) {
      expect(run.status).toBe("completed");
    }
  });

  it("covers all 6 environments", () => {
    const envIds = new Set(realRuns.map((r) => r.environment_id));
    expect(envIds.size).toBe(6);
    for (const env of ATHANOR_ENVIRONMENTS) {
      expect(envIds.has(env.id)).toBe(true);
    }
  });

  it("covers all 5 models", () => {
    const models = new Set(realRuns.map((r) => r.model_name));
    expect(models.size).toBe(5);
    for (const model of ATHANOR_MODELS) {
      expect(models.has(model.slug)).toBe(true);
    }
  });

  it("each run has valid mean_score", () => {
    for (const run of realRuns) {
      expect(run.mean_score).toBeTypeOf("number");
      expect(run.mean_score!).toBeGreaterThanOrEqual(0);
      expect(run.mean_score!).toBeLessThanOrEqual(1);
    }
  });

  it("total_tasks equals completed_tasks for all completed runs", () => {
    for (const run of realRuns) {
      expect(run.completed_tasks).toBe(run.total_tasks);
    }
  });

  it("has unique run IDs", () => {
    const ids = realRuns.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("realRunResults", () => {
  it("has 770 results (sum of tasks across all env x model pairs)", () => {
    // 30 + 20 + 26 + 24 + 28 + 26 = 154 tasks, x5 models = 770
    expect(realRunResults).toHaveLength(770);
  });

  it("every result references a valid run", () => {
    const runIds = new Set(realRuns.map((r) => r.id));
    for (const result of realRunResults) {
      expect(runIds.has(result.run_id)).toBe(true);
    }
  });

  it("scores are between 0 and 1", () => {
    for (const result of realRunResults) {
      expect(result.raw_score).toBeGreaterThanOrEqual(0);
      expect(result.raw_score).toBeLessThanOrEqual(1);
    }
  });

  it("has unique result IDs", () => {
    const ids = realRunResults.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("realBaselineRuns", () => {
  it("has exactly 30 baseline runs", () => {
    expect(realBaselineRuns).toHaveLength(30);
  });

  it("covers all environments and models", () => {
    const envIds = new Set(realBaselineRuns.map((b) => b.environment_id));
    const models = new Set(realBaselineRuns.map((b) => b.model_name));
    expect(envIds.size).toBe(6);
    expect(models.size).toBe(5);
  });

  it("every baseline has a valid mean_score", () => {
    for (const baseline of realBaselineRuns) {
      expect(baseline.mean_score).toBeTypeOf("number");
      expect(baseline.mean_score!).toBeGreaterThanOrEqual(0);
      expect(baseline.mean_score!).toBeLessThanOrEqual(1);
    }
  });
});
