"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCredentials } from "@/hooks/useCredentials";
import { useEnvironments } from "@/hooks/useEnvironments";
import { useTasks } from "@/hooks/useTasks";
import { useLaunchRun } from "@/hooks/useLaunchRun";
import { useVMStatus } from "@/hooks/useVM";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ATHANOR_MODELS, BASELINE_MODELS, isModelUsable } from "@/data/models";
import { PROVIDER_BY_KEY } from "@/data/providers";
import type { CredentialProvider } from "@/types/database";
import type { AthanorModel } from "@/data/models";

/* ------------------------------------------------------------------ */
/*  Launch button with VM lifecycle                                    */
/* ------------------------------------------------------------------ */

function LaunchButton({
  canLaunch,
  selectedEnvironment,
  selectedModels,
}: {
  canLaunch: boolean;
  selectedEnvironment: string | null;
  selectedModels: AthanorModel[];
}) {
  const router = useRouter();
  const launch = useLaunchRun();
  const vm = useVMStatus();
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLaunch = async () => {
    if (!selectedEnvironment || selectedModels.length === 0) return;
    setLaunching(true);
    setError(null);

    try {
      // Launch one run per model
      for (const model of selectedModels) {
        const result = await launch.mutateAsync({
          environment_id: selectedEnvironment,
          model_name: model.slug,
          autoShutdown: true,
        });
        // Navigate to runs page after first successful launch
        if (result.run_id) {
          router.push(`/runs/${result.run_id}`);
          return;
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Launch failed");
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        variant="primary"
        size="sm"
        disabled={!canLaunch || launching}
        onClick={handleLaunch}
      >
        {launching ? "Starting evaluation server..." : "Launch Evaluation"}
      </Button>
      {vm.data && (
        <p className="text-[11px] text-text-tertiary">
          Server: {vm.data.status === "running" ? "ready" : vm.data.status}
          {vm.data.status === "deallocated" && " (will start automatically)"}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step indicator                                                     */
/* ------------------------------------------------------------------ */

function StepIndicator({
  step,
  label,
  isActive,
  isComplete,
}: {
  step: number;
  label: string;
  isActive: boolean;
  isComplete: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
          isComplete
            ? "bg-success text-background"
            : isActive
              ? "bg-accent text-background"
              : "bg-surface-overlay text-text-tertiary"
        }`}
      >
        {isComplete ? (
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          step
        )}
      </div>
      <span
        className={`text-xs font-medium ${
          isActive ? "text-text-primary" : "text-text-tertiary"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Model card for selection                                           */
/* ------------------------------------------------------------------ */

function ModelCard({
  model,
  isUsable,
  isSelected,
  onToggle,
  activeProviders,
}: {
  model: AthanorModel;
  isUsable: boolean;
  isSelected: boolean;
  onToggle: () => void;
  activeProviders: Set<CredentialProvider>;
}) {
  const providerConfig = PROVIDER_BY_KEY.get(model.provider);
  const providerName = providerConfig?.name ?? model.provider;

  // Determine which credential actually covers this model
  const coveredBy = activeProviders.has(model.provider)
    ? model.provider
    : (model.compatibleProviders ?? []).find((p) => activeProviders.has(p));

  const coveringProviderName = coveredBy
    ? (PROVIDER_BY_KEY.get(coveredBy)?.name ?? coveredBy)
    : null;

  return (
    <button
      type="button"
      className={`w-full cursor-pointer rounded-md border p-3 text-left transition-all ${
        isSelected
          ? "border-accent bg-accent-subtle"
          : isUsable
            ? "border-border bg-surface-raised hover:border-accent/30"
            : "border-border bg-surface opacity-50"
      }`}
      onClick={isUsable ? onToggle : undefined}
      disabled={!isUsable}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">
            {model.displayName}
          </span>
          {model.isBaseline && (
            <StatusBadge status="Baseline" variant="accent" />
          )}
        </div>
        {isSelected && (
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-accent">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
              <path d="M13.5 4.5L6 12L2.5 8.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-[11px] text-text-tertiary">
          {providerName}
        </span>
        {isUsable && coveringProviderName && coveredBy !== model.provider && (
          <span className="text-[10px] text-info">
            via {coveringProviderName}
          </span>
        )}
        {!isUsable && (
          <span className="text-[10px] text-error">
            No credential configured
          </span>
        )}
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Environment selector                                               */
/* ------------------------------------------------------------------ */

function EnvironmentSelector({
  environments,
  selectedId,
  onSelect,
  taskCounts,
}: {
  environments: { id: string; name: string; slug: string; description: string }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  taskCounts: Map<string, number>;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {environments.map((env) => {
        const isSelected = selectedId === env.id;
        const count = taskCounts.get(env.id) ?? 0;
        return (
          <button
            key={env.id}
            type="button"
            className={`cursor-pointer rounded-md border p-3 text-left transition-all ${
              isSelected
                ? "border-accent bg-accent-subtle"
                : "border-border bg-surface-raised hover:border-accent/30"
            }`}
            onClick={() => onSelect(env.id)}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary">{env.name}</span>
              {isSelected && (
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-accent">
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                    <path d="M13.5 4.5L6 12L2.5 8.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
            <p className="mt-1 line-clamp-2 text-[11px] text-text-tertiary">
              {env.description}
            </p>
            <div className="mt-2">
              <span className="text-[10px] font-medium text-text-secondary">
                {count} tasks
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Credential readiness summary                                       */
/* ------------------------------------------------------------------ */

function CredentialReadiness({
  activeProviders,
  selectedModels,
}: {
  activeProviders: Set<CredentialProvider>;
  selectedModels: AthanorModel[];
}) {
  const allCovered = selectedModels.every((m) =>
    isModelUsable(m, activeProviders),
  );

  if (selectedModels.length === 0) {
    return (
      <div className="rounded-md border border-border bg-surface-overlay px-4 py-3">
        <p className="text-xs text-text-tertiary">
          Select at least one model to see credential readiness.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {selectedModels.map((model) => {
        const usable = isModelUsable(model, activeProviders);
        const coveredBy = activeProviders.has(model.provider)
          ? model.provider
          : (model.compatibleProviders ?? []).find((p) => activeProviders.has(p));

        return (
          <div
            key={model.slug}
            className="flex items-center justify-between rounded-md border border-border bg-surface-raised px-3 py-2"
          >
            <span className="text-xs text-text-primary">{model.displayName}</span>
            {usable ? (
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                <span className="text-[10px] text-success">
                  {coveredBy
                    ? `via ${PROVIDER_BY_KEY.get(coveredBy)?.name ?? coveredBy}`
                    : "Ready"}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-error" />
                <span className="text-[10px] text-error">Missing credential</span>
              </div>
            )}
          </div>
        );
      })}
      <div className="mt-2 rounded-md border border-border px-3 py-2">
        {allCovered ? (
          <p className="text-xs text-success">
            All selected models have valid credential coverage.
          </p>
        ) : (
          <p className="text-xs text-warning">
            Some models are missing credentials.{" "}
            <Link href="/credentials" className="text-accent underline">
              Configure credentials
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

type LaunchStep = "environment" | "models" | "review";

export default function LaunchPage() {
  const credentials = useCredentials();
  const environments = useEnvironments();
  const allTasks = useTasks();

  const [currentStep, setCurrentStep] = useState<LaunchStep>("environment");
  const [selectedEnvironment, setSelectedEnvironment] = useState<string | null>(null);
  const [selectedModelSlugs, setSelectedModelSlugs] = useState<Set<string>>(new Set());

  const isPending = credentials.isPending || environments.isPending || allTasks.isPending;

  // Active credential providers
  const activeProviders = useMemo(() => {
    const creds = credentials.data ?? [];
    return new Set(creds.filter((c) => c.is_active).map((c) => c.provider));
  }, [credentials.data]);

  // Task counts by environment
  const taskCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const task of allTasks.data ?? []) {
      counts.set(task.environment_id, (counts.get(task.environment_id) ?? 0) + 1);
    }
    return counts;
  }, [allTasks.data]);

  // Tasks for selected environment
  const environmentTasks = useMemo(() => {
    if (!selectedEnvironment) return [];
    return (allTasks.data ?? []).filter((t) => t.environment_id === selectedEnvironment);
  }, [allTasks.data, selectedEnvironment]);

  // Selected models as objects
  const selectedModels = useMemo(
    () => ATHANOR_MODELS.filter((m) => selectedModelSlugs.has(m.slug)),
    [selectedModelSlugs],
  );

  // Selected environment object
  const selectedEnvObj = useMemo(
    () => (environments.data ?? []).find((e) => e.id === selectedEnvironment),
    [environments.data, selectedEnvironment],
  );

  const allModelsHaveCredentials = selectedModels.every((m) =>
    isModelUsable(m, activeProviders),
  );

  const canProceedFromEnvironment = selectedEnvironment !== null;
  const canProceedFromModels = selectedModels.length > 0;
  const canLaunch = canProceedFromEnvironment && canProceedFromModels && allModelsHaveCredentials;

  const handleToggleModel = (slug: string) => {
    setSelectedModelSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  };

  const handleSelectAllBaseline = () => {
    const baselineSlugs = BASELINE_MODELS.map((m) => m.slug);
    setSelectedModelSlugs(new Set(baselineSlugs));
  };

  if (isPending) {
    return (
      <>
        <PageHeader
          title="Launch Evaluation Run"
          description="Configure and launch a new evaluation run against an Athanor environment"
        />
        <LoadingState message="Loading configuration..." />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Launch Evaluation Run"
        description="Configure and launch a new evaluation run against an Athanor environment"
      />

      {/* Step indicators */}
      <div className="mb-6 flex items-center gap-6">
        <StepIndicator
          step={1}
          label="Environment"
          isActive={currentStep === "environment"}
          isComplete={currentStep !== "environment" && canProceedFromEnvironment}
        />
        <div className="h-px flex-1 bg-border" />
        <StepIndicator
          step={2}
          label="Models"
          isActive={currentStep === "models"}
          isComplete={currentStep === "review" && canProceedFromModels}
        />
        <div className="h-px flex-1 bg-border" />
        <StepIndicator
          step={3}
          label="Review & Launch"
          isActive={currentStep === "review"}
          isComplete={false}
        />
      </div>

      {/* Step 1: Environment Selection */}
      {currentStep === "environment" && (
        <div className="space-y-4">
          <Card padding="lg">
            <CardHeader>
              <CardTitle>Select Environment</CardTitle>
            </CardHeader>
            <p className="mb-4 text-xs text-text-secondary">
              Choose an Athanor environment to run your evaluation against. Each environment
              contains a curated set of tasks targeting a specific domain.
            </p>
            <EnvironmentSelector
              environments={environments.data ?? []}
              selectedId={selectedEnvironment}
              onSelect={setSelectedEnvironment}
              taskCounts={taskCounts}
            />
          </Card>

          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              disabled={!canProceedFromEnvironment}
              onClick={() => setCurrentStep("models")}
            >
              Continue to Model Selection
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Model Selection */}
      {currentStep === "models" && (
        <div className="space-y-4">
          <Card padding="lg">
            <CardHeader>
              <div>
                <CardTitle>Select Models</CardTitle>
                <p className="mt-1 text-xs text-text-secondary">
                  Running against:{" "}
                  <span className="font-medium text-accent">
                    {selectedEnvObj?.name ?? "Unknown"}
                  </span>
                  {" "}({environmentTasks.length} tasks)
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={handleSelectAllBaseline}>
                Select All Baseline
              </Button>
            </CardHeader>

            <div className="mb-4 flex items-center gap-2">
              <span className="text-[11px] text-text-tertiary">
                {selectedModels.length} model{selectedModels.length !== 1 ? "s" : ""} selected
              </span>
              {selectedModels.length > 0 && (
                <button
                  type="button"
                  className="cursor-pointer text-[11px] text-text-tertiary underline hover:text-text-secondary"
                  onClick={() => setSelectedModelSlugs(new Set())}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Baseline models */}
            <div className="mb-4">
              <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                Baseline Models
              </h3>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                {BASELINE_MODELS.map((model) => (
                  <ModelCard
                    key={model.slug}
                    model={model}
                    isUsable={isModelUsable(model, activeProviders)}
                    isSelected={selectedModelSlugs.has(model.slug)}
                    onToggle={() => handleToggleModel(model.slug)}
                    activeProviders={activeProviders}
                  />
                ))}
              </div>
            </div>

            {/* Extended models */}
            <div>
              <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                Extended Models
              </h3>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                {ATHANOR_MODELS.filter((m) => !m.isBaseline).map((model) => (
                  <ModelCard
                    key={model.slug}
                    model={model}
                    isUsable={isModelUsable(model, activeProviders)}
                    isSelected={selectedModelSlugs.has(model.slug)}
                    onToggle={() => handleToggleModel(model.slug)}
                    activeProviders={activeProviders}
                  />
                ))}
              </div>
            </div>
          </Card>

          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setCurrentStep("environment")}>
              Back
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!canProceedFromModels}
              onClick={() => setCurrentStep("review")}
            >
              Continue to Review
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Launch */}
      {currentStep === "review" && (
        <div className="space-y-4">
          {/* Summary */}
          <Card padding="lg">
            <CardHeader>
              <CardTitle>Run Configuration Summary</CardTitle>
            </CardHeader>

            <div className="space-y-4">
              {/* Environment summary */}
              <div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                  Environment
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">
                    {selectedEnvObj?.name ?? "Unknown"}
                  </span>
                  <StatusBadge status="active" />
                  <span className="text-xs text-text-tertiary">
                    {environmentTasks.length} tasks
                  </span>
                </div>
              </div>

              {/* Model summary */}
              <div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                  Models ({selectedModels.length})
                </span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {selectedModels.map((m) => (
                    <span
                      key={m.slug}
                      className="inline-flex items-center gap-1 rounded-sm border border-border bg-surface-overlay px-2 py-1 text-xs text-text-primary"
                    >
                      {m.displayName}
                      {m.isBaseline && (
                        <span className="text-[9px] text-accent">BL</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              {/* Task preview */}
              <div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                  Task Preview (first 5)
                </span>
                <div className="mt-1 space-y-1">
                  {environmentTasks.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between rounded-md bg-surface-overlay px-3 py-1.5"
                    >
                      <span className="text-xs text-text-primary">{task.name}</span>
                      <StatusBadge status={task.difficulty} />
                    </div>
                  ))}
                  {environmentTasks.length > 5 && (
                    <p className="px-3 text-[10px] text-text-tertiary">
                      + {environmentTasks.length - 5} more tasks
                    </p>
                  )}
                </div>
              </div>

              {/* Estimated run scope */}
              <div className="rounded-md border border-border bg-surface px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-secondary">Total evaluations</span>
                  <span className="font-mono text-sm font-medium text-accent">
                    {selectedModels.length * environmentTasks.length}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-text-tertiary">
                  {selectedModels.length} model{selectedModels.length !== 1 ? "s" : ""} &times;{" "}
                  {environmentTasks.length} tasks
                </p>
              </div>
            </div>
          </Card>

          {/* Credential readiness */}
          <Card padding="lg">
            <CardHeader>
              <CardTitle>Credential Readiness</CardTitle>
            </CardHeader>
            <CredentialReadiness
              activeProviders={activeProviders}
              selectedModels={selectedModels}
            />
          </Card>

          {/* Launch area */}
          <Card padding="lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-text-primary">
                  Ready to Launch
                </h3>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  {canLaunch
                    ? "All prerequisites are met. Backend execution pipeline is pending integration."
                    : "Resolve missing credentials before launching."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentStep("models")}
                >
                  Back
                </Button>
                <LaunchButton
                  canLaunch={canLaunch}
                  selectedEnvironment={selectedEnvironment}
                  selectedModels={selectedModels}
                />
              </div>
            </div>
          </Card>

          {/* Quick links */}
          <div className="flex items-center gap-3">
            <Link href="/credentials">
              <Button variant="secondary" size="sm">
                Manage Credentials
              </Button>
            </Link>
            <Link href="/runs">
              <Button variant="ghost" size="sm">
                View Existing Runs
              </Button>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
