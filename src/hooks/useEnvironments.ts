import { useQuery, queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  mockEnvironments,
  mockEnvironmentVersions,
} from "@/data/mock";
import type { Environment, EnvironmentVersion } from "@/types/database";

// In V1, return mock data. Swap to Supabase fetch when ready.
async function fetchEnvironments(): Promise<Environment[]> {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 300));
  return mockEnvironments;
}

async function fetchEnvironment(id: string): Promise<Environment | undefined> {
  await new Promise((r) => setTimeout(r, 200));
  return mockEnvironments.find((e) => e.id === id);
}

async function fetchEnvironmentVersions(
  envId: string,
): Promise<EnvironmentVersion[]> {
  await new Promise((r) => setTimeout(r, 200));
  return mockEnvironmentVersions.filter((v) => v.environment_id === envId);
}

export const environmentsQueryOptions = queryOptions({
  queryKey: queryKeys.environments.all,
  queryFn: fetchEnvironments,
  staleTime: 1000 * 60 * 5,
});

export const environmentQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.environments.detail(id),
    queryFn: () => fetchEnvironment(id),
    staleTime: 1000 * 60 * 5,
  });

export const environmentVersionsQueryOptions = (envId: string) =>
  queryOptions({
    queryKey: queryKeys.environments.versions(envId),
    queryFn: () => fetchEnvironmentVersions(envId),
    staleTime: 1000 * 60 * 5,
  });

export function useEnvironments() {
  return useQuery(environmentsQueryOptions);
}

export function useEnvironment(id: string) {
  return useQuery(environmentQueryOptions(id));
}

export function useEnvironmentVersions(envId: string) {
  return useQuery(environmentVersionsQueryOptions(envId));
}
