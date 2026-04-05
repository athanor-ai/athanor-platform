/**
 * Provider configuration definitions for the credential management system.
 *
 * Each provider specifies which fields are required (API key only, or key + base URL),
 * along with UX metadata like placeholders, descriptions, and help text.
 *
 * Providers are grouped into two categories:
 * - "direct": native API providers (Anthropic, Google, Mistral, Moonshot) — key only
 * - "proxy":  OpenAI-compatible, LiteLLM, Azure, Bedrock — key + base URL required
 */

import type { CredentialProvider } from "@/types/database";

export interface ProviderConfig {
  /** Provider key matching CredentialProvider type. */
  key: CredentialProvider;
  /** Human-readable provider name. */
  name: string;
  /** Short description of models / usage. */
  description: string;
  /** Category for grouping in the UI. */
  category: "direct" | "proxy";
  /** Whether a base URL is required alongside the API key. */
  requiresBaseUrl: boolean;
  /** Placeholder text for the API key input. */
  keyPlaceholder: string;
  /** Label for the API key field (can vary per provider). */
  keyLabel: string;
  /** Placeholder text for the base URL input. */
  baseUrlPlaceholder: string;
  /** Help text shown below the base URL input. */
  baseUrlHelp: string;
  /** Models accessible through this provider. */
  modelHint: string;
  /** Environment variable names this maps to in the backend. */
  envVars: { key: string; base?: string };
}

/* ------------------------------------------------------------------ */
/*  Direct providers — API key only                                    */
/* ------------------------------------------------------------------ */

const DIRECT_PROVIDERS: ProviderConfig[] = [
  {
    key: "anthropic",
    name: "Anthropic",
    description: "Claude Sonnet 4.6, Claude Sonnet 4, Claude Opus 4",
    category: "direct",
    requiresBaseUrl: false,
    keyPlaceholder: "sk-ant-api03-...",
    keyLabel: "API Key",
    baseUrlPlaceholder: "https://api.anthropic.com (or Azure endpoint)",
    baseUrlHelp:
      "Optional. Leave blank for native Anthropic API. For Azure-hosted Claude, enter your Azure endpoint (e.g. https://your-resource.services.ai.azure.com/anthropic).",
    modelHint: "Claude model family (Sonnet 4.6, Sonnet 4, Opus 4)",
    envVars: { key: "ANTHROPIC_API_KEY", base: "ANTHROPIC_BASE_URL" },
  },
  {
    key: "google",
    name: "Google AI",
    description: "Gemini 3.1 Pro, Gemini 2.5 Flash",
    category: "direct",
    requiresBaseUrl: false,
    keyPlaceholder: "AIza...",
    keyLabel: "API Key",
    baseUrlPlaceholder: "",
    baseUrlHelp: "",
    modelHint: "Gemini model family",
    envVars: { key: "GOOGLE_API_KEY" },
  },
  {
    key: "mistral",
    name: "Mistral",
    description: "Mistral Large 3 (also available via OpenAI-compatible / LiteLLM)",
    category: "direct",
    requiresBaseUrl: false,
    keyPlaceholder: "sk-...",
    keyLabel: "API Key",
    baseUrlPlaceholder: "",
    baseUrlHelp: "",
    modelHint: "Mistral Large 3 via native API. Can also use OpenAI-compatible or LiteLLM proxy.",
    envVars: { key: "MISTRAL_API_KEY" },
  },
  {
    key: "moonshot",
    name: "Moonshot",
    description: "Kimi K2.5 (also available via OpenAI-compatible / LiteLLM)",
    category: "direct",
    requiresBaseUrl: false,
    keyPlaceholder: "sk-...",
    keyLabel: "API Key",
    baseUrlPlaceholder: "",
    baseUrlHelp: "",
    modelHint: "Kimi K2.5 via native API. Can also use OpenAI-compatible or LiteLLM proxy.",
    envVars: { key: "MOONSHOT_API_KEY" },
  },
];

