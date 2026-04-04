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
 *   environmentSlugs: ["lean-theorem-proving", "hw-cbmc"],
 *   environmentIds: ["00000000-0000-0000-0000-000000000010", ...]  // optional
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
    { auth: { autoRefreshToken: false, persistSession: false } },
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
  const orgSlug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name: orgName, slug: orgSlug, plan: "customer" })
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
  const envErrors: string[] = [];

  // Resolve slugs to IDs in a single batch query (scoped to active environments)
  const envIds = [...(environmentIds || [])];
  if (environmentSlugs?.length) {
    const { data: matchedEnvs, error: envLookupError } = await supabase
      .from("environments")
      .select("id, slug")
      .in("slug", environmentSlugs)
      .eq("status", "active");

    if (envLookupError) {
      envErrors.push(`Slug lookup failed: ${envLookupError.message}`);
    } else if (matchedEnvs) {
      for (const env of matchedEnvs) {
        envIds.push(env.id);
      }
      // Warn about any slugs that didn't resolve
      if (matchedEnvs.length !== environmentSlugs.length) {
        const foundSlugs = new Set(matchedEnvs.map((e: { slug: string }) => e.slug));
        const missing = environmentSlugs.filter((s: string) => !foundSlugs.has(s));
        if (missing.length > 0) {
          envErrors.push(`Slugs not found: ${missing.join(", ")}`);
        }
      }
    }
  }

  // Deduplicate in case both IDs and slugs resolve to the same environment
  const uniqueEnvIds = [...new Set(envIds)];

  for (const envId of uniqueEnvIds) {
    const { error } = await supabase
      .from("organization_environments")
      .insert({
        organization_id: org.id,
        environment_id: envId,
        access_level: "full",
      });
    if (error) {
      envErrors.push(`Grant ${envId}: ${error.message}`);
    } else {
      envGranted.push(envId);
    }
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
    organization: { id: org.id, name: orgName, slug: orgSlug },
    users: results,
    environments: envGranted,
    environmentErrors: envErrors.length > 0 ? envErrors : undefined,
    cloudflare: cfResult,
  }, { status: 201 });
}
