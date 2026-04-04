/**
 * Shared crypto utilities for Cloudflare-to-Supabase auth bridge.
 *
 * The derived password is NOT user-facing -- it bridges Cloudflare identity
 * to a Supabase session without user interaction.
 */
import crypto from "crypto";

const FALLBACK_DEV_KEY = "fallback-dev-key";

/**
 * Derive a deterministic password for a user email.
 * Used by both middleware (sign-in) and admin routes (user creation).
 */
export function derivePassword(email: string): string {
  const secret = process.env.CREDENTIAL_ENCRYPTION_KEY || FALLBACK_DEV_KEY;
  return crypto
    .createHmac("sha256", secret)
    .update(`athanor-bridge:${email.toLowerCase()}`)
    .digest("hex")
    .slice(0, 32);
}
