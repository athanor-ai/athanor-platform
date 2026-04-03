"use client";

import { useMemo, useState, useCallback } from "react";
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

type SortKey = "model" | "environment" | "status" | "score" | "created";
type SortDir = "asc" | "desc";

const STATUS_ORDER: Record<string, number> = {
  running: 0,
  pending: 1,
  completed: 2,
  failed: 3,
  cancelled: 4,
};

export default function RunsPage() {
  const router = useRouter();
  const runs = useRuns();
  const environments = useEnvironments();

  const isPending = runs.isPending || environments.isPending;

  const envMap = useMemo(
    () => new Map((environments.data ?? []).map((e) => [e.id, e.name])),
    [environments.data],
  );

  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "status" ? "asc" : "desc");
    }
  }, [sortKey]);

  const sortedRuns = useMemo(() => {
    const data = [...(runs.data ?? [])];
    const dir = sortDir === "asc" ? 1 : -1;
    return data.sort((a, b) => {
      switch (sortKey) {
        case "model":
          return dir * a.model_name.localeCompare(b.model_name);
        case "environment":
          return dir * (envMap.get(a.environment_id) ?? "").localeCompare(envMap.get(b.environment_id) ?? "");
        case "status":
          return dir * ((STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));
        case "score":
          return dir * ((a.mean_score ?? 0) - (b.mean_score ?? 0));
        case "created":
        default:
          return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      }
    });
  }, [runs.data, sortKey, sortDir, envMap]);

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
      header: (<button onClick={() => toggleSort("model")} className="hover:text-text-primary cursor-pointer">Agent / Model {sortKey === "model" ? (sortDir === "asc" ? "↑" : "↓") : ""}</button>),
      render: (run) => (
        <span className="text-xs font-medium text-accent">
          {run.model_name}
        </span>
      ),
    },
    {
      key: "environment",
      header: (<button onClick={() => toggleSort("environment")} className="hover:text-text-primary cursor-pointer">Environment {sortKey === "environment" ? (sortDir === "asc" ? "↑" : "↓") : ""}</button>),
      render: (run) => (
        <span className="text-xs text-text-secondary">
          {envMap.get(run.environment_id) ?? "Unknown"}
        </span>
      ),
    },
    {
      key: "status",
      header: (<button onClick={() => toggleSort("status")} className="hover:text-text-primary cursor-pointer">Status {sortKey === "status" ? (sortDir === "asc" ? "↑" : "↓") : ""}</button>),
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
          description="Monitor active and completed evaluation runs — click a row to inspect traces and scores"
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
          description="Monitor active and completed evaluation runs — click a row to inspect traces and scores"
        />
        <EmptyState
          title="No runs yet"
          description="Runs will appear here once agents begin executing against your shipped environments."
          action={
            <Link href="/environments">
              <Button variant="primary">Browse Environments</Button>
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
          <Link href="/environments">
            <Button variant="secondary" size="sm">
              Browse Environments
            </Button>
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
