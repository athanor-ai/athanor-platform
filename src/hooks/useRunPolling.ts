/**
 * Poll a running evaluation for real-time progress.
 *
 * When a run is in "pending" or "running" state, polls every 10s.
 * Stops polling when run completes, fails, or is cancelled.
 */
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { Run } from "@/types/database";

async function fetchRunStatus(runId: string): Promise<Run | null> {
  try {
    const res = await fetch(`/api/runs/${runId}`);
    if (res.ok) return res.json();
  } catch {
    // Silent fail -- will retry on next poll
  }
  return null;
}

/**
 * Auto-polling hook for run status.
 * Polls every 10s while run is active, stops when done.
 */
export function useRunPolling(runId: string) {
  return useQuery({
    queryKey: [...queryKeys.runs.detail(runId), "polling"],
    queryFn: () => fetchRunStatus(runId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Keep polling while active
      if (status === "pending" || status === "running") return 10000;
      // Stop polling when done
      return false;
    },
    enabled: !!runId,
  });
}
