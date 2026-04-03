"use client";

import { useMemo } from "react";
import { useBaselines } from "@/hooks/useBaselines";
import { useEnvironments } from "@/hooks/useEnvironments";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { Card } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState } from "@/components/ui/LoadingState";
import type { BaselineRun } from "@/types/database";

export default function BaselinesPage() {
  const baselines = useBaselines();
  const environments = useEnvironments();

  const isPending = baselines.isPending || environments.isPending;

  const envMap = useMemo(
    () => new Map((environments.data ?? []).map((e) => [e.id, e.name])),
    [environments.data],
  );

  const baselineList = useMemo(
    () => baselines.data ?? [],
    [baselines.data],
  );

  const totalBaselines = baselineList.length;

  const modelsTested = useMemo(
    () => new Set(baselineList.map((b) => b.model_name)).size,
    [baselineList],
  );

  const environmentsCovered = useMemo(
    () => new Set(baselineList.map((b) => b.environment_id)).size,
    [baselineList],
  );

  const bestScore = useMemo(() => {
    const scores = baselineList
      .map((b) => b.mean_score)
      .filter((s): s is number => s !== null);
    return scores.length > 0 ? Math.max(...scores) : null;
  }, [baselineList]);

  const columns: Column<BaselineRun>[] = [
    {
      key: "label",
      header: "Label",
      render: (b) => (
        <span className="text-xs font-medium text-text-primary">
          {b.label}
        </span>
      ),
    },
    {
      key: "model",
      header: "Model",
      render: (b) => (
        <span className="text-xs font-medium text-accent">
          {b.model_name}
        </span>
      ),
    },
    {
      key: "environment",
      header: "Environment",
      render: (b) => (
        <span className="text-xs text-text-secondary">
          {envMap.get(b.environment_id) ?? "Unknown"}
        </span>
      ),
    },
    {
      key: "mean_score",
      header: "Mean Score",
      render: (b) => (
        <span className="font-mono text-xs text-text-primary">
          {b.mean_score !== null ? b.mean_score.toFixed(3) : "\u2014"}
        </span>
      ),
    },
    {
      key: "median_score",
      header: "Median Score",
      render: (b) => (
        <span className="font-mono text-xs text-text-primary">
          {b.median_score !== null ? b.median_score.toFixed(3) : "\u2014"}
        </span>
      ),
    },
  ];

  if (isPending) {
    return (
      <>
        <PageHeader
          title="Baselines"
          description="Reference baselines for comparing agent performance across your environments"
        />
        <LoadingState message="Loading baselines..." />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Baselines"
        description="Model performance baselines across all environments"
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Total Baselines" value={totalBaselines} />
        <MetricCard label="Models Tested" value={modelsTested} />
        <MetricCard label="Environments Covered" value={environmentsCovered} />
        <MetricCard
          label="Best Score"
          value={bestScore !== null ? bestScore.toFixed(3) : "\u2014"}
        />
      </div>

      <Card>
        <DataTable
          columns={columns}
          data={baselineList}
          emptyMessage="No baselines recorded yet"
        />
      </Card>
    </>
  );
}
