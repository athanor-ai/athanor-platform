/** Centralized TanStack Query key factory */

export const queryKeys = {
  organizations: {
    all: ["organizations"] as const,
    detail: (id: string) => ["organizations", id] as const,
  },
  environments: {
    all: ["environments"] as const,
    list: (filters?: Record<string, unknown>) =>
      ["environments", "list", filters] as const,
    detail: (id: string) => ["environments", id] as const,
    versions: (envId: string) => ["environments", envId, "versions"] as const,
  },
  tasks: {
    all: ["tasks"] as const,
    list: (filters?: Record<string, unknown>) =>
      ["tasks", "list", filters] as const,
    detail: (id: string) => ["tasks", id] as const,
    byEnvironment: (envId: string) => ["tasks", "environment", envId] as const,
  },
  runs: {
    all: ["runs"] as const,
    list: (filters?: Record<string, unknown>) =>
      ["runs", "list", filters] as const,
    detail: (id: string) => ["runs", id] as const,
    results: (runId: string) => ["runs", runId, "results"] as const,
  },
  calibration: {
    all: ["calibration"] as const,
    profiles: ["calibration", "profiles"] as const,
    detail: (id: string) => ["calibration", id] as const,
  },
  baselines: {
    all: ["baselines"] as const,
    list: (filters?: Record<string, unknown>) =>
      ["baselines", "list", filters] as const,
    detail: (id: string) => ["baselines", id] as const,
    results: (baselineId: string) =>
      ["baselines", baselineId, "results"] as const,
  },
  credentials: {
    all: ["credentials"] as const,
    byProvider: (provider: string) =>
      ["credentials", "provider", provider] as const,
  },
  docs: {
    all: ["docs"] as const,
    page: (slug: string) => ["docs", slug] as const,
  },
  vm: ["vm", "status"] as const,
} as const;
