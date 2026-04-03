/**
 * Middleware: bridge Cloudflare Zero Trust identity to Supabase session.
 *
 * When a user passes Cloudflare (via GitHub SSO or email OTP), Cloudflare
 * sets the cf-access-authenticated-user-email header. This middleware:
 *
 * 1. Reads the verified email from the Cloudflare header
 * 2. Signs the user into Supabase using their pre-created account
 * 3. Sets Supabase session cookies so all API routes + RLS work
 *
 * The Supabase account is created during admin invite (POST /api/admin/invite).
 * Each account has a deterministic password derived from email + a server secret,
 * so the middleware can sign them in without user interaction.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

/**
 * Derive a deterministic password for a user email.
 * This is NOT user-facing -- it's an internal bridge between Cloudflare and Supabase.
 * The password is never shown to the user; they authenticate via Cloudflare.
 */
function derivePassword(email: string): string {
  const secret = process.env.CREDENTIAL_ENCRYPTION_KEY || "fallback-dev-key";
  return crypto
    .createHmac("sha256", secret)
    .update(`athanor-bridge:${email.toLowerCase()}`)
    .digest("hex")
    .slice(0, 32);
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const cfEmail = request.headers.get("cf-access-authenticated-user-email");
  if (!cfEmail) return response; // No Cloudflare header = local dev, skip

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseAnonKey || !serviceKey) return response;

  // Check if already bridged (cookie tracks this)
  const bridgeCookie = request.cookies.get("sb-bridged-email");
  if (bridgeCookie?.value === cfEmail.toLowerCase()) {
    // Already bridged -- check if Supabase session is still valid
    const hasSession = request.cookies.getAll().some(
      (c) => c.name.startsWith("sb-") && c.name.includes("auth-token"),
    );
    if (hasSession) return response;
    // Session expired, re-bridge below
  }

  try {
    const email = cfEmail.toLowerCase();
    const password = derivePassword(email);

    // Use service client to ensure the user exists and has the right password
    const serviceClient = createClient(supabaseUrl, serviceKey);
    const { data: users } = await serviceClient.auth.admin.listUsers();
    const existingUser = users?.users?.find(
      (u) => u.email?.toLowerCase() === email,
    );

    if (!existingUser) {
      // User passed Cloudflare but no Supabase account -- let them through
      // They'll see empty/mock data. Admin needs to invite them first.
      return response;
    }

    // Update the user's password to our derived one (idempotent)
    await serviceClient.auth.admin.updateUserById(existingUser.id, {
      password,
    });

    // Now sign in with the anon client to create a real session with cookies
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error(`Auth bridge failed for ${email}:`, signInError.message);
      return response;
    }

    // Set tracking cookie so we don't re-bridge on every request
    response.cookies.set("sb-bridged-email", email, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 hours
      path: "/",
    });
  } catch (e) {
    console.error("Auth bridge error:", e);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/cron).*)"],
};
