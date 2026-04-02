"use client";

import { useMemo, useState } from "react";
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

/** Synthetic tool-use summary derived from task results. */
function deriveToolUseSummary(resultList: RunResult[]) {
  const totalSteps = resultList.reduce((s, r) => s + r.steps_used, 0);
  const maxSteps = resultList.reduce((s, r) => s + r.max_steps, 0);
  const avgSteps =
    resultList.length > 0
      ? Math.round(totalSteps / resultList.length)
      : 0;
  const efficiency =
    maxSteps > 0 ? Math.round((totalSteps / maxSteps) * 100) : 0;
  const errored = resultList.filter((r) => r.error).length;
  return { totalSteps, avgSteps, efficiency, errored };
}

type DetailTab = "results" | "traces" | "logs";

export default function RunDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [activeTab, setActiveTab] = useState<DetailTab>("results");

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
  const toolUsage = deriveToolUseSummary(resultList);

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
      header: "Steps",
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

  const tabs: { key: DetailTab; label: string }[] = [
    { key: "results", label: "Task Results" },
    { key: "traces", label: "Agent Traces" },
    { key: "logs", label: "Run Logs" },
  ];

  return (
    <>
      <PageHeader
        title={`Run ${shortId}`}
        description={`${runData.model_name} · ${envName} · ${runData.status}`}
        actions={
          <Link href="/runs">
            <Button variant="ghost" size="sm">
              ← All Runs
            </Button>
          </Link>
        }
      />

      {/* Metric cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-6">
        <MetricCard label="Status" value={runData.status} />
        <MetricCard label="Agent / Model" value={runData.model_name} />
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
        <MetricCard label="Wall Time" value={duration} />
      </div>

      {/* Tool-use summary strip */}
      {resultList.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Tool Usage Summary</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                Total Steps
              </div>
              <div className="mt-0.5 font-mono text-lg text-text-primary">
                {toolUsage.totalSteps}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                Avg Steps / Task
              </div>
              <div className="mt-0.5 font-mono text-lg text-text-primary">
                {toolUsage.avgSteps}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                Step Efficiency
              </div>
              <div className="mt-0.5 font-mono text-lg text-text-primary">
                {toolUsage.efficiency}%
              </div>
              <div className="text-[10px] text-text-tertiary">
                of max budget used
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                Errors
              </div>
              <div className="mt-0.5 font-mono text-lg text-text-primary">
                {toolUsage.errored}
              </div>
              <div className="text-[10px] text-text-tertiary">
                task{toolUsage.errored !== 1 ? "s" : ""} with errors
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Tab navigation */}
      <div className="mb-4 flex items-center gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-accent text-accent"
                : "text-text-tertiary hover:text-text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "results" && (
        <Card>
          <CardHeader>
            <CardTitle>Per-Task Results</CardTitle>
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
      )}

      {activeTab === "traces" && (
        <Card>
          <CardHeader>
            <CardTitle>Agent Traces</CardTitle>
            <span className="text-[11px] text-text-tertiary">
              Step-by-step agent actions and tool calls
            </span>
          </CardHeader>
          {resultList.length > 0 ? (
            <div className="space-y-3">
              {resultList.map((r, i) => {
                const taskName =
                  taskMap.get(r.task_id) ?? r.task_id.slice(0, 8);
                return (
                  <div
                    key={r.id}
                    className="rounded-md border border-border bg-surface p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="rounded-sm bg-surface-overlay px-1.5 py-0.5 font-mono text-[10px] text-text-tertiary">
                          #{i + 1}
                        </span>
                        <span className="text-xs font-medium text-text-primary">
                          {taskName}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-accent">
                        {r.calibrated_score.toFixed(3)}
                      </span>
                    </div>
                    <div className="mt-2 rounded-md bg-background p-2 font-mono text-[11px] leading-relaxed text-text-tertiary">
                      <div className="text-text-secondary">
                        → {r.steps_used} steps in {formatDuration(r.duration_ms)}
                      </div>
                      <div>
                        Raw: {r.raw_score.toFixed(3)} → Calibrated:{" "}
                        {r.calibrated_score.toFixed(3)}
                      </div>
                      {r.error && (
                        <div className="mt-1 text-error">
                          Error: {r.error}
                        </div>
                      )}
                      <div className="mt-1 text-text-tertiary">
                        Trajectory: {r.trajectory.length > 0
                          ? `${r.trajectory.length} recorded actions`
                          : "awaiting trace data"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-text-tertiary">
              No trace data available — traces are recorded as tasks execute.
            </div>
          )}
        </Card>
      )}

      {activeTab === "logs" && (
        <Card>
          <CardHeader>
            <CardTitle>Run Logs</CardTitle>
            <span className="text-[11px] text-text-tertiary">
              Execution timeline and system events
            </span>
          </CardHeader>
          <div className="space-y-0">
            {/* Synthetic log entries derived from run state */}
            <LogEntry
              ts={runData.created_at}
              level="info"
              message={`Run ${shortId} created — ${runData.model_name} targeting ${envName}`}
            />
            {runData.started_at && (
              <LogEntry
                ts={runData.started_at}
                level="info"
                message={`Execution started — ${runData.total_tasks} tasks queued`}
              />
            )}
            {resultList.map((r) => {
              const taskName =
                taskMap.get(r.task_id) ?? r.task_id.slice(0, 8);
              return (
                <LogEntry
                  key={r.id}
                  ts={r.created_at}
                  level={r.error ? "error" : "info"}
                  message={
                    r.error
                      ? `Task "${taskName}" failed — ${r.error}`
                      : `Task "${taskName}" completed — score ${r.calibrated_score.toFixed(3)}, ${r.steps_used} steps, ${formatDuration(r.duration_ms)}`
                  }
                />
              );
            })}
            {runData.completed_at && (
              <LogEntry
                ts={runData.completed_at}
                level={runData.status === "failed" ? "error" : "info"}
                message={`Run ${runData.status} — ${runData.completed_tasks}/${runData.total_tasks} tasks, mean score ${runData.mean_score?.toFixed(3) ?? "n/a"}, wall time ${duration}`}
              />
            )}
            {!runData.started_at && (
              <div className="py-6 text-center text-xs text-text-tertiary">
                Run is pending — logs will stream once execution begins.
              </div>
            )}
          </div>
        </Card>
      )}
    </>
  );
}

function LogEntry({
  ts,
  level,
  message,
}: {
  ts: string;
  level: "info" | "error" | "warn";
  message: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-border/50 px-1 py-2 last:border-b-0">
      <span className="shrink-0 font-mono text-[10px] text-text-tertiary">
        {new Date(ts).toLocaleTimeString()}
      </span>
      <span
        className={`shrink-0 rounded-sm px-1 py-0.5 font-mono text-[9px] font-medium uppercase ${
          level === "error"
            ? "bg-error/10 text-error"
            : level === "warn"
              ? "bg-accent/10 text-accent"
              : "bg-surface-overlay text-text-tertiary"
        }`}
      >
        {level}
      </span>
      <span className="text-xs leading-relaxed text-text-secondary">
        {message}
      </span>
    </div>
  );
}
