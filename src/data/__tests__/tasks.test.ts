import { describe, it, expect } from "vitest";
import { realTasks } from "@/data/tasks";
import { ATHANOR_ENVIRONMENTS } from "@/data/environments";

/**
 * Data-shape and coverage tests for the 154 real tasks sourced from the
 * Athanor environment repos.
 */

const EXPECTED_TASK_COUNTS: Record<string, number> = {
  "env-lean": 30,
  "env-cedar": 20,
  "env-consensus": 26,
  "env-congestion": 24,
  "env-c2rust": 28,
  "env-hwcbmc": 26,
};

const VALID_DIFFICULTIES = ["trivial", "easy", "medium", "hard", "expert"];

describe("realTasks", () => {
  it("contains exactly 154 tasks", () => {
    expect(realTasks).toHaveLength(154);
  });

  it("has unique task IDs", () => {
    const ids = realTasks.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique task slugs", () => {
    const slugs = realTasks.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every task belongs to a valid environment", () => {
    const envIds = new Set(ATHANOR_ENVIRONMENTS.map((e) => e.id));
    for (const task of realTasks) {
      expect(envIds.has(task.environment_id)).toBe(true);
    }
  });

  it("has expected task counts per environment", () => {
    for (const [envId, expectedCount] of Object.entries(
      EXPECTED_TASK_COUNTS,
    )) {
      const count = realTasks.filter(
        (t) => t.environment_id === envId,
      ).length;
      expect(count).toBe(expectedCount);
    }
  });

  it("covers all 6 environments", () => {
    const envIds = new Set(realTasks.map((t) => t.environment_id));
    expect(envIds.size).toBe(6);
    for (const env of ATHANOR_ENVIRONMENTS) {
      expect(envIds.has(env.id)).toBe(true);
    }
  });

  it("every task has valid difficulty", () => {
    for (const task of realTasks) {
      expect(VALID_DIFFICULTIES).toContain(task.difficulty);
    }
  });

  it("every task has required fields", () => {
    for (const task of realTasks) {
      expect(task.id).toBeTruthy();
      expect(task.name).toBeTruthy();
      expect(task.slug).toBeTruthy();
      expect(task.environment_id).toBeTruthy();
      expect(task.category).toBeTruthy();
      expect(task.max_steps).toBeGreaterThan(0);
    }
  });

  it("every task has a valid reward range", () => {
    for (const task of realTasks) {
      if (task.reward_range) {
        expect(task.reward_range.min).toBeLessThanOrEqual(
          task.reward_range.max,
        );
      }
    }
  });

  it("has a mix of difficulty levels overall", () => {
    const allDifficulties = new Set(realTasks.map((t) => t.difficulty));
    // The full task set should cover at least 3 difficulty levels
    expect(allDifficulties.size).toBeGreaterThanOrEqual(3);
  });

  it("some environments have multiple difficulty levels", () => {
    // Environments like lean, cedar, and consensus are known to have diverse difficulty
    const envsWithMultiple = ATHANOR_ENVIRONMENTS.filter((env) => {
      const difficulties = new Set(
        realTasks
          .filter((t) => t.environment_id === env.id)
          .map((t) => t.difficulty),
      );
      return difficulties.size >= 2;
    });
    expect(envsWithMultiple.length).toBeGreaterThanOrEqual(3);
  });
});
