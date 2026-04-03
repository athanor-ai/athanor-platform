/**
 * Data-shape regression tests for the real Athanor task definitions.
 *
 * These tests lock down the exact count of 154 tasks across 6 environments,
 * verify uniqueness constraints, and ensure every task has valid fields.
 */

import { realTasks, tasksByEnvironment } from "@/data/tasks";

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

const EXPECTED_TASK_COUNTS: Record<string, number> = {
  "env-lean": 30,
  "env-cedar": 20,
  "env-consensus": 26,
  "env-congestion": 24,
  "env-c2rust": 28,
  "env-hwcbmc": 26,
};

const VALID_DIFFICULTIES = new Set([
  "trivial",
  "easy",
  "medium",
  "hard",
  "expert",
]);

/* ------------------------------------------------------------------ */
/*  Tests                                                               */
/* ------------------------------------------------------------------ */

describe("realTasks", () => {
  it("contains exactly 154 tasks", () => {
    expect(realTasks).toHaveLength(154);
  });

  it("has the correct per-environment task counts", () => {
    const counts: Record<string, number> = {};
    for (const task of realTasks) {
      counts[task.environment_id] = (counts[task.environment_id] ?? 0) + 1;
    }
    expect(counts).toEqual(EXPECTED_TASK_COUNTS);
  });

  it("has all unique task IDs", () => {
    const ids = realTasks.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has all unique task slugs", () => {
    const slugs = realTasks.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every task has a valid environment_id", () => {
    for (const task of realTasks) {
      expect(VALID_ENV_IDS.has(task.environment_id)).toBe(true);
    }
  });

  it("every task has a valid difficulty", () => {
    for (const task of realTasks) {
      expect(VALID_DIFFICULTIES.has(task.difficulty)).toBe(true);
    }
  });

  it("every task has max_steps > 0", () => {
    for (const task of realTasks) {
      expect(task.max_steps).toBeGreaterThan(0);
    }
  });

  it("every task has a non-empty name", () => {
    for (const task of realTasks) {
      expect(task.name.length).toBeGreaterThan(0);
    }
  });

  it("every task has a non-empty description", () => {
    for (const task of realTasks) {
      expect(task.description.length).toBeGreaterThan(0);
    }
  });
});

describe("tasksByEnvironment", () => {
  it("has 6 entries (one per environment)", () => {
    expect(tasksByEnvironment.size).toBe(6);
  });

  it("each entry matches the expected task count", () => {
    for (const [envId, tasks] of tasksByEnvironment) {
      expect(tasks).toHaveLength(EXPECTED_TASK_COUNTS[envId]);
    }
  });
});
