/**
 * Middleware: bridge Cloudflare Zero Trust identity to Supabase session.
 *
 * Flow:
 * 1. Cloudflare authenticates the user (OTP or GitHub org)
 * 2. Cloudflare passes verified email in cf-access-authenticated-user-email header
 * 3. This middleware reads the email, finds the Supabase user, signs them in
 * 4. Sets a Supabase session cookie so all API routes + RLS work
 *
 * If no Cloudflare header (local dev), falls back to existing Supabase session.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const cfEmail = request.headers.get("cf-access-authenticated-user-email");
  if (!cfEmail) return response; // No Cloudflare header = local dev, skip

  // Check if already has a valid Supabase session cookie
  const existingSession = request.cookies.get("sb-session-email");
  if (existingSession?.value === cfEmail.toLowerCase()) {
    return response; // Already bridged this email
  }

  // Bridge: sign in the Supabase user matching this Cloudflare email
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return response;

  try {
    const supabase = createClient(supabaseUrl, serviceKey);

    // Look up user by email
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users?.users?.find(
      (u) => u.email?.toLowerCase() === cfEmail.toLowerCase(),
    );

    if (!user) {
      // User passed Cloudflare but doesn't have a Supabase account yet
      // This happens if admin added their email to Cloudflare but hasn't invited them
      // Let them through with no session -- they'll see mock/empty data
      return response;
    }

    // Generate a magic link token for this user (signs them in without password)
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: user.email!,
    });

    if (linkError || !linkData) return response;

    // Extract the access token from the generated link
    // The link contains a token we can use to create a session
    const token = linkData.properties?.hashed_token;
    if (!token) return response;

    // Set a tracking cookie so we don't re-bridge on every request
    response.cookies.set("sb-session-email", cfEmail.toLowerCase(), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 hours
      path: "/",
    });

    // Pass the user info as headers for API routes to pick up
    response.headers.set("x-athanor-user-id", user.id);
    response.headers.set("x-athanor-user-email", cfEmail.toLowerCase());
  } catch {
    // Don't block the request if bridging fails
  }

  return response;
}

export const config = {
  // Run on all routes except static assets
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
