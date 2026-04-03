/**
 * Run execution engine — SSH into the Azure VM and run evaluate.py.
 *
 * This is the core loop that:
 * 1. Starts the VM (if not running)
 * 2. SSH into the VM
 * 3. Runs evaluate.py with decrypted credentials
 * 4. Streams progress back to the database
 * 5. Cleans up and optionally shuts down
 *
 * Called from POST /api/runs when a run is created.
 */

import { exec, spawn } from "child_process";
import { promisify } from "util";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { prepareRunEnvironment, ENV_REPO_MAP } from "./executor";
import { startVM, stopVM, cleanupVM } from "./vm-manager";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

const execAsync = promisify(exec);

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const SSH_TARGET = process.env.AZURE_VM_SSH_TARGET || "azureuser@20.245.2.136";
const SSH_OPTS = "-o StrictHostKeyChecking=no -o ConnectTimeout=30";

interface ProgressUpdate {
  completed_tasks: number;
  total_tasks: number;
  current_task?: string;
  current_score?: number;
}

/**
 * Execute a run end-to-end on the Azure VM.
 *
 * This is a long-running async function (~30-120 min per run).
 * It updates the run record in Supabase as tasks complete.
 */
export async function executeRun(
  runId: string,
  options: {
    autoShutdown?: boolean;
    onProgress?: (update: ProgressUpdate) => void;
  } = {},
): Promise<void> {
  const supabase = getServiceClient();
  const autoShutdown = options.autoShutdown ?? true;

  try {
    // 1. Mark run as starting
    await supabase
      .from("runs")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", runId);

    // 2. Start VM
    const vmStarted = await startVM();
    if (!vmStarted) {
      await supabase
        .from("runs")
        .update({ status: "failed", completed_at: new Date().toISOString() })
        .eq("id", runId);
      return;
    }

    // 3. Wait for SSH to be ready (up to 2 min)
    await waitForSSH();

    // 4. Prepare credentials and env vars
    const { envVars, run } = await prepareRunEnvironment(runId);
    const envSlug = await getEnvSlug(supabase, run.environment_id as string);
    const repoDir = ENV_REPO_MAP[envSlug];
    if (!repoDir) throw new Error(`Unknown env slug: ${envSlug}`);

    const modelName = run.model_name as string;
    const outputFile = `/tmp/platform-run-${runId}.json`;

    // 5. Build the SSH command
    // Export env vars + run evaluate.py
    const envExports = Object.entries(envVars)
      .map(([k, v]) => `export ${k}='${v.replace(/'/g, "'\\''")}'`)
      .join(" && ");

    const evalCmd = [
      `cd ~/${repoDir}`,
      envExports,
      `python3 scripts/evaluate.py . --all-tasks --model '${modelName}' --max-time 900 --output '${outputFile}'`,
    ].join(" && ");

    // 6. Execute via SSH and stream output
    await executeSSHWithProgress(
      evalCmd,
      runId,
      supabase,
      options.onProgress,
    );

    // 7. Fetch results from the VM
    const { stdout: resultJson } = await execAsync(
      `ssh ${SSH_OPTS} ${SSH_TARGET} "cat '${outputFile}' 2>/dev/null"`,
      { timeout: 30000, maxBuffer: 10 * 1024 * 1024 },
    );

    // 8. Parse and store results
    const results = JSON.parse(resultJson);
    const taskResults = (results.results || []).map((r: Record<string, unknown>) => ({
      run_id: runId,
      task_id: r.task,
      raw_score: r.score ?? 0,
      steps_used: r.tool_calls_total ?? 0,
      duration_ms: ((r.time_seconds as number) || 0) * 1000,
      trajectory: r.tool_calls_summary || [],
      error: (r.errors as string[])?.join("; ") || null,
    }));

    if (taskResults.length > 0) {
      await supabase.from("run_results").upsert(taskResults);
    }

    // 9. Calculate mean score and mark complete
    const scores = taskResults
      .map((r: { raw_score: number }) => r.raw_score)
      .filter((s: number) => s !== null);
    const meanScore = scores.length > 0
      ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length
      : 0;

    await supabase.from("runs").update({
      status: "completed",
      completed_tasks: taskResults.length,
      mean_score: meanScore,
      completed_at: new Date().toISOString(),
    }).eq("id", runId);

  } catch (e) {
    // Mark as failed
    await supabase.from("runs").update({
      status: "failed",
      completed_at: new Date().toISOString(),
    }).eq("id", runId);
    console.error(`Run ${runId} failed:`, e);
  } finally {
    // Always cleanup
    await cleanupVM(SSH_TARGET);

    // Check if any other runs are pending before shutting down
    if (autoShutdown) {
      const { data: pendingRuns } = await supabase
        .from("runs")
        .select("id")
        .in("status", ["pending", "running"])
        .limit(1);

      if (!pendingRuns || pendingRuns.length === 0) {
        await stopVM();
      }
    }
  }
}

async function waitForSSH(maxWaitMs = 120000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      await execAsync(
        `ssh ${SSH_OPTS} ${SSH_TARGET} "echo ready"`,
        { timeout: 10000 },
      );
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  throw new Error("SSH connection timeout");
}

async function getEnvSlug(
  supabase: AnySupabaseClient,
  environmentId: string,
): Promise<string> {
  const { data } = await supabase
    .from("environments")
    .select("slug")
    .eq("id", environmentId)
    .single();
  return data?.slug || "";
}

async function executeSSHWithProgress(
  command: string,
  runId: string,
  supabase: AnySupabaseClient,
  onProgress?: (update: ProgressUpdate) => void,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "ssh",
      [
        ...SSH_OPTS.split(" "),
        SSH_TARGET,
        command,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    let completed = 0;
    let lastUpdate = 0;

    const updateInterval = setInterval(async () => {
      // Throttle DB updates to every 10s
      if (Date.now() - lastUpdate > 10000 && completed > 0) {
        lastUpdate = Date.now();
        await supabase.from("runs").update({ completed_tasks: completed }).eq("id", runId);
      }
    }, 10000);

    proc.stdout?.on("data", (data: Buffer) => {
      const line = data.toString();
      // Parse dryrun output: "--- Finished Task N/M: task_name ---"
      const match = line.match(/Finished Task (\d+)\/(\d+): (.+) ---/);
      if (match) {
        completed = parseInt(match[1]);
        const total = parseInt(match[2]);
        onProgress?.({ completed_tasks: completed, total_tasks: total, current_task: match[3] });
      }
      // Parse score lines
      const scoreMatch = line.match(/Score: ([\d.]+)/);
      if (scoreMatch) {
        onProgress?.({ completed_tasks: completed, total_tasks: 0, current_score: parseFloat(scoreMatch[1]) });
      }
    });

    proc.stderr?.on("data", (data: Buffer) => {
      // Log but don't fail on stderr (litellm prints warnings there)
      const text = data.toString().trim();
      if (text && !text.includes("Provider List") && !text.includes("vertex")) {
        console.error(`[run ${runId}] stderr: ${text.slice(0, 200)}`);
      }
    });

    proc.on("close", (code) => {
      clearInterval(updateInterval);
      if (code === 0) resolve(completed);
      else reject(new Error(`SSH process exited with code ${code}`));
    });

    proc.on("error", (err) => {
      clearInterval(updateInterval);
      reject(err);
    });

    // Safety timeout: 4 hours max
    setTimeout(() => {
      proc.kill("SIGTERM");
      clearInterval(updateInterval);
      reject(new Error("Run exceeded 4-hour maximum"));
    }, 4 * 60 * 60 * 1000);
  });
}
