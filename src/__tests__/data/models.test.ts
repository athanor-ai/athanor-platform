/**
 * Data-shape regression tests for the Athanor model lineup.
 *
 * These tests lock down the exact 5-model baseline set with their slugs,
 * display names, providers, and the runs-per-model constant so that
 * accidental changes are caught immediately.
 */

import {
  ATHANOR_MODELS,
  MODEL_BY_SLUG,
  RUNS_PER_MODEL,
} from "@/data/models";

/* ------------------------------------------------------------------ */
/*  Expected constants                                                  */
/* ------------------------------------------------------------------ */

const EXPECTED_SLUGS = [
  "claude-sonnet-4-6",
  "mistral-large-3",
  "kimi-k2.5",
  "gemini-3.1-pro-preview",
  "gemini-2.5-flash",
] as const;

const EXPECTED_PROVIDERS = [
  "anthropic",
  "mistral",
  "moonshot",
  "google",
  "google",
] as const;

const EXPECTED_DISPLAY_NAMES = [
  "Claude Sonnet 4.6",
  "Mistral Large 3",
  "Kimi K2.5",
  "Gemini 3.1 Pro",
  "Gemini 2.5 Flash",
] as const;

/* ------------------------------------------------------------------ */
/*  Tests                                                               */
/* ------------------------------------------------------------------ */

describe("ATHANOR_MODELS", () => {
  it("contains exactly 5 models", () => {
    expect(ATHANOR_MODELS).toHaveLength(5);
  });

  it("has the exact model slugs in order", () => {
    const slugs = ATHANOR_MODELS.map((m) => m.slug);
    expect(slugs).toEqual([...EXPECTED_SLUGS]);
  });

  it("has the exact providers in order", () => {
    const providers = ATHANOR_MODELS.map((m) => m.provider);
    expect(providers).toEqual([...EXPECTED_PROVIDERS]);
  });

  it("has the exact display names in order", () => {
    const names = ATHANOR_MODELS.map((m) => m.displayName);
    expect(names).toEqual([...EXPECTED_DISPLAY_NAMES]);
  });

  it("has no duplicate slugs", () => {
    const slugs = ATHANOR_MODELS.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("RUNS_PER_MODEL", () => {
  it("is 3", () => {
    expect(RUNS_PER_MODEL).toBe(3);
  });
});

describe("MODEL_BY_SLUG", () => {
  it("returns a valid model for every expected slug", () => {
    for (const slug of EXPECTED_SLUGS) {
      const model = MODEL_BY_SLUG.get(slug);
      expect(model).toBeDefined();
      expect(model!.slug).toBe(slug);
    }
  });
});
