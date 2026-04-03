/**
 * Tenant-aware environment access.
 *
 * Customers only see environments they've purchased.
 * Uses the organization_environments join table for access control.
 *
 * When Supabase is connected: queries real org access.
 * When not connected: shows all environments (dev/demo mode).
 */
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { ATHANOR_ENVIRONMENTS } from "@/data/environments";
import type { AthanorEnvironmentDef } from "@/data/environments";

/**
 * Fetch environments the current user's org has access to.
 * Falls back to all environments in dev mode.
 */
async function fetchOrgEnvironments(): Promise<AthanorEnvironmentDef[]> {
  try {
    // Try real API (returns only org-accessible envs)
    const res = await fetch("/api/environments");
    if (res.ok) {
      const data = await res.json();
      // Map DB records to frontend definitions
      const accessSlugs = new Set(data.map((e: { slug: string }) => e.slug));
      return ATHANOR_ENVIRONMENTS.filter((e) => accessSlugs.has(e.slug));
    }
  } catch {
    // API not available
  }
  // Dev/demo mode: show all
  return ATHANOR_ENVIRONMENTS;
}

export function useOrgEnvironments() {
  return useQuery({
    queryKey: [...queryKeys.environments.all, "org-filtered"],
    queryFn: fetchOrgEnvironments,
    staleTime: 1000 * 60 * 10, // 10 min
  });
}

/**
 * Check if the current org has access to a specific environment.
 */
export function useHasEnvAccess(envSlug: string): boolean {
  const { data: envs } = useOrgEnvironments();
  if (!envs) return true; // Default allow while loading
  return envs.some((e) => e.slug === envSlug);
}
