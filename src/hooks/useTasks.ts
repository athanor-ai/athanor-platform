import { useQuery, queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { mockTasks } from "@/data/mock";
import type { Task } from "@/types/database";

async function fetchTasks(): Promise<Task[]> {
  await new Promise((r) => setTimeout(r, 300));
  return mockTasks;
}

async function fetchTasksByEnvironment(envId: string): Promise<Task[]> {
  await new Promise((r) => setTimeout(r, 200));
  return mockTasks.filter((t) => t.environment_id === envId);
}

export const tasksQueryOptions = queryOptions({
  queryKey: queryKeys.tasks.all,
  queryFn: fetchTasks,
  staleTime: 1000 * 60 * 5,
});

export const tasksByEnvironmentQueryOptions = (envId: string) =>
  queryOptions({
    queryKey: queryKeys.tasks.byEnvironment(envId),
    queryFn: () => fetchTasksByEnvironment(envId),
    staleTime: 1000 * 60 * 5,
  });

export function useTasks() {
  return useQuery(tasksQueryOptions);
}

export function useTasksByEnvironment(envId: string) {
  return useQuery(tasksByEnvironmentQueryOptions(envId));
}
