/**
 * GET /api/environments — List environments the user's org has access to.
 *
 * Uses organization_environments join table for tenant filtering.
 * Admin orgs see all environments. Regular orgs see only purchased ones.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await getSupabaseServerClient();

  if (authUser.isAdmin) {
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
    .eq("organization_id", authUser.organizationId);

  const envs = (access || [])
    .map((a) => (a as Record<string, unknown>).environments)
    .filter(Boolean);

  return NextResponse.json(envs);
}
