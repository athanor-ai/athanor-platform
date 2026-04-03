import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export type VMStatus = "running" | "deallocated" | "starting" | "stopping" | "unknown";

interface VMState {
  status: VMStatus;
  vm: string;
}

async function fetchVMStatus(): Promise<VMState> {
  const res = await fetch("/api/vm");
  if (!res.ok) return { status: "unknown", vm: "standard-env-runner" };
  return res.json();
}

export function useVMStatus() {
  return useQuery({
    queryKey: queryKeys.vm ?? ["vm", "status"],
    queryFn: fetchVMStatus,
    staleTime: 1000 * 15, // refresh every 15s
    refetchInterval: 1000 * 30, // auto-poll every 30s
  });
}

export function useVMActions() {
  const queryClient = useQueryClient();

  const startVM = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/vm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vm ?? ["vm", "status"] });
    },
  });

  const stopVM = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/vm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vm ?? ["vm", "status"] });
    },
  });

  const cleanupVM = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/vm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cleanup" }),
      });
      return res.json();
    },
  });

  const healthCheck = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/vm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "health" }),
      });
      return res.json();
    },
  });

  return { startVM, stopVM, cleanupVM, healthCheck };
}
