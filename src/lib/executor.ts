/**
 * Execution backend — server-side only.
 *
 * Handles credential decryption and environment variable injection
 * for evaluation runs. The actual execution (subprocess, queue, etc.)
 * depends on infrastructure choices made during deployment.
 *
 * Usage from an API route or Server Action:
 *   const envVars = await prepareRunEnvironment(runId);
 *   // Pass envVars to dryrun.py or evaluate.py
 */

import { createClient } from "@supabase/supabase-js";
import { decryptKey } from "@/lib/encryption";
import { buildRunEnvVars } from "@/lib/platform-credentials";
import { ENV_REPO_MAP } from "@/data/environment-registry";

/**
 * Re-export ENV_REPO_MAP so existing consumers can keep importing from here.
 */
export { ENV_REPO_MAP } from "@/data/environment-registry";

/**
 * Service-role Supabase client for executor operations.
 * Bypasses RLS — only use server-side.
 */
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SERVICE_ROLE_KEY");
  }
  return createClient(url, key);
}

/**
 * Prepare environment variables for a run execution.
 *
 * 1. Fetches the run record to get organization_id and model
 * 2. Fetches all active credentials for the organization
 * 3. Decrypts each credential
 * 4. Merges with platform keys (customer keys take priority)
 *
 * Returns a Record<string, string> ready to inject into subprocess env.
 */
export async function prepareRunEnvironment(
  runId: string,
): Promise<{ envVars: Record<string, string>; run: Record<string, unknown> }> {
  const supabase = getServiceClient();

  // Fetch run
  const { data: run, error: runError } = await supabase
    .from("runs")
    .select("*")
    .eq("id", runId)
    .single();

  if (runError || !run) {
    throw new Error(`Run not found: ${runId}`);
  }

  // Fetch org's active credentials (including encrypted_key — service role bypasses RLS column filtering)
  const { data: credentials, error: credError } = await supabase
    .from("credentials")
    .select("*")
    .eq("organization_id", run.organization_id)
    .eq("is_active", true);

  if (credError) {
    throw new Error(`Failed to fetch credentials: ${credError.message}`);
  }

  // Decrypt each credential
  const decrypted = (credentials || []).map((c) => ({
    provider: c.provider as string,
    decryptedKey: decryptKey(c.encrypted_key),
    baseUrl: c.base_url as string | null,
  }));

  // Build environment variables (platform keys + customer keys)
  const envVars = buildRunEnvVars(decrypted);

  return { envVars, run };
}

/**
 * Get the evaluate.py command for an environment.
 *
 * When `taskSlugs` is provided, uses `--tasks slug1,slug2,...` instead of
 * `--all-tasks`. This allows running a subset of tasks in the environment.
 *
 * Example:
 *   const cmd = getEvaluateCommand("lean-theorem-proving", "claude-sonnet-4-6", "/output/run.json");
 *   // ["python3", "scripts/evaluate.py", ".", "--all-tasks", "--model", "claude-sonnet-4-6", ...]
 */
export function getEvaluateCommand(
  envSlug: string,
  modelSlug: string,
  outputPath: string,
  taskSlugs?: string[],
): string[] {
  const repoDir = ENV_REPO_MAP[envSlug];
  if (!repoDir) throw new Error(`Unknown environment: ${envSlug}`);

  const tasksArgs =
    Array.isArray(taskSlugs) && taskSlugs.length > 0
      ? ["--tasks", taskSlugs.join(",")]
      : ["--all-tasks"];

  return [
    "python3",
    "scripts/evaluate.py",
    ".",
    ...tasksArgs,
    "--model",
    modelSlug,
    "--max-time",
    "900",
    "--output",
    outputPath,
  ];
}
