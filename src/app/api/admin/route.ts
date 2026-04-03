/**
 * Admin API — manage customers and environment access.
 * Only accessible by users in the internal Athanor org (plan='internal').
 *
 * GET  /api/admin — List all orgs with their env access
 * POST /api/admin — Actions: grant-access, revoke-access, set-plan, list-orgs
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase-server";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const ADMIN_EMAILS = new Set([
  "aidan@athanorl.com",
  "hongsksam@gmail.com",
]);

async function verifyInternalAdmin(request?: Request) {
  // Method 1: Cloudflare Access header (when behind Zero Trust)
  if (request) {
    const cfEmail = request.headers.get("cf-access-authenticated-user-email");
    if (cfEmail && ADMIN_EMAILS.has(cfEmail.toLowerCase())) return true;
  }

  // Method 2: Supabase auth session (when using platform login)
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const service = getServiceClient();
    const { data: profile } = await service
      .from("profiles")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (!profile) return false;

    const { data: org } = await service
      .from("organizations")
      .select("plan")
      .eq("id", profile.organization_id)
      .single();

    return org?.plan === "internal";
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!(await verifyInternalAdmin(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = getServiceClient();

  // List all orgs with their env access
  const { data: orgs } = await service
    .from("organizations")
    .select("id, name, slug, plan, created_at")
    .order("created_at", { ascending: false });

  const { data: access } = await service
    .from("organization_environments")
    .select("organization_id, environment_id, access_level, environments(name, slug)");

  // Get all profiles with last_sign_in from auth
  const { data: authUsers } = await service.auth.admin.listUsers();
  const lastSignInMap: Record<string, string | null> = {};
  for (const u of authUsers?.users || []) {
    if (u.email) lastSignInMap[u.email.toLowerCase()] = u.last_sign_in_at || null;
  }

  // Get all profiles grouped by org
  const { data: profiles } = await service
    .from("profiles")
    .select("id, organization_id, email, role, created_at");

  const profilesByOrg: Record<string, Array<{ email: string; role: string; status: string; created_at: string }>> = {};
  for (const p of profiles || []) {
    if (!profilesByOrg[p.organization_id]) profilesByOrg[p.organization_id] = [];
    const lastSignIn = lastSignInMap[p.email?.toLowerCase()];
    const status = lastSignIn ? "active" : "invited";
    profilesByOrg[p.organization_id].push({
      email: p.email,
      role: p.role,
      status,
      created_at: p.created_at,
    });
  }

  // Group access by org
  const accessMap: Record<string, Array<{ env: string; slug: string; level: string }>> = {};
  for (const a of access || []) {
    const orgId = a.organization_id;
    if (!accessMap[orgId]) accessMap[orgId] = [];
    const env = a.environments as unknown as { name: string; slug: string } | null;
    accessMap[orgId].push({
      env: env?.name || "Unknown",
      slug: env?.slug || "",
      level: a.access_level,
    });
  }

  const result = (orgs || []).map((o) => ({
    ...o,
    environments: accessMap[o.id] || [],
    users: profilesByOrg[o.id] || [],
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  if (!(await verifyInternalAdmin(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = getServiceClient();
  const { action, ...params } = await request.json();

  switch (action) {
    case "grant-access": {
      const { organization_id, environment_id, access_level } = params;
      if (!organization_id || !environment_id) {
        return NextResponse.json({ error: "Missing organization_id or environment_id" }, { status: 400 });
      }
      const { error } = await service.from("organization_environments").upsert({
        organization_id,
        environment_id,
        access_level: access_level || "full",
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, action: "grant-access" });
    }

    case "revoke-access": {
      const { organization_id, environment_id } = params;
      const { error } = await service
        .from("organization_environments")
        .delete()
        .eq("organization_id", organization_id)
        .eq("environment_id", environment_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, action: "revoke-access" });
    }

    case "set-plan": {
      const { organization_id, plan } = params;
      const { error } = await service
        .from("organizations")
        .update({ plan })
        .eq("id", organization_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, action: "set-plan" });
    }

    case "delete-org": {
      const { organization_id } = params;
      if (!organization_id) {
        return NextResponse.json({ error: "Missing organization_id" }, { status: 400 });
      }

      // Don't allow deleting internal org
      const { data: org } = await service
        .from("organizations")
        .select("plan")
        .eq("id", organization_id)
        .single();
      if (org?.plan === "internal") {
        return NextResponse.json({ error: "Cannot delete internal org" }, { status: 403 });
      }

      // Get user emails to remove from Cloudflare
      const { data: orgProfiles } = await service
        .from("profiles")
        .select("id, email")
        .eq("organization_id", organization_id);

      // Remove from Cloudflare Access
      try {
        const { removeAccessEmails } = await import("@/lib/cloudflare-access");
        const emails = (orgProfiles || []).map((p) => p.email).filter(Boolean);
        if (emails.length > 0) await removeAccessEmails(emails);
      } catch {
        // Don't fail if Cloudflare removal fails
      }

      // Delete auth users
      for (const p of orgProfiles || []) {
        await service.auth.admin.deleteUser(p.id);
      }

      // Delete org (cascades to profiles, org_environments, runs, credentials via FK)
      const { error } = await service
        .from("organizations")
        .delete()
        .eq("id", organization_id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, action: "delete-org" });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
