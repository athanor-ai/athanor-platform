/**
 * Platform-owned API credentials for internal evaluation runs.
 *
 * These are Athanor's own keys used for baseline scoring and demo runs.
 * They are injected server-side only and NEVER sent to the browser.
 *
 * Toggle: Set ATHANOR_USE_PLATFORM_KEYS=true in .env.local to enable.
 * For customer builds, omit this variable (defaults to false).
 *
 * When enabled, these credentials are available as a fallback when a
 * customer hasn't configured their own keys for a given provider.
 * Customer-provided keys always take priority.
 */

// This file is SERVER-ONLY. It must never be imported in client components.
// Next.js enforces this: non-NEXT_PUBLIC_ env vars are undefined in the browser.

export interface PlatformCredential {
  provider: string;
  envVar: string;
  value: string;
  baseUrl?: string;
  baseUrlEnvVar?: string;
  /** Models accessible through this credential */
  models: string[];
}

/**
 * Check if platform keys are enabled.
 * Returns false in customer builds (env var not set).
 */
export function isPlatformKeysEnabled(): boolean {
  return process.env.ATHANOR_USE_PLATFORM_KEYS === "true";
}

/**
 * Get platform credentials for internal use.
 * Returns empty array if platform keys are disabled.
 *
 * SECURITY: Only call this from server-side code (API routes, Server Actions).
 * The values are read from environment variables, never hardcoded.
 */
export function getPlatformCredentials(): PlatformCredential[] {
  if (!isPlatformKeysEnabled()) return [];

  const creds: PlatformCredential[] = [];

  // Google AI (Gemini Flash, Gemini Pro)
  if (process.env.GOOGLE_API_KEY) {
    creds.push({
      provider: "google",
      envVar: "GOOGLE_API_KEY",
      value: process.env.GOOGLE_API_KEY,
      models: ["gemini-2.5-flash", "gemini-3.1-pro-preview"],
    });
  }

  // Azure AI endpoint (Kimi K2.5, Mistral Large 3)
  // These models are hosted on Azure and accessed via OpenAI-compatible API
  if (process.env.AZURE_AI_API_KEY) {
    creds.push({
      provider: "azure",
      envVar: "AZURE_API_KEY",
      value: process.env.AZURE_AI_API_KEY,
      baseUrl: process.env.AZURE_AI_API_BASE,
      baseUrlEnvVar: "AZURE_API_BASE",
      models: ["kimi-k2.5", "mistral-large-3"],
    });
  }

  // Fallback: OpenAI-compatible endpoint (same Azure AI, different env var name)
  // LiteLLM routes through OPENAI_API_KEY + OPENAI_API_BASE
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_BASE) {
    creds.push({
      provider: "openai",
      envVar: "OPENAI_API_KEY",
      value: process.env.OPENAI_API_KEY,
      baseUrl: process.env.OPENAI_API_BASE,
      baseUrlEnvVar: "OPENAI_API_BASE",
      models: ["kimi-k2.5", "mistral-large-3"],
    });
  }

  // HuggingFace (for future model hosting)
  if (process.env.HF_TOKEN) {
    creds.push({
      provider: "huggingface",
      envVar: "HF_TOKEN",
      value: process.env.HF_TOKEN,
      models: [],
    });
  }

  return creds;
}

/**
 * Build environment variables for a run execution.
 * Merges platform credentials with customer-provided credentials.
 * Customer keys take priority over platform keys.
 *
 * Returns a map of env var name -> value, ready to inject into
 * the execution container or subprocess.
 */
export function buildRunEnvVars(
  customerCredentials: Array<{
    provider: string;
    decryptedKey: string;
    baseUrl?: string | null;
  }>,
): Record<string, string> {
  const env: Record<string, string> = {};

  // Start with platform keys (if enabled)
  for (const cred of getPlatformCredentials()) {
    env[cred.envVar] = cred.value;
    if (cred.baseUrl && cred.baseUrlEnvVar) {
      env[cred.baseUrlEnvVar] = cred.baseUrl;
    }
  }

  // Customer keys override platform keys
  // Map provider -> env var using the same mapping as providers.ts
  const providerEnvMap: Record<string, { key: string; base?: string }> = {
    anthropic: { key: "ANTHROPIC_API_KEY" },
    google: { key: "GOOGLE_API_KEY" },
    mistral: { key: "MISTRAL_API_KEY" },
    moonshot: { key: "MOONSHOT_API_KEY" },
    openai: { key: "OPENAI_API_KEY", base: "OPENAI_API_BASE" },
    litellm: { key: "LITELLM_API_KEY", base: "LITELLM_API_BASE" },
    azure: { key: "AZURE_API_KEY", base: "AZURE_API_BASE" },
    bedrock: { key: "AWS_ACCESS_KEY_ID", base: "AWS_BEDROCK_ENDPOINT" },
  };

  for (const cred of customerCredentials) {
    const mapping = providerEnvMap[cred.provider];
    if (mapping) {
      env[mapping.key] = cred.decryptedKey;
      if (cred.baseUrl && mapping.base) {
        env[mapping.base] = cred.baseUrl;
      }
    }
  }

  return env;
}

/**
 * Get a safe summary of platform credentials (for UI display).
 * Never exposes the actual key values.
 */
export function getPlatformCredentialSummaries(): Array<{
  provider: string;
  models: string[];
  configured: boolean;
}> {
  if (!isPlatformKeysEnabled()) return [];

  return getPlatformCredentials().map((c) => ({
    provider: c.provider,
    models: c.models,
    configured: true,
  }));
}
