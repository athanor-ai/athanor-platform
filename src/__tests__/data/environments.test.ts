/**
 * Data-shape regression tests for the Athanor environment definitions.
 *
 * These tests lock down the exact set of 6 environments, their IDs, slugs,
 * engines, and domains so that accidental data corruption or reduction is
 * caught immediately.
 */

import {
  ATHANOR_ENVIRONMENTS,
  ENVIRONMENT_BY_ID,
  ENVIRONMENT_BY_SLUG,
} from "@/data/environments";

/* ------------------------------------------------------------------ */
/*  Expected constants                                                  */
/* ------------------------------------------------------------------ */

const EXPECTED_IDS = [
  "env-lean",
  "env-cedar",
  "env-consensus",
  "env-congestion",
  "env-c2rust",
  "env-hwcbmc",
] as const;

const EXPECTED_SLUGS = [
  "lean-theorem-proving",
  "cedar-policy-verification",
  "distributed-consensus",
  "congestion-control",
  "c-to-rust",
  "hw-cbmc",
] as const;

const EXPECTED_ENGINES = [
  "lean4",
  "cedar-cli",
  "network-sim",
  "ns3-sim",
  "cargo-build",
  "ebmc",
] as const;

const EXPECTED_DOMAINS = [
  "formal-verification",
  "authorization",
  "distributed-systems",
  "networking",
  "transpilation",
  "hardware-verification",
] as const;

/* ------------------------------------------------------------------ */
/*  Tests                                                               */
/* ------------------------------------------------------------------ */

describe("ATHANOR_ENVIRONMENTS", () => {
  it("contains exactly 6 environments", () => {
    expect(ATHANOR_ENVIRONMENTS).toHaveLength(6);
  });

  it("has the exact environment IDs in order", () => {
    const ids = ATHANOR_ENVIRONMENTS.map((e) => e.id);
    expect(ids).toEqual([...EXPECTED_IDS]);
  });

  it("has the exact slugs in order", () => {
    const slugs = ATHANOR_ENVIRONMENTS.map((e) => e.slug);
    expect(slugs).toEqual([...EXPECTED_SLUGS]);
  });

  it("has the exact engines in order", () => {
    const engines = ATHANOR_ENVIRONMENTS.map((e) => e.engine);
    expect(engines).toEqual([...EXPECTED_ENGINES]);
  });

  it("has the exact domains in order", () => {
    const domains = ATHANOR_ENVIRONMENTS.map((e) => e.domain);
    expect(domains).toEqual([...EXPECTED_DOMAINS]);
  });

  it("every environment has a non-empty name", () => {
    for (const env of ATHANOR_ENVIRONMENTS) {
      expect(env.name.length).toBeGreaterThan(0);
    }
  });

  it("every environment has a non-empty description", () => {
    for (const env of ATHANOR_ENVIRONMENTS) {
      expect(env.description.length).toBeGreaterThan(0);
    }
  });

  it("every environment has a non-empty repo", () => {
    for (const env of ATHANOR_ENVIRONMENTS) {
      expect(env.repo.length).toBeGreaterThan(0);
    }
  });

  it("every environment has a non-empty dockerPrefix", () => {
    for (const env of ATHANOR_ENVIRONMENTS) {
      expect(env.dockerPrefix.length).toBeGreaterThan(0);
    }
  });

  it("every environment has at least 1 task family", () => {
    for (const env of ATHANOR_ENVIRONMENTS) {
      expect(env.taskFamilies.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("all repos start with 'athanor-ai/'", () => {
    for (const env of ATHANOR_ENVIRONMENTS) {
      expect(env.repo).toMatch(/^athanor-ai\//);
    }
  });

  it("has no duplicate IDs", () => {
    const ids = ATHANOR_ENVIRONMENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has no duplicate slugs", () => {
    const slugs = ATHANOR_ENVIRONMENTS.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("ENVIRONMENT_BY_ID", () => {
  it("returns a valid environment for every expected ID", () => {
    for (const id of EXPECTED_IDS) {
      const env = ENVIRONMENT_BY_ID.get(id);
      expect(env).toBeDefined();
      expect(env!.id).toBe(id);
    }
  });
});

describe("ENVIRONMENT_BY_SLUG", () => {
  it("returns a valid environment for every expected slug", () => {
    for (const slug of EXPECTED_SLUGS) {
      const env = ENVIRONMENT_BY_SLUG.get(slug);
      expect(env).toBeDefined();
      expect(env!.slug).toBe(slug);
    }
  });
});
