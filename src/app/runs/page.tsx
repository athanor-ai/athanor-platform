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
import {
  useColumnFilters,
  matchesTextFilter,
  matchesSelectFilter,
  matchesBucketFilter,
  uniqueOptions,
} from "@/hooks/useColumnFilters";
import type { Run } from "@/types/database";

/* ------------------------------------------------------------------ */
/*  Sort helpers                                                       */
/* ------------------------------------------------------------------ */

type SortKey = "model" | "environment" | "status" | "score" | "created";
type SortDir = "asc" | "desc";

const STATUS_ORDER: Record<string, number> = {
  running: 0,
  pending: 1,
  completed: 2,
  failed: 3,
  cancelled: 4,
};

/* ------------------------------------------------------------------ */
/*  Score bucket helpers                                               */
/* ------------------------------------------------------------------ */

const SCORE_BUCKETS = [
  { label: "< 0.25 (Low)", value: "low" },
  { label: "0.25 – 0.50 (Medium)", value: "medium" },
  { label: "0.50 – 0.75 (High)", value: "high" },
  { label: "> 0.75 (Excellent)", value: "excellent" },
  { label: "No score", value: "none" },
];

function scoreBucketKey(score: number | null): string {
  if (score === null) return "none";
  if (score < 0.25) return "low";
  if (score < 0.5) return "medium";
  if (score < 0.75) return "high";
  return "excellent";
}

/* ------------------------------------------------------------------ */
/*  Date bucket helpers                                                */
/* ------------------------------------------------------------------ */

const DATE_BUCKETS = [
  { label: "Today", value: "today" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Older", value: "older" },
  { label: "Not started", value: "none" },
];

function dateBucketKey(dateStr: string | null): string {
  if (!dateStr) return "none";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 1) return "today";
  if (diffDays < 7) return "7d";
  if (diffDays < 30) return "30d";
  return "older";
}

/* ------------------------------------------------------------------ */
/*  Status options (static)                                            */
/* ------------------------------------------------------------------ */

const STATUS_OPTIONS = [
  { label: "pending", value: "pending" },
  { label: "running", value: "running" },
  { label: "completed", value: "completed" },
  { label: "failed", value: "failed" },
  { label: "cancelled", value: "cancelled" },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

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

  const { filters, setColumnFilter, activeCount, clearAll } =
    useColumnFilters();

  const toggleSort = useCallback(
    (key: string) => {
      const k = key as SortKey;
      if (sortKey === k) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(k);
        setSortDir(k === "status" ? "asc" : "desc");
      }
    },
    [sortKey],
  );

  /* Build dynamic filter options from data */
  const modelOptions = useMemo(
    () => uniqueOptions((runs.data ?? []).map((r) => r.model_name)),
    [runs.data],
  );

  const envOptions = useMemo(
    () => uniqueOptions((environments.data ?? []).map((e) => e.name)),
    [environments.data],
  );

  /* Filter, then sort */
  const filteredAndSorted = useMemo(() => {
    let list = runs.data ?? [];

    list = list.filter((r) => {
      const envName = envMap.get(r.environment_id) ?? "Unknown";

      return (
        matchesTextFilter(filters.id, r.id) &&
        matchesSelectFilter(filters.model, r.model_name) &&
        matchesSelectFilter(filters.environment, envName) &&
        matchesSelectFilter(filters.status, r.status) &&
        matchesBucketFilter(filters.score, scoreBucketKey(r.mean_score)) &&
        matchesBucketFilter(filters.started, dateBucketKey(r.started_at))
      );
    });

    const data = [...list];
    const dir = sortDir === "asc" ? 1 : -1;
    return data.sort((a, b) => {
      switch (sortKey) {
        case "model":
          return dir * a.model_name.localeCompare(b.model_name);
        case "environment":
          return (
            dir *
            (envMap.get(a.environment_id) ?? "").localeCompare(
              envMap.get(b.environment_id) ?? "",
            )
          );
        case "status":
          return (
            dir *
            ((STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9))
          );
        case "score":
          return dir * ((a.mean_score ?? 0) - (b.mean_score ?? 0));
        case "created":
        default:
          return (
            dir *
            (new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime())
          );
      }
    });
  }, [runs.data, sortKey, sortDir, envMap, filters]);

  const runColumns: Column<Run>[] = [
    {
      key: "id",
      header: "ID",
      filterConfig: { type: "text", placeholder: "Filter by ID..." },
      render: (run) => (
        <span className="font-mono text-xs text-text-secondary">
          {run.id.slice(0, 8)}
        </span>
      ),
    },
    {
      key: "model",
      header: "Agent / Model",
      sortable: true,
      filterConfig: { type: "select", options: modelOptions },
      render: (run) => (
        <span className="text-xs font-medium text-accent">
          {run.model_name}
        </span>
      ),
    },
    {
      key: "environment",
      header: "Environment",
      sortable: true,
      filterConfig: { type: "select", options: envOptions },
      render: (run) => (
        <span className="text-xs text-text-secondary">
          {envMap.get(run.environment_id) ?? "Unknown"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterConfig: { type: "select", options: STATUS_OPTIONS },
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
      filterConfig: { type: "range", options: SCORE_BUCKETS },
      render: (run) => (
        <span className="font-mono text-xs text-text-primary">
          {run.mean_score !== null ? run.mean_score.toFixed(2) : "\u2014"}
        </span>
      ),
    },
    {
      key: "started",
      header: "Started",
      filterConfig: { type: "range", options: DATE_BUCKETS },
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

  if ((runs.data ?? []).length === 0) {
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

      {/* Active filter indicator */}
      {activeCount > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[11px] text-text-tertiary">
            {activeCount} filter{activeCount !== 1 ? "s" : ""} active
          </span>
          <button
            onClick={clearAll}
            className="text-[11px] text-accent hover:underline"
          >
            Clear all
          </button>
          <span className="ml-auto text-[11px] text-text-tertiary">
            {filteredAndSorted.length} run
            {filteredAndSorted.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      <Card>
        <DataTable
          columns={runColumns}
          data={filteredAndSorted}
          onRowClick={(run) => router.push(`/runs/${run.id}`)}
          onHeaderClick={toggleSort}
          sortKey={sortKey}
          sortDir={sortDir}
          filters={filters}
          onFilterChange={setColumnFilter}
        />
      </Card>
    </>
  );
}
