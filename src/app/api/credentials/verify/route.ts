/**
 * POST /api/credentials/verify — Test if a credential's API key is valid.
 *
 * Makes a minimal API call to the provider to check if the key works.
 * Updates last_verified_at on success.
 * Returns { valid: boolean, error?: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { decryptKey } from "@/lib/encryption";

const PROVIDER_TEST_CONFIG: Record<
  string,
  { url: string; model: string; authHeader: (key: string) => Record<string, string> }
> = {
  anthropic: {
    url: "https://api.anthropic.com/v1/messages",
    model: "claude-sonnet-4-6-20250514",
    authHeader: (key) => ({
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    }),
  },
  google: {
    url: "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1",
    model: "",
    authHeader: (key) => ({ "x-goog-api-key": key }),
  },
  // OpenAI-compatible (Azure, LiteLLM, etc.) — test with /models endpoint
  openai: {
    url: "/v1/models",
    model: "",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  azure: {
    url: "/models",
    model: "",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  litellm: {
    url: "/models",
    model: "",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
  },
};

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { credential_id } = await request.json();
  if (!credential_id) {
    return NextResponse.json({ error: "Missing credential_id" }, { status: 400 });
  }

  // Fetch credential (need encrypted_key for verification)
  // Use service-role approach or RLS-filtered select
  const { data: cred, error: credError } = await supabase
    .from("credentials")
    .select("*")
    .eq("id", credential_id)
    .single();

  if (credError || !cred) {
    return NextResponse.json({ error: "Credential not found" }, { status: 404 });
  }

  try {
    const apiKey = decryptKey(cred.encrypted_key);
    const provider = cred.provider;
    const config = PROVIDER_TEST_CONFIG[provider];

    if (!config) {
      return NextResponse.json({
        valid: true,
        message: `No verification test for provider: ${provider}`,
      });
    }

    // Build URL (some need base_url prefix)
    let testUrl = config.url;
    if (testUrl.startsWith("/") && cred.base_url) {
      testUrl = cred.base_url.replace(/\/+$/, "") + testUrl;
    } else if (testUrl.startsWith("/")) {
      return NextResponse.json({
        valid: false,
        error: "Base URL required for this provider",
      });
    }

    // For Google, just hit the models list endpoint
    if (provider === "google") {
      testUrl = `${config.url}&key=${apiKey}`;
      const res = await fetch(testUrl, { method: "GET" });
      const valid = res.ok;
      if (valid) {
        await supabase
          .from("credentials")
          .update({ last_verified_at: new Date().toISOString() })
          .eq("id", credential_id);
      }
      return NextResponse.json({
        valid,
        error: valid ? undefined : `HTTP ${res.status}`,
      });
    }

    // For OpenAI-compatible, hit /models
    const res = await fetch(testUrl, {
      method: "GET",
      headers: config.authHeader(apiKey),
    });

    const valid = res.ok;
    if (valid) {
      await supabase
        .from("credentials")
        .update({ last_verified_at: new Date().toISOString() })
        .eq("id", credential_id);
    }

    return NextResponse.json({
      valid,
      error: valid ? undefined : `HTTP ${res.status}: ${(await res.text()).slice(0, 100)}`,
    });
  } catch (e) {
    return NextResponse.json({
      valid: false,
      error: `Verification failed: ${e instanceof Error ? e.message : String(e)}`,
    });
  }
}
