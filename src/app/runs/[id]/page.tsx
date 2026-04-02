"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRun, useRunResults } from "@/hooks/useRuns";
import { useEnvironments } from "@/hooks/useEnvironments";
import { useTasks } from "@/hooks/useTasks";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import type { RunResult } from "@/types/database";

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function computeRunDuration(
  startedAt: string | null,
  completedAt: string | null,
): string {
  if (!startedAt) return "\u2014";
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  return formatDuration(end - start);
}

export default function RunDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const run = useRun(id);
  const results = useRunResults(id);
  const environments = useEnvironments();
  const tasks = useTasks();

  const isPending =
    run.isPending ||
    results.isPending ||
    environments.isPending ||
    tasks.isPending;

  const envMap = useMemo(
    () => new Map((environments.data ?? []).map((e) => [e.id, e.name])),
    [environments.data],
  );

  const taskMap = useMemo(
    () => new Map((tasks.data ?? []).map((t) => [t.id, t.name])),
    [tasks.data],
  );

  if (isPending) {
    return <LoadingState message="Loading run details..." />;
  }

  const runData = run.data;

  if (!runData) {
    return (
      <EmptyState
        title="Run not found"
        description={`No run exists with ID "${id}".`}
        action={
          <Link href="/runs">
            <Button variant="secondary">Back to Runs</Button>
          </Link>
        }
      />
    );
  }

  const resultList = results.data ?? [];
  const shortId = runData.id.slice(0, 8);
  const envName = envMap.get(runData.environment_id) ?? "Unknown";
  const duration = computeRunDuration(
    runData.started_at,
    runData.completed_at,
  );

  const resultColumns: Column<RunResult>[] = [
    {
      key: "task",
      header: "Task",
      render: (r) => (
        <span className="text-xs font-medium text-text-primary">
          {taskMap.get(r.task_id) ?? r.task_id.slice(0, 8)}
        </span>
      ),
    },
    {
      key: "raw_score",
      header: "Raw Score",
      render: (r) => (
        <span className="font-mono text-xs text-text-primary">
          {r.raw_score.toFixed(3)}
        </span>
      ),
    },
    {
      key: "calibrated_score",
      header: "Calibrated Score",
      render: (r) => (
        <span className="font-mono text-xs text-accent">
          {r.calibrated_score.toFixed(3)}
        </span>
      ),
    },
    {
      key: "steps_used",
      header: "Steps Used",
      render: (r) => (
        <span className="font-mono text-xs text-text-secondary">
          {r.steps_used}/{r.max_steps}
        </span>
      ),
    },
    {
      key: "duration",
      header: "Duration",
      render: (r) => (
        <span className="text-xs text-text-secondary">
          {formatDuration(r.duration_ms)}
        </span>
      ),
    },
    {
      key: "error",
      header: "Error",
      className: "max-w-[200px]",
      render: (r) =>
        r.error ? (
          <span className="block truncate text-xs text-error">{r.error}</span>
        ) : (
          <span className="text-xs text-text-tertiary">{"\u2014"}</span>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title={`Run ${shortId}`}
        description={`${runData.model_name} \u00b7 ${envName} \u00b7 ${runData.status}`}
        actions={
          <Link href="/runs">
            <Button variant="ghost" size="sm">
              Back to Runs
            </Button>
          </Link>
        }
      />

      {/* Metric cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <MetricCard label="Status" value={runData.status} />
        <MetricCard label="Model" value={runData.model_name} />
        <MetricCard label="Environment" value={envName} />
        <MetricCard
          label="Mean Score"
          value={
            runData.mean_score !== null
              ? runData.mean_score.toFixed(3)
              : "\u2014"
          }
        />
        <MetricCard
          label="Progress"
          value={`${runData.completed_tasks}/${runData.total_tasks}`}
          subtext={
            runData.total_tasks > 0
              ? `${Math.round((runData.completed_tasks / runData.total_tasks) * 100)}%`
              : undefined
          }
        />
        <MetricCard label="Duration" value={duration} />
      </div>

      {/* Results table */}
      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <span className="text-[11px] text-text-tertiary">
            {resultList.length} result{resultList.length !== 1 ? "s" : ""}
          </span>
        </CardHeader>
        <DataTable
          columns={resultColumns}
          data={resultList}
          emptyMessage="No results recorded for this run yet"
        />
      </Card>
    </>
  );
}
