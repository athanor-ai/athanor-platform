import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

interface LaunchRunInput {
  environment_id: string;
  model_name: string;
  calibration_profile_id?: string;
  autoShutdown?: boolean;
}

interface LaunchRunResult {
  run_id: string;
  status: string;
  vmStarted: boolean;
  message: string;
}

/**
 * Launch an evaluation run: start VM -> create run -> return run ID.
 *
 * The actual execution happens server-side (VM executes evaluate.py).
 * The frontend polls run status via useRun(runId).
 */
export function useLaunchRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: LaunchRunInput): Promise<LaunchRunResult> => {
      // Step 1: Start VM
      const vmRes = await fetch("/api/vm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      const vmData = await vmRes.json();
      const vmStarted = vmData.success ?? false;

      // Step 2: Create the run
      const runRes = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          environment_id: input.environment_id,
          model_name: input.model_name,
          calibration_profile_id: input.calibration_profile_id,
          config: { auto_shutdown: input.autoShutdown ?? true },
        }),
      });

      if (!runRes.ok) {
        // If run creation fails but VM started, stop it
        if (vmStarted) {
          await fetch("/api/vm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "stop" }),
          });
        }
        const err = await runRes.json().catch(() => ({ error: "Run creation failed" }));
        throw new Error(err.error || "Failed to create run");
      }

      const run = await runRes.json();

      return {
        run_id: run.id,
        status: run.status,
        vmStarted,
        message: vmStarted
          ? "Evaluation server started and run queued"
          : "Run queued (server may already be running)",
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.runs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.vm });
    },
  });
}

/**
 * Early-stop a run: cancel the run and optionally shut down the VM.
 */
export function useStopRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      runId,
      shutdownVM = true,
    }: {
      runId: string;
      shutdownVM?: boolean;
    }) => {
      // Cancel the run
      await fetch(`/api/runs/${runId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });

      // Optionally shut down VM
      if (shutdownVM) {
        await fetch("/api/vm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "stop" }),
        });
      }

      return { cancelled: true, vmStopped: shutdownVM };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.runs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.vm });
    },
  });
}
