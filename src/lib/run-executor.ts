/**
 * Run execution engine — SSH into the Azure VM and run evaluate.py.
 *
 * This is the core loop that:
 * 1. Starts the VM (if not running)
 * 2. SSH into the VM
 * 3. Auto-pulls the repo (clones if missing) and builds Docker image
 * 4. Runs evaluate.py with decrypted credentials
 * 5. Streams progress back to the database
 * 6. Cleans up and optionally shuts down
 *
 * Called from POST /api/runs when a run is created.
 */

import { exec, spawn } from "child_process";
import { writeFileSync, unlinkSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { prepareRunEnvironment, ENV_REPO_MAP } from "./executor";
import { ENVIRONMENT_REGISTRY } from "@/data/environment-registry";
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

const SSH_TARGET = process.env.AZURE_VM_SSH_TARGET || "azureuser@52.234.26.150";

interface ProgressUpdate {
  completed_tasks: number;
  total_tasks: number;
  current_task?: string;
  current_score?: number;
}

/**
 * Write the SSH private key from env to a temp file for authentication.
 * Returns the path to the key file, or null if AZURE_VM_SSH_KEY is not set.
 */
function writeSshKeyToTempFile(): string | null {
  const sshKey = process.env.AZURE_VM_SSH_KEY;
  if (!sshKey) return null;

  const tmpDir = mkdtempSync(join(tmpdir(), "ssh-"));
  const keyPath = join(tmpDir, "id_rsa");
  writeFileSync(keyPath, sshKey + "\n", { mode: 0o600 });
  return keyPath;
}

/**
 * Build SSH options string, optionally including a private key file.
 */
function buildSshOpts(sshKeyPath: string | null): string {
  const base = "-o StrictHostKeyChecking=no -o ConnectTimeout=30";
  return sshKeyPath ? `${base} -i ${sshKeyPath}` : base;
}

/** Timeout for Docker builds — large images can take 15+ minutes. */
const DOCKER_BUILD_TIMEOUT_MS = 20 * 60 * 1000;

/** Timeout for git clone / pull operations. */
const GIT_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Ensure the environment repo is cloned, up-to-date, and the Docker image
 * is built on the VM before we run evaluate.py.
 *
 * Steps:
 *   1. Clone the repo if it doesn't exist yet.
 *   2. `git pull` to get the latest code.
 *   3. Build the Docker image if it hasn't been built yet.
 */
async function ensureEnvironmentReady(
  envSlug: string,
  repoDir: string,
  sshOpts: string,
): Promise<void> {
  const SSH = `ssh ${sshOpts} ${SSH_TARGET}`;
  const repoPath = `~/athanor-ai-repos/${repoDir}`;
  const imageName = repoDir
    .replace(/_/g, "-")
    .replace(/ /g, "-")
    .toLowerCase();

  // Look up the GitHub repo URL from the registry
  const registryEntry = ENVIRONMENT_REGISTRY.find((e) => e.slug === envSlug);
  const repoUrl = registryEntry
    ? `https://github.com/${registryEntry.repo}.git`
    : null;

  // --- 1. Clone if the repo directory doesn't exist ---
  console.log(`[env-prep] Checking if ${repoPath} exists on VM...`);
  try {
    await execAsync(`${SSH} "test -d ${repoPath}"`, { timeout: 15000 });
    console.log(`[env-prep] Repo directory exists.`);
  } catch {
    // Directory doesn't exist — clone it
    if (!repoUrl) {
      throw new Error(
        `Repo directory ${repoPath} missing and no repo URL found for slug "${envSlug}"`,
      );
    }
    console.log(`[env-prep] Cloning ${repoUrl} into ${repoPath}...`);
    await execAsync(
      `${SSH} "mkdir -p ~/athanor-ai-repos && git clone '${repoUrl}' '${repoPath}'"`,
      { timeout: GIT_TIMEOUT_MS },
    );
    console.log(`[env-prep] Clone complete.`);
  }

  // --- 2. Git pull latest ---
  console.log(`[env-prep] Pulling latest code in ${repoPath}...`);
  try {
    const { stdout: pullOutput } = await execAsync(
      `${SSH} "cd '${repoPath}' && git pull"`,
      { timeout: GIT_TIMEOUT_MS },
    );
    console.log(`[env-prep] Pull result: ${pullOutput.trim().slice(0, 200)}`);
  } catch (pullErr) {
    // Non-fatal: log but continue (repo may still be usable)
    console.error(
      `[env-prep] Warning: git pull failed — continuing with existing code.`,
      pullErr,
    );
  }

  // --- 3. Build Docker image if it doesn't exist ---
  console.log(`[env-prep] Checking for Docker image "${imageName}"...`);
  try {
    await execAsync(
      `${SSH} "docker image inspect '${imageName}' > /dev/null 2>&1"`,
      { timeout: 15000 },
    );
    console.log(`[env-prep] Docker image "${imageName}" already exists.`);
  } catch {
    // Image doesn't exist — build it
    console.log(
      `[env-prep] Docker image not found. Building "${imageName}" from ${repoPath}/Containerfile...`,
    );
    console.log(
      `[env-prep] This may take 10-15 minutes for large images.`,
    );
    try {
      const { stdout: buildOutput } = await execAsync(
        `${SSH} "cd '${repoPath}' && docker build -f Containerfile -t '${imageName}' ."`,
        { timeout: DOCKER_BUILD_TIMEOUT_MS, maxBuffer: 50 * 1024 * 1024 },
      );
      // Log the last few lines of build output
      const lastLines = buildOutput.trim().split("\n").slice(-5).join("\n");
      console.log(`[env-prep] Docker build complete. Last output:\n${lastLines}`);
    } catch (buildErr) {
      const errMsg =
        buildErr instanceof Error ? buildErr.message : String(buildErr);
      throw new Error(
        `Docker build failed for image "${imageName}": ${errMsg.slice(0, 500)}`,
      );
    }
  }

  console.log(
    `[env-prep] Environment "${envSlug}" is ready (repo: ${repoPath}, image: ${imageName}).`,
  );
}

/**
 * Convert a model name to LiteLLM format if needed.
 *
 * evaluate.py expects LiteLLM-style model identifiers such as
 * "anthropic/claude-sonnet-4-6".  If the model name is already prefixed
 * with a provider we leave it alone; otherwise we add the "anthropic/"
 * prefix for Claude models.
 */
function toLiteLLMModelName(modelName: string): string {
  // Already has a provider prefix (e.g. "openai/gpt-4o", "anthropic/…")
  if (modelName.includes("/")) return modelName;

  // Claude models → anthropic/ prefix
  if (modelName.startsWith("claude-")) return `anthropic/${modelName}`;

  // Everything else: pass through as-is (litellm will try to resolve)
  return modelName;
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

  // Write SSH key to temp file for authentication (Vercel serverless pattern)
  const sshKeyPath = writeSshKeyToTempFile();
  const sshOpts = buildSshOpts(sshKeyPath);

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
    await waitForSSH(sshOpts);

    // 4. Prepare credentials and env vars
    const { envVars, run } = await prepareRunEnvironment(runId);
    const envSlug = await getEnvSlug(supabase, run.environment_id as string);
    const repoDir = ENV_REPO_MAP[envSlug];
    if (!repoDir) throw new Error(`Unknown env slug: ${envSlug}`);

    // 5. Ensure repo is cloned, up-to-date, and Docker image is built
    await ensureEnvironmentReady(envSlug, repoDir, sshOpts);

    const modelName = toLiteLLMModelName(run.model_name as string);
    const outputFile = `/tmp/platform-run-${runId}.json`;

    // 6. Build the SSH command
    // Export env vars + run evaluate.py
    const envExports = Object.entries(envVars)
      .map(([k, v]) => `export ${k}='${v.replace(/'/g, "'\\''")}'`)
      .join(" && ");

    const evalCmd = [
      `cd ~/athanor-ai-repos/${repoDir}`,
      envExports,
      `python3 scripts/evaluate.py . --all-tasks --model '${modelName}' --max-time 900 --output '${outputFile}'`,
    ].join(" && ");

    // 7. Execute via SSH and stream output
    await executeSSHWithProgress(
      evalCmd,
      runId,
      supabase,
      sshOpts,
      options.onProgress,
    );

    // 8. Fetch results from the VM
    const { stdout: resultJson } = await execAsync(
      `ssh ${sshOpts} ${SSH_TARGET} "cat '${outputFile}' 2>/dev/null"`,
      { timeout: 30000, maxBuffer: 10 * 1024 * 1024 },
    );

    // 9. Parse and store results
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

    // 10. Calculate mean score and mark complete
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
    // Clean up SSH key temp file
    if (sshKeyPath) {
      try { unlinkSync(sshKeyPath); } catch { /* best-effort cleanup */ }
    }

    // Always cleanup VM
    await cleanupVM(SSH_TARGET, sshOpts);

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

async function waitForSSH(sshOpts: string, maxWaitMs = 120000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      await execAsync(
        `ssh ${sshOpts} ${SSH_TARGET} "echo ready"`,
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
  sshOpts: string,
  onProgress?: (update: ProgressUpdate) => void,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "ssh",
      [
        ...sshOpts.split(" "),
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
