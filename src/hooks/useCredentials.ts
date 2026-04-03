import { useQuery, queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { mockCredentials } from "@/data/mock";
import type { CredentialSummary } from "@/types/database";

/**
 * Fetches credential metadata (safe summary only — no secret material).
 * Uses real API when available, falls back to mock data.
 */
async function fetchCredentials(): Promise<CredentialSummary[]> {
  try {
    const res = await fetch("/api/credentials");
    if (res.ok) return res.json();
  } catch {
    // API not available (dev without Supabase) — fall back to mock
  }
  return mockCredentials;
}

export const credentialsQueryOptions = queryOptions({
  queryKey: queryKeys.credentials.all,
  queryFn: fetchCredentials,
  staleTime: 1000 * 60 * 5,
});

export function useCredentials() {
  return useQuery(credentialsQueryOptions);
}
