import { describe, it, expect } from "vitest";
import {
  ATHANOR_ENVIRONMENTS,
  ENVIRONMENT_BY_ID,
  ENVIRONMENT_BY_SLUG,
} from "@/data/environments";

/**
 * Regression tests for the Athanor environment registry.
 *
 * These protect against accidental removal/renaming of the six real
 * environments that power every Tahoe page.
 */

const EXPECTED_SLUGS = [
  "lean-theorem-proving",
  "cedar-policy-verification",
  "distributed-consensus",
  "congestion-control",
  "c-to-rust",
  "hw-cbmc",
] as const;

const EXPECTED_IDS = [
  "env-lean",
  "env-cedar",
  "env-consensus",
  "env-congestion",
  "env-c2rust",
  "env-hwcbmc",
] as const;

describe("ATHANOR_ENVIRONMENTS", () => {
  it("contains exactly 6 environments", () => {
    expect(ATHANOR_ENVIRONMENTS).toHaveLength(6);
  });

  it("contains all expected environment slugs", () => {
    const slugs = ATHANOR_ENVIRONMENTS.map((e) => e.slug);
    for (const expected of EXPECTED_SLUGS) {
      expect(slugs).toContain(expected);
    }
  });

  it("contains all expected environment IDs", () => {
    const ids = ATHANOR_ENVIRONMENTS.map((e) => e.id);
    for (const expected of EXPECTED_IDS) {
      expect(ids).toContain(expected);
    }
  });

  it("has unique IDs", () => {
    const ids = ATHANOR_ENVIRONMENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique slugs", () => {
    const slugs = ATHANOR_ENVIRONMENTS.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every environment has required fields", () => {
    for (const env of ATHANOR_ENVIRONMENTS) {
      expect(env.id).toBeTruthy();
      expect(env.name).toBeTruthy();
      expect(env.slug).toBeTruthy();
      expect(env.description).toBeTruthy();
      expect(env.engine).toBeTruthy();
      expect(env.domain).toBeTruthy();
      expect(env.repo).toMatch(/^athanor-ai\//);
      expect(env.dockerPrefix).toMatch(/^athanor\//);
      expect(env.taskFamilies.length).toBeGreaterThan(0);
    }
  });

  it("is not generic benchmark content — all Athanor-specific domains", () => {
    const domains = ATHANOR_ENVIRONMENTS.map((e) => e.domain);
    // These are Athanor-specific, non-generic domains
    const athanorDomains = [
      "formal-verification",
      "authorization",
      "distributed-systems",
      "networking",
      "transpilation",
      "hardware-verification",
    ];
    for (const d of athanorDomains) {
      expect(domains).toContain(d);
    }
    // Should not contain generic benchmark domains
    expect(domains).not.toContain("general");
    expect(domains).not.toContain("benchmark");
    expect(domains).not.toContain("coding");
  });
});

describe("ENVIRONMENT_BY_ID", () => {
  it("has entries for all 6 environments", () => {
    expect(ENVIRONMENT_BY_ID.size).toBe(6);
  });

  it("lookup returns correct environment for each ID", () => {
    for (const env of ATHANOR_ENVIRONMENTS) {
      expect(ENVIRONMENT_BY_ID.get(env.id)).toBe(env);
    }
  });
});

describe("ENVIRONMENT_BY_SLUG", () => {
  it("has entries for all 6 environments", () => {
    expect(ENVIRONMENT_BY_SLUG.size).toBe(6);
  });

  it("lookup returns correct environment for each slug", () => {
    for (const env of ATHANOR_ENVIRONMENTS) {
      expect(ENVIRONMENT_BY_SLUG.get(env.slug)).toBe(env);
    }
  });
});
