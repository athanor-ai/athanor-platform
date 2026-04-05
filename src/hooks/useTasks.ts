import { useQuery, queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { mockTasks } from "@/data/mock";
import type { Task } from "@/types/database";

async function fetchTasks(): Promise<Task[]> {
  try {
    const res = await fetch("/api/tasks");
    if (res.ok) return res.json();
  } catch {
    // Fall back to mock
  }
  return mockTasks;
}

async function fetchTasksByEnvironment(envId: string): Promise<Task[]> {
  try {
    const res = await fetch("/api/tasks");
    if (res.ok) {
      const tasks: Task[] = await res.json();
      return tasks.filter((t) => t.environment_id === envId);
    }
  } catch {
    // Fall back to mock
  }
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
