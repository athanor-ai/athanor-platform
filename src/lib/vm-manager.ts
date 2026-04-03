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
const MAX_VM_UPTIME_MS = 6 * 60 * 60 * 1000; // 6 hours max before forced shutdown

export type VMStatus = "running" | "deallocated" | "starting" | "stopping" | "unknown";

// Track when the VM was started by this process
let vmStartedAt: number | null = null;

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
  if (status === "running") {
    // VM already running — check if it's been up too long
    if (vmStartedAt && Date.now() - vmStartedAt > MAX_VM_UPTIME_MS) {
      console.warn(`VM has been running for ${Math.round((Date.now() - vmStartedAt) / 3600000)}h, forcing shutdown`);
      await stopVM();
      vmStartedAt = null;
      return false;
    }
    return true;
  }

  try {
    console.log(`Starting VM ${VM_NAME}...`);
    await execAsync(
      `az vm start -g ${VM_RESOURCE_GROUP} -n ${VM_NAME}`,
      { timeout: 300000 }, // 5 min timeout for start
    );
    vmStartedAt = Date.now();
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
  if (status === "deallocated") {
    vmStartedAt = null;
    return true;
  }

  try {
    console.log(`Deallocating VM ${VM_NAME}...`);
    await execAsync(
      `az vm deallocate -g ${VM_RESOURCE_GROUP} -n ${VM_NAME}`,
      { timeout: 300000 },
    );
    vmStartedAt = null;
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
 * Safety watchdog: check if VM has been running too long and force-deallocate.
 *
 * Call this from a cron endpoint (e.g. Vercel cron or external ping).
 * If the VM is running but no runs are active in Supabase, it shuts down.
 * If the VM has exceeded MAX_VM_UPTIME_MS, it shuts down regardless.
 *
 * Returns what action was taken.
 */
export async function enforceVMSafetyLimits(): Promise<{
  action: "none" | "shutdown_idle" | "shutdown_timeout";
  reason: string;
}> {
  const status = await getVMStatus();
  if (status !== "running") {
    vmStartedAt = null;
    return { action: "none", reason: `VM is ${status}` };
  }

  // Check uptime via Azure (more reliable than in-memory timer)
  try {
    const { stdout } = await execAsync(
      `az vm get-instance-view -g ${VM_RESOURCE_GROUP} -n ${VM_NAME} --query "instanceView.statuses[1].time" -o tsv`,
      { timeout: 15000 },
    );
    const startTime = new Date(stdout.trim()).getTime();
    const uptimeMs = Date.now() - startTime;
    const uptimeHours = (uptimeMs / 3600000).toFixed(1);

    if (uptimeMs > MAX_VM_UPTIME_MS) {
      console.warn(`VM uptime ${uptimeHours}h exceeds limit, forcing deallocate`);
      await cleanupVM();
      await stopVM();
      return { action: "shutdown_timeout", reason: `Uptime ${uptimeHours}h exceeded ${MAX_VM_UPTIME_MS / 3600000}h limit` };
    }
  } catch {
    // Can't determine uptime — fall through to idle check
  }

  // Check if any runs are actually active
  // This requires Supabase, so we use a simple SSH check instead:
  // if no evaluate.py or dryrun processes are running, the VM is idle
  const sshTarget = process.env.AZURE_VM_SSH_TARGET;
  if (sshTarget) {
    try {
      const { stdout } = await execAsync(
        `ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${sshTarget} "pgrep -f 'evaluate.py|dryrun' | wc -l"`,
        { timeout: 15000 },
      );
      const procs = parseInt(stdout.trim()) || 0;
      if (procs === 0) {
        console.log("VM is idle (no evaluation processes), deallocating");
        await cleanupVM(sshTarget);
        await stopVM();
        return { action: "shutdown_idle", reason: "No active evaluation processes" };
      }
    } catch {
      // SSH failed — VM might be starting up, don't kill it
    }
  }

  return { action: "none", reason: "VM is running with active processes" };
}

