/**
 * GET /api/me — Return the current user's email and organization info.
 *
 * Used by the sidebar to display user identity. Resolves the Supabase
 * auth session and joins the profile + organization tables.
 */
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role, organizations(name, slug)")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json(
      { email: user.email, organizationName: null, organizationSlug: null },
      { status: 200 },
    );
  }

  const org = profile.organizations as unknown as {
    name: string;
    slug: string;
  } | null;

  return NextResponse.json({
    email: user.email,
    organizationName: org?.name ?? null,
    organizationSlug: org?.slug ?? null,
  });
}
