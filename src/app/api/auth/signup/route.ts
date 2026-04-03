/**
 * POST /api/auth/signup — Self-service customer signup.
 *
 * Creates: Supabase auth user -> organization -> profile (linked).
 * New orgs start with plan='free' and no environment access.
 * Admin (you) grants env access later via /api/admin/grant-access.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(request: NextRequest) {
  const { email, password, orgName } = await request.json();

  if (!email || !password || !orgName) {
    return NextResponse.json(
      { error: "Missing required fields: email, password, orgName" },
      { status: 400 },
    );
  }

  const supabase = getServiceClient();

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const userId = authData.user.id;

  // 2. Create organization
  const slug = orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name: orgName, slug, plan: "free" })
    .select("id")
    .single();

  if (orgError) {
    // Cleanup: delete the auth user if org creation fails
    await supabase.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: orgError.message }, { status: 500 });
  }

  // 3. Create profile (link user to org as owner)
  const { error: profileError } = await supabase.from("profiles").insert({
    id: userId,
    organization_id: org.id,
    email,
    role: "owner",
  });

  if (profileError) {
    await supabase.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      user_id: userId,
      organization_id: org.id,
      message: "Account created. Log in to get started.",
    },
    { status: 201 },
  );
}
