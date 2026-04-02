import { useQuery, queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { mockBaselineRuns } from "@/data/mock";
import type { BaselineRun } from "@/types/database";

async function fetchBaselines(): Promise<BaselineRun[]> {
  await new Promise((r) => setTimeout(r, 300));
  return mockBaselineRuns;
}

export const baselinesQueryOptions = queryOptions({
  queryKey: queryKeys.baselines.all,
  queryFn: fetchBaselines,
  staleTime: 1000 * 60 * 10,
});

export function useBaselines() {
  return useQuery(baselinesQueryOptions);
}
