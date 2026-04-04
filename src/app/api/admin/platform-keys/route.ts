/**
 * GET /api/admin/platform-keys — Return status of platform-owned API keys.
 *
 * Admin-only. Returns which Vercel env vars are configured (live vs missing)
 * with masked key suffixes. Never exposes actual key values.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

interface BaseUrlStatus {
  envVar: string;
  label: string;
  configured: boolean;
}

interface PlatformKeyStatus {
  provider: string;
  displayName: string;
  envVar: string;
  models: string[];
  status: "live" | "not_configured";
  /** Masked suffix like "AIza...7EI" — only present when status is "live" */
  maskedKey: string | null;
  /** Base URL env var name, if applicable (single base URL providers) */
  baseUrlEnvVar?: string;
  /** Whether the base URL is set (single base URL providers) */
  baseUrlConfigured?: boolean;
  /** Multiple base URLs for providers with several endpoints */
  baseUrls?: BaseUrlStatus[];
}

function maskKey(key: string): string {
  if (key.length <= 6) return "***";
  const prefix = key.slice(0, 4);
  const suffix = key.slice(-3);
  return `${prefix}...${suffix}`;
}

const PLATFORM_KEY_DEFINITIONS: Array<{
  provider: string;
  displayName: string;
  envVar: string;
  /** Alternative env var name (checked as fallback) */
  altEnvVar?: string;
  models: string[];
  baseUrlEnvVar?: string;
  /** Multiple base URL env vars for providers with several endpoints */
  baseUrlEnvVars?: Array<{ envVar: string; label: string }>;
}> = [
  {
    provider: "anthropic",
    displayName: "Anthropic",
    envVar: "ANTHROPIC_API_KEY",
    models: ["Claude Sonnet 4.6", "Claude Opus 4.6"],
    baseUrlEnvVars: [
      { envVar: "ANTHROPIC_API_BASE", label: "Anthropic Messages Endpoint" },
      { envVar: "AZURE_PROJECT_API_BASE", label: "Azure Project Base" },
      { envVar: "AZURE_OPENAI_API_BASE", label: "Azure OpenAI Base" },
    ],
  },
  {
    provider: "google",
    displayName: "Google AI",
    envVar: "GOOGLE_API_KEY",
    altEnvVar: "GEMINI_API_KEY",
    models: ["Gemini 2.5 Flash", "Gemini 3.1 Pro"],
  },
  {
    provider: "azure-ai",
    displayName: "Azure AI (Isidor)",
    envVar: "AZURE_AI_API_KEY",
    models: ["Kimi K2.5", "Mistral Large 3"],
    baseUrlEnvVar: "AZURE_AI_API_BASE",
  },
  {
    provider: "openai",
    displayName: "Azure OpenAI",
    envVar: "OPENAI_API_KEY",
    models: ["Kimi K2.5", "Mistral Large 3"],
    baseUrlEnvVar: "OPENAI_API_BASE",
  },
  {
    provider: "huggingface",
    displayName: "HuggingFace",
    envVar: "HF_TOKEN",
    models: [],
  },
];

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const platformKeysEnabled =
    process.env.ATHANOR_USE_PLATFORM_KEYS === "true";

  const keys: PlatformKeyStatus[] = PLATFORM_KEY_DEFINITIONS.map((def) => {
    const value = process.env[def.envVar] || (def.altEnvVar ? process.env[def.altEnvVar] : undefined);
    const isConfigured = !!value && value.length > 0;

    const result: PlatformKeyStatus = {
      provider: def.provider,
      displayName: def.displayName,
      envVar: def.envVar,
      models: def.models,
      status: isConfigured ? "live" : "not_configured",
      maskedKey: isConfigured ? maskKey(value) : null,
    };

    if (def.baseUrlEnvVars) {
      result.baseUrls = def.baseUrlEnvVars.map((b) => ({
        envVar: b.envVar,
        label: b.label,
        configured: !!process.env[b.envVar],
      }));
    } else if (def.baseUrlEnvVar) {
      result.baseUrlEnvVar = def.baseUrlEnvVar;
      result.baseUrlConfigured = !!process.env[def.baseUrlEnvVar];
    }

    return result;
  });

  return NextResponse.json({
    platformKeysEnabled,
    keys,
    sshTarget: process.env.AZURE_VM_SSH_TARGET
      ? maskKey(process.env.AZURE_VM_SSH_TARGET)
      : null,
  });
}
