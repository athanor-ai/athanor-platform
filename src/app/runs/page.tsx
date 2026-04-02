"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRuns } from "@/hooks/useRuns";
import { useEnvironments } from "@/hooks/useEnvironments";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Run } from "@/types/database";

export default function RunsPage() {
  const router = useRouter();
  const runs = useRuns();
  const environments = useEnvironments();

  const isPending = runs.isPending || environments.isPending;

  const envMap = useMemo(
    () => new Map((environments.data ?? []).map((e) => [e.id, e.name])),
    [environments.data],
  );

  const sortedRuns = useMemo(
    () =>
      [...(runs.data ?? [])].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [runs.data],
  );

  const runColumns: Column<Run>[] = [
    {
      key: "id",
      header: "ID",
      render: (run) => (
        <span className="font-mono text-xs text-text-secondary">
          {run.id.slice(0, 8)}
        </span>
      ),
    },
    {
      key: "model",
      header: "Model",
      render: (run) => (
        <span className="text-xs font-medium text-accent">
          {run.model_name}
        </span>
      ),
    },
    {
      key: "environment",
      header: "Environment",
      render: (run) => (
        <span className="text-xs text-text-secondary">
          {envMap.get(run.environment_id) ?? "Unknown"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (run) => <StatusBadge status={run.status} />,
    },
    {
      key: "progress",
      header: "Progress",
      render: (run) => {
        const pct =
          run.total_tasks > 0
            ? (run.completed_tasks / run.total_tasks) * 100
            : 0;
        return (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-overlay">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="font-mono text-[11px] text-text-tertiary">
              {run.completed_tasks}/{run.total_tasks}
            </span>
          </div>
        );
      },
    },
    {
      key: "score",
      header: "Score",
      render: (run) => (
        <span className="font-mono text-xs text-text-primary">
          {run.mean_score !== null ? run.mean_score.toFixed(2) : "\u2014"}
        </span>
      ),
    },
    {
      key: "started",
      header: "Started",
      render: (run) => (
        <span className="text-xs text-text-tertiary">
          {run.started_at
            ? new Date(run.started_at).toLocaleString()
            : "\u2014"}
        </span>
      ),
    },
  ];

  if (isPending) {
    return (
      <>
        <PageHeader
          title="Runs"
          description="Evaluation run history and active executions"
          actions={
            <Link href="/runs?action=new">
              <Button variant="primary">New Run</Button>
            </Link>
          }
        />
        <LoadingState message="Loading runs..." />
      </>
    );
  }

  if (sortedRuns.length === 0) {
    return (
      <>
        <PageHeader
          title="Runs"
          description="Evaluation run history and active executions"
          actions={
            <Link href="/runs?action=new">
              <Button variant="primary">New Run</Button>
            </Link>
          }
        />
        <EmptyState
          title="No runs yet"
          description="Start a new evaluation run to benchmark agent performance across tasks."
          action={
            <Link href="/runs?action=new">
              <Button variant="primary">New Run</Button>
            </Link>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Runs"
        description="Evaluation run history and active executions"
        actions={
          <Link href="/runs?action=new">
            <Button variant="primary">New Run</Button>
          </Link>
        }
      />

      <Card>
        <DataTable
          columns={runColumns}
          data={sortedRuns}
          onRowClick={(run) => router.push(`/runs/${run.id}`)}
        />
      </Card>
    </>
  );
}
