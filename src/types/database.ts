/** Core database types matching supabase/migrations schema */

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "pro" | "enterprise";
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  organization_id: string;
  email: string;
  display_name: string;
  role: "owner" | "admin" | "member";
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Environment {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string;
  engine: string;
  status: "active" | "archived" | "draft";
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface EnvironmentVersion {
  id: string;
  environment_id: string;
  version_tag: string;
  changelog: string;
  docker_image: string;
  status: "draft" | "published" | "deprecated";
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  environment_id: string;
  name: string;
  slug: string;
  description: string;
  difficulty: "trivial" | "easy" | "medium" | "hard" | "expert";
  category: string;
  max_steps: number;
  reward_range: { min: number; max: number } | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CalibrationProfile {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  sigmoid_center: number;
  sigmoid_steepness: number;
  time_weight: number;
  step_penalty: number;
  config: Record<string, unknown>;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Run {
  id: string;
  organization_id: string;
  environment_id: string;
  calibration_profile_id: string | null;
  model_name: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  started_at: string | null;
  completed_at: string | null;
  total_tasks: number;
  completed_tasks: number;
  mean_score: number | null;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RunResult {
  id: string;
  run_id: string;
  task_id: string;
  raw_score: number;
  calibrated_score: number;
  steps_used: number;
  max_steps: number;
  duration_ms: number;
  trajectory: unknown[];
  error: string | null;
  created_at: string;
}

export interface BaselineRun {
  id: string;
  organization_id: string;
  environment_id: string;
  model_name: string;
  label: string;
  status: "pending" | "running" | "completed" | "failed";
  mean_score: number | null;
  median_score: number | null;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface BaselineTaskResult {
  id: string;
  baseline_run_id: string;
  task_id: string;
  score: number;
  steps_used: number;
  duration_ms: number;
  created_at: string;
}

/**
 * Supported credential provider identifiers.
 *
 * "Direct" providers (Anthropic, Google, Mistral, Moonshot) use a single
 * API key. "Proxy / compatible" providers (OpenAI, LiteLLM, Azure, Bedrock)
 * require both an API key and a base URL so the backend can route requests
 * through the correct endpoint.
 */
export type CredentialProvider =
  | "anthropic"
  | "google"
  | "mistral"
  | "moonshot"
  | "openai"
  | "litellm"
  | "azure"
  | "bedrock";

export interface Credential {
  id: string;
  organization_id: string;
  provider: CredentialProvider;
  label: string;
  encrypted_key: string;
  /** Base URL for OpenAI-compatible, LiteLLM, Azure, or Bedrock endpoints. */
  base_url: string | null;
  is_active: boolean;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocsPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  category: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PackageArtifact {
  id: string;
  environment_id: string;
  version_id: string;
  artifact_type: string;
  storage_path: string;
  size_bytes: number;
  checksum: string;
  created_at: string;
}

export interface OrganizationEnvironment {
  id: string;
  organization_id: string;
  environment_id: string;
  access_level: "full" | "readonly" | "restricted";
  granted_at: string;
  created_at: string;
}
