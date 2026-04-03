/**
 * Server-side Supabase client — runs with the user's auth session (anon key).
 *
 * SECURITY: This client uses the ANON key and respects RLS policies.
 * For admin operations that need to bypass RLS, create a separate service-role
 * client using SUPABASE_SERVICE_ROLE_KEY — but NEVER import or use the
 * service-role key in client components or code that ships to the browser.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Ignored in server components
          }
        },
      },
    },
  );
}
