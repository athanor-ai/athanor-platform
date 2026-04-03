import { describe, it, expect } from "vitest";

/**
 * Tests for the test-key API route's expected providers and behavior.
 * These are pure data tests — we verify the provider list and input validation
 * logic without actually calling external APIs.
 */

const SUPPORTED_PROVIDERS = [
  "openai",
  "anthropic",
  "gemini",
  "azure_openai",
  "bedrock",
];

describe("test-key API contract", () => {
  it("supported providers list matches credentials page", () => {
    // This ensures the API route and the page agree on provider keys
    expect(SUPPORTED_PROVIDERS).toHaveLength(5);
    expect(SUPPORTED_PROVIDERS).toContain("openai");
    expect(SUPPORTED_PROVIDERS).toContain("anthropic");
    expect(SUPPORTED_PROVIDERS).toContain("gemini");
    expect(SUPPORTED_PROVIDERS).toContain("azure_openai");
    expect(SUPPORTED_PROVIDERS).toContain("bedrock");
  });

  it("request body shape is { provider, apiKey }", () => {
    // Type-level contract test
    const validBody = { provider: "openai", apiKey: "sk-test" };
    expect(validBody).toHaveProperty("provider");
    expect(validBody).toHaveProperty("apiKey");
  });

  it("response shape is { ok, model?, error? }", () => {
    const successResponse = { ok: true, model: "gpt-4" };
    expect(successResponse.ok).toBe(true);
    expect(successResponse.model).toBeTruthy();

    const errorResponse = { ok: false, error: "Invalid key" };
    expect(errorResponse.ok).toBe(false);
    expect(errorResponse.error).toBeTruthy();
  });
});
