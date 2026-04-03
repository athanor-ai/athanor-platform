import { useQuery, queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { mockCredentials } from "@/data/mock";
import type { CredentialSummary } from "@/types/database";

/**
 * Fetches credential metadata (safe summary only — no secret material).
 *
 * When backed by a real API, this must select only non-secret columns:
 *   id, organization_id, provider, label, key_suffix, is_active,
 *   last_verified_at, created_at, updated_at
 *
 * The encrypted_key column must NEVER be included in the client response.
 */
async function fetchCredentials(): Promise<CredentialSummary[]> {
  await new Promise((r) => setTimeout(r, 200));
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