/* ------------------------------------------------------------------ */
/*  Proxy / compatible providers — API key + base URL                  */
/* ------------------------------------------------------------------ */

const PROXY_PROVIDERS: ProviderConfig[] = [
  {
    key: "openai",
    name: "OpenAI",
    description: "GPT-4.1, GPT-4.1 Mini, o3 — or any OpenAI-compatible endpoint",
    category: "proxy",
    requiresBaseUrl: true,
    keyPlaceholder: "sk-proj-...",
    keyLabel: "API Key (OPENAI_API_KEY)",
    baseUrlPlaceholder: "https://api.openai.com/v1",
    baseUrlHelp:
      "For native OpenAI, use https://api.openai.com/v1. For self-hosted or compatible endpoints (vLLM, Ollama, etc.), enter your custom base URL.",
    modelHint: "GPT-4.1, o3, or any OpenAI-compatible model (Mistral, Kimi via proxy)",
    envVars: { key: "OPENAI_API_KEY", base: "OPENAI_API_BASE" },
  },
  {
    key: "litellm",
    name: "LiteLLM Proxy",
    description: "Unified gateway — route to any model via LiteLLM",
    category: "proxy",
    requiresBaseUrl: true,
    keyPlaceholder: "sk-litellm-...",
    keyLabel: "API Key (LITELLM_API_KEY)",
    baseUrlPlaceholder: "https://your-litellm-proxy.example.com",
    baseUrlHelp:
      "Your LiteLLM proxy endpoint. LiteLLM can route to Anthropic, Google, Mistral, Moonshot, OpenAI, Azure, Bedrock, and more from a single key.",
    modelHint: "All models via LiteLLM proxy — universal gateway",
    envVars: { key: "LITELLM_API_KEY", base: "LITELLM_API_BASE" },
  },
  {
    key: "azure",
    name: "Azure OpenAI",
    description: "GPT-4.1, Mistral, and other models via Azure deployments",
    category: "proxy",
    requiresBaseUrl: true,
    keyPlaceholder: "your-azure-api-key",
    keyLabel: "API Key",
    baseUrlPlaceholder: "https://your-resource.openai.azure.com/openai/deployments/your-deployment",
    baseUrlHelp:
      "Enter your Azure OpenAI resource endpoint including the deployment name. Format: https://{resource}.openai.azure.com/openai/deployments/{deployment}",
    modelHint: "Azure-hosted OpenAI, Mistral, and partner models",
    envVars: { key: "AZURE_API_KEY", base: "AZURE_API_BASE" },
  },
  {
    key: "bedrock",
    name: "AWS Bedrock",
    description: "Claude models, Mistral, and others via AWS Bedrock",
    category: "proxy",
    requiresBaseUrl: true,
    keyPlaceholder: "AKIAIOSFODNN7EXAMPLE",
    keyLabel: "AWS Access Key ID",
    baseUrlPlaceholder: "https://bedrock-runtime.us-east-1.amazonaws.com",
    baseUrlHelp:
      "Your Bedrock runtime endpoint. The API key should be your AWS access key ID. Configure AWS secret key and region via environment variables on the backend.",
    modelHint: "Claude (Anthropic), Mistral, and other models via AWS Bedrock",
    envVars: { key: "AWS_ACCESS_KEY_ID", base: "AWS_BEDROCK_ENDPOINT" },
  },
];

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

export const PROVIDERS: ProviderConfig[] = [
  ...DIRECT_PROVIDERS,
  ...PROXY_PROVIDERS,
];

export const DIRECT_PROVIDER_KEYS = new Set(
  DIRECT_PROVIDERS.map((p) => p.key),
);

export const PROXY_PROVIDER_KEYS = new Set(
  PROXY_PROVIDERS.map((p) => p.key),
);

export const PROVIDER_BY_KEY = new Map(
  PROVIDERS.map((p) => [p.key, p]),
);
