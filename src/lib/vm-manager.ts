/**
 * Azure VM lifecycle management for the evaluation runner.
 *
 * The evaluation backend runs on an Azure VM that is deallocated when idle
 * to save costs. This module handles:
 *   - Starting the VM when a run is queued
 *   - Stopping the VM after a run completes (or on early abort)
 *   - Health checks and cleanup
 *   - Resource limits to prevent runaway costs
 *
 * VM: standard-env-runner in resource group env-runner
 * Start: az vm start -g env-runner -n standard-env-runner
 * Stop:  az vm deallocate -g env-runner -n standard-env-runner
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const VM_RESOURCE_GROUP = process.env.AZURE_VM_RESOURCE_GROUP || "env-runner";
const VM_NAME = process.env.AZURE_VM_NAME || "standard-env-runner";

// Safety limits
const MAX_RUN_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours max per run
/* eslint-disable @typescript-eslint/no-unused-vars */
const _MAX_VM_UPTIME_MS = 6 * 60 * 60 * 1000; // 6 hours max before forced shutdown
const _MAX_DISK_USAGE_GB = 50; // Alert if disk usage exceeds this
const _MAX_WORKDIR_SIZE_GB = 10; // Clean workdirs if they exceed this
/* eslint-enable @typescript-eslint/no-unused-vars */

export type VMStatus = "running" | "deallocated" | "starting" | "stopping" | "unknown";

/**
 * Get current VM status.
 */
