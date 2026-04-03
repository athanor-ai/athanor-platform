import { describe, it, expect } from "vitest";
import {
  ATHANOR_MODELS,
  MODEL_BY_SLUG,
  RUNS_PER_MODEL,
} from "@/data/models";

/**
 * Regression tests for the real model lineup used across all Athanor
 * environments.  Protects against accidental changes to the 5-model baseline.
 */

const EXPECTED_MODEL_SLUGS = [
  "claude-sonnet-4-6",
  "mistral-large-3",
  "kimi-k2.5",
  "gemini-3.1-pro-preview",
  "gemini-2.5-flash",
] as const;

const EXPECTED_PROVIDERS = ["anthropic", "mistral", "moonshot", "google"];

describe("ATHANOR_MODELS", () => {
  it("contains exactly 5 models", () => {
    expect(ATHANOR_MODELS).toHaveLength(5);
  });

  it("contains all expected model slugs", () => {
    const slugs = ATHANOR_MODELS.map((m) => m.slug);
    for (const expected of EXPECTED_MODEL_SLUGS) {
      expect(slugs).toContain(expected);
    }
  });

  it("has unique slugs", () => {
    const slugs = ATHANOR_MODELS.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every model has required fields", () => {
    for (const model of ATHANOR_MODELS) {
      expect(model.slug).toBeTruthy();
      expect(model.displayName).toBeTruthy();
      expect(model.provider).toBeTruthy();
    }
  });

  it("covers all expected providers", () => {
    const providers = [...new Set(ATHANOR_MODELS.map((m) => m.provider))];
    for (const p of EXPECTED_PROVIDERS) {
      expect(providers).toContain(p);
    }
  });

  it("has exactly 2 Google models", () => {
    const googleModels = ATHANOR_MODELS.filter(
      (m) => m.provider === "google",
    );
    expect(googleModels).toHaveLength(2);
  });
});

describe("MODEL_BY_SLUG", () => {
  it("has entries for all 5 models", () => {
    expect(MODEL_BY_SLUG.size).toBe(5);
  });

  it("lookup returns correct model for each slug", () => {
    for (const model of ATHANOR_MODELS) {
      expect(MODEL_BY_SLUG.get(model.slug)).toBe(model);
    }
  });
});

describe("RUNS_PER_MODEL", () => {
  it("is 3", () => {
    expect(RUNS_PER_MODEL).toBe(3);
  });
});
