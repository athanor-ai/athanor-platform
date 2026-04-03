/**
 * PATCH  /api/credentials/:id — Update label, key, or base URL
 * DELETE /api/credentials/:id — Soft-delete (set is_active=false)
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { encryptKey, getKeySuffix } from "@/lib/encryption";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["owner", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.label) updates.label = body.label;
  if (body.baseUrl !== undefined) updates.base_url = body.baseUrl?.trim() || null;

  if (body.apiKey) {
    updates.encrypted_key = encryptKey(body.apiKey);
    updates.key_suffix = getKeySuffix(body.apiKey);
    updates.last_verified_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("credentials")
    .update(updates)
    .eq("id", id)
    .select("id, organization_id, provider, label, key_suffix, base_url, is_active, last_verified_at, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["owner", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Soft delete
  const { error } = await supabase
    .from("credentials")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
