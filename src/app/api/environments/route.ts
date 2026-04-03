/**
 * GET /api/environments — List environments the user's org has access to.
 *
 * Uses organization_environments join table for tenant filtering.
 * Admin orgs see all environments. Regular orgs see only purchased ones.
 */
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's org
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "No organization" }, { status: 403 });
  }

  // Check if org is admin (sees all envs) or regular (sees purchased only)
  const { data: org } = await supabase
    .from("organizations")
    .select("plan")
    .eq("id", profile.organization_id)
    .single();

  if (org?.plan === "internal" || profile.role === "owner") {
    // Internal/admin: return all environments
    const { data: envs } = await supabase
      .from("environments")
      .select("id, name, slug, engine, status")
      .eq("status", "active")
      .order("name");

    return NextResponse.json(envs || []);
  }

  // Regular customer: return only purchased environments
  const { data: access } = await supabase
    .from("organization_environments")
    .select("environment_id, environments(id, name, slug, engine, status)")
    .eq("organization_id", profile.organization_id);

  const envs = (access || [])
    .map((a) => (a as Record<string, unknown>).environments)
    .filter(Boolean);

  return NextResponse.json(envs);
}
