/**
 * POST /api/credentials — Create a new credential (encrypt + store)
 * GET  /api/credentials — List credential summaries (safe metadata only)
 *
 * When ATHANOR_USE_PLATFORM_KEYS=true, the GET endpoint also includes
 * platform-owned credentials (Vercel env vars) so the launch page can
 * show them as available providers.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { encryptKey, getKeySuffix } from "@/lib/encryption";
import { getAuthUser } from "@/lib/auth";
import { getPlatformCredentialSummariesForAPI } from "@/lib/platform-credentials";

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["owner", "admin"].includes(authUser.role) && !authUser.isAdmin) {
    return NextResponse.json({ error: "Forbidden: admin required" }, { status: 403 });
  }

  const profile = { organization_id: authUser.organizationId };
  const supabase = await getSupabaseServerClient();

  const body = await request.json();
  const { provider, label, apiKey, baseUrl } = body;

  if (!provider || !label || !apiKey) {
    return NextResponse.json(
      { error: "Missing required fields: provider, label, apiKey" },
      { status: 400 },
    );
  }

  // Encrypt the API key
  const encrypted = encryptKey(apiKey);
  const suffix = getKeySuffix(apiKey);

  const { data, error } = await supabase
    .from("credentials")
    .insert({
      organization_id: profile.organization_id,
      provider,
      label,
      encrypted_key: encrypted,
      key_suffix: suffix,
      base_url: baseUrl?.trim() || null,
      is_active: true,
      last_verified_at: new Date().toISOString(),
    })
    .select("id, organization_id, provider, label, key_suffix, base_url, is_active, last_verified_at, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await getSupabaseServerClient();

  // Select safe columns only (never encrypted_key), scoped to user's org
  const { data, error } = await supabase
    .from("credentials")
    .select("id, organization_id, provider, label, key_suffix, base_url, is_active, last_verified_at, created_at, updated_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const dbCredentials = data ?? [];

  // Merge platform-owned credentials (Vercel env vars) when enabled.
  // Platform keys act as fallback — skip providers already covered by
  // the organization's own credentials to avoid duplicates.
  const platformSummaries = getPlatformCredentialSummariesForAPI();
  const dbProviders = new Set(dbCredentials.map((c) => c.provider));
  const platformExtras = platformSummaries.filter(
    (p) => !dbProviders.has(p.provider),
  );

  return NextResponse.json([...dbCredentials, ...platformExtras]);
}
