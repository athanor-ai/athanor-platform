/**
 * Unified auth: resolve the current user from Cloudflare + Supabase.
 *
 * Priority:
 * 1. x-athanor-user-id header (set by middleware from Cloudflare email)
 * 2. Supabase auth session (direct login)
 * 3. cf-access-authenticated-user-email header (fallback, email-only lookup)
 *
 * Returns the user's profile including organization_id for RLS.
 */
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "./supabase-server";

const ADMIN_EMAILS = new Set([
  "aidan@athanorl.com",
  "hongsksam@gmail.com",
  "spencer.sw.hong@gmail.com",
]);

export interface AuthUser {
  id: string;
  email: string;
  organizationId: string;
  role: string;
  isAdmin: boolean;
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * Get the current authenticated user from request headers or Supabase session.
 * Returns null if not authenticated.
 */
export async function getAuthUser(request?: Request): Promise<AuthUser | null> {
  const service = getServiceClient();

  // Method 1: middleware-injected headers (fastest)
  if (request) {
    const userId = request.headers.get("x-athanor-user-id");
    const email = request.headers.get("x-athanor-user-email");
    if (userId && email) {
      const { data: profile } = await service
        .from("profiles")
        .select("organization_id, role")
        .eq("id", userId)
        .single();

      if (profile) {
        return {
          id: userId,
          email,
          organizationId: profile.organization_id,
          role: profile.role,
          isAdmin: ADMIN_EMAILS.has(email.toLowerCase()),
        };
      }
    }
  }

  // Method 2: Supabase auth session
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      const { data: profile } = await service
        .from("profiles")
        .select("organization_id, role")
        .eq("id", user.id)
        .single();

      if (profile) {
        return {
          id: user.id,
          email: user.email,
          organizationId: profile.organization_id,
          role: profile.role,
          isAdmin: ADMIN_EMAILS.has(user.email.toLowerCase()),
        };
      }
    }
  } catch {
    // No Supabase session
  }

  // Method 3: Cloudflare email header (fallback, lookup by email)
  if (request) {
    const cfEmail = request.headers.get("cf-access-authenticated-user-email");
    if (cfEmail) {
      const { data: profile } = await service
        .from("profiles")
        .select("id, organization_id, role")
        .eq("email", cfEmail.toLowerCase())
        .single();

      if (profile) {
        return {
          id: profile.id,
          email: cfEmail.toLowerCase(),
          organizationId: profile.organization_id,
          role: profile.role,
          isAdmin: ADMIN_EMAILS.has(cfEmail.toLowerCase()),
        };
      }

      // Known admin email but no profile yet
      if (ADMIN_EMAILS.has(cfEmail.toLowerCase())) {
        return {
          id: "admin",
          email: cfEmail.toLowerCase(),
          organizationId: "00000000-0000-0000-0000-000000000001",
          role: "owner",
          isAdmin: true,
        };
      }
    }
  }

  return null;
}
