/**
 * POST /api/credentials — Create a new credential (encrypt + store)
 * GET  /api/credentials — List credential summaries (safe metadata only)
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { encryptKey, getKeySuffix } from "@/lib/encryption";

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();

  // Verify auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's org + verify admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || !["owner", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden: admin required" }, { status: 403 });
  }

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

export async function GET() {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // RLS enforces org scoping — select safe columns only (never encrypted_key)
  const { data, error } = await supabase
    .from("credentials")
    .select("id, organization_id, provider, label, key_suffix, base_url, is_active, last_verified_at, created_at, updated_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
