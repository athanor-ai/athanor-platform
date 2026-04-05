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
  /** Additional base URLs for providers with multiple endpoints */
  additionalBaseUrls?: Array<{
    envVar: string;
    value: string | undefined;
  }>;
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

  // Anthropic (Claude Sonnet 4.6, Claude Opus 4.6)
  // Supports direct Anthropic API and Azure-hosted endpoints
  if (process.env.ANTHROPIC_API_KEY) {
    creds.push({
      provider: "anthropic",
      envVar: "ANTHROPIC_API_KEY",
      value: process.env.ANTHROPIC_API_KEY,
      baseUrl: process.env.ANTHROPIC_API_BASE,
      baseUrlEnvVar: "ANTHROPIC_API_BASE",
      additionalBaseUrls: [
        {
          envVar: "AZURE_PROJECT_API_BASE",
          value: process.env.AZURE_PROJECT_API_BASE,
        },
        {
          envVar: "AZURE_OPENAI_API_BASE",
          value: process.env.AZURE_OPENAI_API_BASE,
        },
      ],
      models: ["claude-sonnet-4-6", "claude-opus-4-6"],
    });
  }

  // Google AI (Gemini Flash, Gemini Pro)
  // Supports both GOOGLE_API_KEY and GEMINI_API_KEY env var names
  const googleKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (googleKey) {
    creds.push({
      provider: "google",
      envVar: "GOOGLE_API_KEY",
      value: googleKey,
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

  // Fallback: OpenAI-compatible endpoint (same Azure AI, different routing)
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

  // Azure-hosted Anthropic (Claude Sonnet 4.6)
  if (process.env.ANTHROPIC_API_KEY) {
    creds.push({
      provider: "anthropic",
      envVar: "ANTHROPIC_API_KEY",
      value: process.env.ANTHROPIC_API_KEY,
      baseUrl: process.env.ANTHROPIC_BASE_URL,
      baseUrlEnvVar: "ANTHROPIC_BASE_URL",
      models: ["claude-sonnet-4-6"],
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
    if (cred.additionalBaseUrls) {
      for (const additional of cred.additionalBaseUrls) {
        if (additional.value) {
          env[additional.envVar] = additional.value;
        }
      }
    }
  }

  // Customer keys override platform keys
  // Map provider -> env var using the same mapping as providers.ts
  const providerEnvMap: Record<string, { key: string; base?: string }> = {
    anthropic: { key: "ANTHROPIC_API_KEY", base: "ANTHROPIC_BASE_URL" },
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

/**
 * Get platform credentials as CredentialSummary objects for merging with
 * database credentials in the /api/credentials endpoint.
 *
 * Returns summaries that match the CredentialSummary shape so the launch
 * page can treat platform keys identically to user-provided keys.
 *
 * SECURITY: Never includes actual key values — only masked suffix.
 */
export function getPlatformCredentialSummariesForAPI(): Array<{
  id: string;
  organization_id: string;
  provider: string;
  label: string;
  key_suffix: string;
  base_url: string | null;
  is_active: boolean;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}> {
  if (!isPlatformKeysEnabled()) return [];

  const now = new Date().toISOString();

  return getPlatformCredentials()
    .filter((c) => c.provider !== "huggingface")
    .map((c) => {
      const suffix = c.value.length > 4
        ? `...${c.value.slice(-4)}`
        : "***";

      return {
        id: `platform-${c.provider}`,
        organization_id: "platform",
        provider: c.provider,
        label: `Platform ${c.envVar}`,
        key_suffix: suffix,
        base_url: c.baseUrl ?? null,
        is_active: true,
        last_verified_at: now,
        created_at: now,
        updated_at: now,
      };
    });
}
