/**
 * POST /api/admin/invite — Invite a customer organization.
 *
 * Creates org + multiple user accounts + grants env access + adds emails to Cloudflare.
 * All in one call. Admin-only.
 *
 * Request:
 * {
 *   orgName: "Acme Corp",
 *   emails: ["alice@acme.com", "bob@acme.com"],
 *   environmentIds: ["00000000-0000-0000-0000-000000000010", ...]
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { addAccessEmails } from "@/lib/cloudflare-access";
import nodeCrypto from "crypto";

/** Same derivation as middleware -- keeps passwords in sync */
function derivePassword(email: string): string {
  const secret = process.env.CREDENTIAL_ENCRYPTION_KEY || "fallback-dev-key";
  return nodeCrypto
    .createHmac("sha256", secret)
    .update(`athanor-bridge:${email.toLowerCase()}`)
    .digest("hex")
    .slice(0, 32);
}

const ADMIN_EMAILS = new Set(["aidan@athanorl.com", "hongsksam@gmail.com"]);

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function verifyAdmin(request: NextRequest): boolean {
  const cfEmail = request.headers.get("cf-access-authenticated-user-email");
  return !!cfEmail && ADMIN_EMAILS.has(cfEmail.toLowerCase());
}

export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { orgName, emails, environmentIds, environmentSlugs } = await request.json();

  if (!orgName || !emails?.length) {
    return NextResponse.json(
      { error: "Missing orgName or emails" },
      { status: 400 },
    );
  }

  const supabase = getServiceClient();
  const results: Array<{ email: string; status: string; error?: string }> = [];

  // 1. Create organization
  const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name: orgName, slug, plan: "customer" })
    .select("id")
    .single();

  if (orgError) {
    return NextResponse.json({ error: `Org creation failed: ${orgError.message}` }, { status: 500 });
  }

  // 2. Create user accounts (first email = owner, rest = members)
  for (let i = 0; i < emails.length; i++) {
    const email = emails[i].trim().toLowerCase();
    const role = i === 0 ? "owner" : "member";

    try {
      // Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: derivePassword(email),
        email_confirm: true,
      });

      if (authError) {
        results.push({ email, status: "failed", error: authError.message });
        continue;
      }

      // Create profile
      await supabase.from("profiles").insert({
        id: authData.user.id,
        organization_id: org.id,
        email,
        role,
      });

      results.push({ email, status: "created", error: undefined });
    } catch (e) {
      results.push({ email, status: "failed", error: String(e) });
    }
  }

  // 3. Grant environment access (support both IDs and slugs)
  const envGranted: string[] = [];

  // Resolve slugs to IDs
  const envIds = [...(environmentIds || [])];
  if (environmentSlugs?.length) {
    for (const slug of environmentSlugs) {
      const { data: env } = await supabase.from("environments").select("id").eq("slug", slug).single();
      if (env) envIds.push(env.id);
    }
  }

  for (const envId of envIds) {
    const { error } = await supabase
      .from("organization_environments")
      .insert({
        organization_id: org.id,
        environment_id: envId,
        access_level: "full",
      });
    if (!error) envGranted.push(envId);
  }

  // 4. Add emails to Cloudflare Access policy
  let cfResult = { added: [] as string[], existing: [] as string[] };
  try {
    const successEmails = results.filter((r) => r.status === "created").map((r) => r.email);
    if (successEmails.length > 0) {
      cfResult = await addAccessEmails(successEmails);
    }
  } catch (e) {
    // Don't fail the whole invite if Cloudflare fails
    console.error("Cloudflare access update failed:", e);
  }

  return NextResponse.json({
    organization: { id: org.id, name: orgName, slug },
    users: results,
    environments: envGranted,
    cloudflare: cfResult,
  }, { status: 201 });
}
