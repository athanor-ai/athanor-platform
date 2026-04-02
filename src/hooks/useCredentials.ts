import { useQuery, queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { mockCredentials } from "@/data/mock";
import type { Credential } from "@/types/database";

async function fetchCredentials(): Promise<Credential[]> {
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