export async function getVMStatus(): Promise<VMStatus> {
  try {
    const { stdout } = await execAsync(
      `az vm get-instance-view -g ${VM_RESOURCE_GROUP} -n ${VM_NAME} --query "instanceView.statuses[1].displayStatus" -o tsv`,
      { timeout: 30000 },
    );
    const status = stdout.trim().toLowerCase();
    if (status.includes("running")) return "running";
    if (status.includes("deallocat")) return "deallocated";
    if (status.includes("starting")) return "starting";
    if (status.includes("stopping")) return "stopping";
    return "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Start the VM. Idempotent (no-op if already running).
 * Returns true if VM is running after the call.
 */
export async function startVM(): Promise<boolean> {
  const status = await getVMStatus();
  if (status === "running") return true;

  try {
    console.log(`Starting VM ${VM_NAME}...`);
    await execAsync(
      `az vm start -g ${VM_RESOURCE_GROUP} -n ${VM_NAME}`,
      { timeout: 300000 }, // 5 min timeout for start
    );
    console.log(`VM ${VM_NAME} started`);
    return true;
  } catch (e) {
    console.error(`Failed to start VM: ${e}`);
    return false;
  }
}

/**
 * Deallocate the VM (stops billing). Idempotent.
 */
export async function stopVM(): Promise<boolean> {
  const status = await getVMStatus();
  if (status === "deallocated") return true;

  try {
    console.log(`Deallocating VM ${VM_NAME}...`);
    await execAsync(
      `az vm deallocate -g ${VM_RESOURCE_GROUP} -n ${VM_NAME}`,
      { timeout: 300000 },
    );
    console.log(`VM ${VM_NAME} deallocated`);
    return true;
  } catch (e) {
    console.error(`Failed to deallocate VM: ${e}`);
    return false;
  }
}

/**
 * Run cleanup on the VM to prevent resource bloat.
 *
 * Potential bloat sources:
 * 1. .workdirs/ - student work from dryrun.py (can grow to GBs with Rust builds)
 * 2. /tmp/dryrun-workdir-* - tempfiles from evaluate.py
 * 3. /tmp/eval-workdir-* - same
 * 4. Docker/Podman image cache - old container layers
 * 5. ~/.claude/ - Claude CLI session data
 * 6. Cargo/Go/Lean build caches
 *
 * Call this after every run completes or before VM shutdown.
 */
export async function cleanupVM(sshTarget?: string): Promise<string[]> {
  const target = sshTarget || process.env.AZURE_VM_SSH_TARGET;
  if (!target) return ["No SSH target configured"];

  const cleanupCommands = [
    // 1. Remove all workdirs across all envs (student work artifacts)
    "for env in hw-cbmc-env lean-demo csparse-rust-env congestion-control distributed-consensus cedar-env; do podman unshare rm -rf ~/$env/.workdirs/ 2>/dev/null; mkdir -p ~/$env/.workdirs; done",

    // 2. Remove temp dryrun/eval workdirs
    "rm -rf /tmp/dryrun-workdir-* /tmp/eval-workdir-* /tmp/smoke-* /tmp/lean-* /tmp/fix-* /tmp/fix2-* /tmp/fix3-* /tmp/kimi-*",

    // 3. Prune podman images (keep only latest per repo)
    "podman image prune -f 2>/dev/null || true",

    // 4. Clear Cargo build caches (Rust envs leave massive target/ dirs)
    "find ~ -name 'target' -type d -path '*/student_data/*' -exec rm -rf {} + 2>/dev/null || true",

    // 5. Clear Go test caches
    "go clean -testcache 2>/dev/null || true",

    // 6. Clear Claude CLI session data (old conversation logs)
    "find ~/.claude/projects -name '*.jsonl' -mtime +7 -delete 2>/dev/null || true",

    // 7. Report disk usage
    "df -h / | tail -1",
  ];

  const results: string[] = [];
  for (const cmd of cleanupCommands) {
    try {
      const { stdout } = await execAsync(
        `ssh ${target} '${cmd}'`,
        { timeout: 60000 },
      );
      results.push(stdout.trim());
    } catch (e) {
      results.push(`Error: ${e}`);
    }
  }

  return results;
}

/**
 * Check VM resource health.
 */
export async function checkVMHealth(sshTarget?: string): Promise<{
  diskUsagePercent: number;
  memoryUsedMB: number;
  activeProcesses: number;
  warnings: string[];
}> {
  const target = sshTarget || process.env.AZURE_VM_SSH_TARGET;
  if (!target) {
    return { diskUsagePercent: 0, memoryUsedMB: 0, activeProcesses: 0, warnings: ["No SSH target"] };
  }

  const warnings: string[] = [];

  try {
    const { stdout: diskOut } = await execAsync(
      `ssh ${target} "df / --output=pcent | tail -1 | tr -d ' %'"`,
      { timeout: 10000 },
    );
    const diskUsagePercent = parseInt(diskOut.trim()) || 0;
    if (diskUsagePercent > 85) warnings.push(`Disk usage high: ${diskUsagePercent}%`);

    const { stdout: memOut } = await execAsync(
      `ssh ${target} "free -m | awk '/Mem:/ {print \\$3}'"`,
      { timeout: 10000 },
    );
    const memoryUsedMB = parseInt(memOut.trim()) || 0;

    const { stdout: procOut } = await execAsync(
      `ssh ${target} "ps aux | grep -c 'dryrun\\|evaluate' | head -1"`,
      { timeout: 10000 },
    );
    const activeProcesses = parseInt(procOut.trim()) || 0;

    return { diskUsagePercent, memoryUsedMB, activeProcesses, warnings };
  } catch {
    return { diskUsagePercent: 0, memoryUsedMB: 0, activeProcesses: 0, warnings: ["Health check failed"] };
  }
}

/**
 * Full run lifecycle: start VM -> execute -> cleanup -> stop VM.
 *
 * Called by the API when a run is queued. Handles the entire lifecycle
 * including error recovery and guaranteed VM shutdown.
 */
export async function executeRunLifecycle(
  runId: string,
  options: {
    autoShutdown?: boolean; // default true -- deallocate after run
    maxDurationMs?: number; // default MAX_RUN_DURATION_MS
    onProgress?: (msg: string) => void;
  } = {},
): Promise<{ success: boolean; error?: string }> {
  const autoShutdown = options.autoShutdown ?? true;
  const maxDuration = options.maxDurationMs ?? MAX_RUN_DURATION_MS;
  const log = options.onProgress ?? console.log;

  const startTime = Date.now();

  try {
    // 1. Start VM
    log("Starting evaluation server...");
    const started = await startVM();
    if (!started) {
      return { success: false, error: "Failed to start VM" };
    }

    // 2. Wait for VM to be SSH-accessible (up to 2 min)
    log("Waiting for server to be ready...");
    // TODO: implement SSH readiness check

    // 3. Execute the run (via SSH to the VM)
    log(`Executing run ${runId}...`);
    // TODO: SSH to VM, run evaluate.py with credentials

    // 4. Check timeout
    if (Date.now() - startTime > maxDuration) {
      log("Run exceeded maximum duration, stopping...");
      return { success: false, error: "Timeout exceeded" };
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  } finally {
    // ALWAYS cleanup and optionally stop
    log("Cleaning up...");
    await cleanupVM();

    if (autoShutdown) {
      log("Shutting down evaluation server...");
      await stopVM();
    }
  }
}
