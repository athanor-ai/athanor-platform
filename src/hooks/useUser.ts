import { useQuery, queryOptions } from "@tanstack/react-query";

interface UserInfo {
  email: string;
  organizationName: string | null;
  organizationSlug: string | null;
}

async function fetchCurrentUser(): Promise<UserInfo | null> {
  try {
    const res = await fetch("/api/me");
    if (res.ok) return res.json();
  } catch {
    // Not authenticated or network error
  }
  return null;
}

export const userQueryOptions = queryOptions({
  queryKey: ["me"] as const,
  queryFn: fetchCurrentUser,
  staleTime: 1000 * 60 * 10,
});

export function useUser() {
  return useQuery(userQueryOptions);
}
