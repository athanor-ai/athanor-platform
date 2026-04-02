import { useQuery, queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { mockRuns, mockRunResults } from "@/data/mock";
import type { Run, RunResult } from "@/types/database";

async function fetchRuns(): Promise<Run[]> {
  await new Promise((r) => setTimeout(r, 300));
  return mockRuns;
}

async function fetchRun(id: string): Promise<Run | undefined> {
  await new Promise((r) => setTimeout(r, 200));
  return mockRuns.find((r) => r.id === id);
}

async function fetchRunResults(runId: string): Promise<RunResult[]> {
  await new Promise((r) => setTimeout(r, 200));
  return mockRunResults.filter((r) => r.run_id === runId);
}

export const runsQueryOptions = queryOptions({
  queryKey: queryKeys.runs.all,
  queryFn: fetchRuns,
  staleTime: 1000 * 60 * 2,
});

export const runQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.runs.detail(id),
    queryFn: () => fetchRun(id),
    staleTime: 1000 * 60 * 2,
  });

export const runResultsQueryOptions = (runId: string) =>
  queryOptions({
    queryKey: queryKeys.runs.results(runId),
    queryFn: () => fetchRunResults(runId),
    staleTime: 1000 * 60 * 2,
  });

export function useRuns() {
  return useQuery(runsQueryOptions);
}

export function useRun(id: string) {
  return useQuery(runQueryOptions(id));
}

export function useRunResults(runId: string) {
  return useQuery(runResultsQueryOptions(runId));
}
