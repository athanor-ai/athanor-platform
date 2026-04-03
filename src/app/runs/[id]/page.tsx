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
import {
  synthesizeTrace,
  type TraceEntry,
} from "@/lib/trace-synthesis";
import { ENVIRONMENT_BY_ID } from "@/data/environments";

/* ------------------------------------------------------------------ */
/*  Utilities                                                          */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Action badge colors                                                */
/* ------------------------------------------------------------------ */

const ACTION_STYLES: Record<
  TraceEntry["action"],
  { bg: string; text: string; label: string }
> = {
  reasoning: {
    bg: "bg-info/10",
    text: "text-info",
    label: "Reasoning",
  },
  tool_call: {
    bg: "bg-accent/10",
    text: "text-accent",
    label: "Tool Call",
  },
  observation: {
    bg: "bg-surface-overlay",
    text: "text-text-secondary",
    label: "Observation",
  },
  edit: {
    bg: "bg-warning/10",
    text: "text-warning",
    label: "Edit",
  },
  terminal: {
    bg: "bg-error/10",
    text: "text-error",
    label: "Terminal",
  },
};

/* ------------------------------------------------------------------ */
/*  Trace entry component                                              */
/* ------------------------------------------------------------------ */

function TraceEntryCard({
  entry,
  isExpanded,
  onToggle,
}: {
  entry: TraceEntry;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const style = ACTION_STYLES[entry.action];

  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full cursor-pointer rounded-md border border-border/50 bg-background px-3 py-2 text-left transition-colors hover:border-border"
    >
      <div className="flex items-center gap-2">
        {/* Step number */}
        <span className="shrink-0 rounded-sm bg-surface-overlay px-1.5 py-0.5 font-mono text-[9px] text-text-tertiary">
          S{entry.step}
        </span>

        {/* Action badge */}
        <span
          className={`shrink-0 rounded-sm px-1.5 py-0.5 text-[9px] font-medium uppercase ${style.bg} ${style.text}`}
        >
          {style.label}
        </span>

        {/* Tool name if present */}
        {entry.tool && (
          <span className="shrink-0 rounded-sm bg-accent/5 px-1.5 py-0.5 font-mono text-[10px] text-accent">
            {entry.tool}
          </span>
        )}

        {/* Success/fail indicator */}
        <span
          className={`ml-auto shrink-0 text-[10px] ${entry.success ? "text-success" : "text-error"}`}
        >
          {entry.success ? "\u2713" : "\u2717"}
        </span>

        {/* Duration */}
        <span className="shrink-0 font-mono text-[10px] text-text-tertiary">
          {formatDuration(entry.duration_ms)}
        </span>

        {/* Expand arrow */}
        <span className="shrink-0 text-[10px] text-text-tertiary">
          {isExpanded ? "\u25B2" : "\u25BC"}
        </span>
      </div>

      {/* Summary line (always visible) */}
      <div className="mt-1 truncate text-[11px] text-text-secondary">
        {entry.input_summary}
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="mt-2 space-y-1.5 rounded-md bg-surface-overlay p-2">
          <div>
            <span className="text-[10px] font-medium uppercase text-text-tertiary">
              Input
            </span>
            <div className="mt-0.5 text-[11px] leading-relaxed text-text-secondary">
              {entry.input_summary}
            </div>
          </div>
          <div>
            <span className="text-[10px] font-medium uppercase text-text-tertiary">
              Output
            </span>
            <div
              className={`mt-0.5 font-mono text-[11px] leading-relaxed ${entry.success ? "text-text-primary" : "text-error"}`}
            >
              {entry.output_summary}
            </div>
          </div>
          <div className="flex items-center gap-3 border-t border-border/30 pt-1.5">
            <span className="text-[10px] text-text-tertiary">
              Timestamp: {formatDuration(entry.timestamp_ms)}
            </span>
            <span className="text-[10px] text-text-tertiary">
              Duration: {formatDuration(entry.duration_ms)}
            </span>
            <span
              className={`text-[10px] ${entry.success ? "text-success" : "text-error"}`}
            >
              {entry.success ? "Success" : "Failed"}
            </span>
          </div>
        </div>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Task trace section                                                 */
/* ------------------------------------------------------------------ */

function TaskTraceSection({
  result,
  taskName,
  envSlug,
  index,
}: {
  result: RunResult;
  taskName: string;
  envSlug: string;
  index: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(
    new Set(),
  );

  /* Build the trace. If the RunResult has real trajectory data, use it.
     Otherwise, synthesize a realistic trace from the run metadata. */
  const trace: TraceEntry[] = useMemo(() => {
    if (result.trajectory.length > 0) {
      return result.trajectory as TraceEntry[];
    }
    const taskSlug =
      result.task_id.split("-").slice(1).join("-") || result.task_id;
    return synthesizeTrace(
      taskSlug,
      envSlug,
      result.raw_score,
      result.steps_used,
      result.duration_ms,
      result.error,
    );
  }, [result, envSlug]);

  const toggleEntry = (idx: number) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const toolCalls = trace.filter((e) => e.action === "tool_call");
  const successfulSteps = trace.filter((e) => e.success).length;

  return (
    <div className="rounded-md border border-border bg-surface">
      {/* Header (always visible, click to expand) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-surface-overlay"
      >
        <div className="flex items-center gap-2">
          <span className="rounded-sm bg-surface-overlay px-1.5 py-0.5 font-mono text-[10px] text-text-tertiary">
            #{index + 1}
          </span>
          <span className="text-xs font-medium text-text-primary">
            {taskName}
          </span>
          <span className="rounded-sm bg-surface-overlay px-1.5 py-0.5 text-[10px] text-text-tertiary">
            {trace.length} actions
          </span>
          <span className="rounded-sm bg-surface-overlay px-1.5 py-0.5 text-[10px] text-text-tertiary">
            {toolCalls.length} tool calls
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-text-secondary">
            {result.raw_score.toFixed(3)} &rarr;{" "}
            <span className="text-accent">
              {result.calibrated_score.toFixed(3)}
            </span>
          </span>
          <span className="text-[11px] text-text-tertiary">
            {result.steps_used} steps &middot;{" "}
            {formatDuration(result.duration_ms)}
          </span>
          <span className="text-[10px] text-text-tertiary">
            {isOpen ? "\u25B2" : "\u25BC"}
          </span>
        </div>
      </button>

      {/* Expanded trace */}
      {isOpen && (
        <div className="border-t border-border/50 px-3 py-3">
          {/* Summary strip */}
          <div className="mb-3 flex items-center gap-4 rounded-md bg-background px-3 py-2">
            <div className="text-[10px] text-text-tertiary">
              <span className="font-medium text-text-secondary">
                {trace.length}
              </span>{" "}
              trace entries
            </div>
            <div className="text-[10px] text-text-tertiary">
              <span className="font-medium text-success">
                {successfulSteps}
              </span>{" "}
              succeeded
            </div>
            <div className="text-[10px] text-text-tertiary">
              <span className="font-medium text-error">
                {trace.length - successfulSteps}
              </span>{" "}
              failed
            </div>
            <div className="text-[10px] text-text-tertiary">
              Tools:{" "}
              <span className="font-mono text-text-secondary">
                {[...new Set(toolCalls.map((t) => t.tool))].join(", ") ||
                  "none"}
              </span>
            </div>
          </div>

          {result.error && (
            <div className="mb-3 rounded-md border border-error/20 bg-error/5 px-3 py-2 text-[11px] text-error">
              Error: {result.error}
            </div>
          )}

          {/* Trace entries */}
          <div className="space-y-1.5">
            {trace.map((entry, i) => (
              <TraceEntryCard
                key={`${entry.step}-${i}`}
                entry={entry}
                isExpanded={expandedEntries.has(i)}
                onToggle={() => toggleEntry(i)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

type DetailTab = "results" | "traces" | "logs";

export default function RunDetailPage() {
  const routeParams = useParams();
  const id = routeParams.id as string;
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
  const envDef = ENVIRONMENT_BY_ID.get(runData.environment_id);
  const envSlug = envDef?.slug ?? runData.environment_id;
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
        description={`${runData.model_name} \u00b7 ${envName} \u00b7 ${runData.status}`}
        actions={
          <Link href="/runs">
            <Button variant="ghost" size="sm">
              &larr; All Runs
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
              Step-by-step agent actions and tool calls &mdash; click a task to
              expand its full trace
            </span>
          </CardHeader>
          {resultList.length > 0 ? (
            <div className="space-y-2">
              {resultList.map((r, i) => {
                const taskName =
                  taskMap.get(r.task_id) ?? r.task_id.slice(0, 8);
                return (
                  <TaskTraceSection
                    key={r.id}
                    result={r}
                    taskName={taskName}
                    envSlug={envSlug}
                    index={i}
                  />
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-text-tertiary">
              No trace data available &mdash; traces are recorded as tasks
              execute.
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
            <LogEntry
              ts={runData.created_at}
              level="info"
              message={`Run ${shortId} created \u2014 ${runData.model_name} targeting ${envName}`}
            />
            {runData.started_at && (
              <LogEntry
                ts={runData.started_at}
                level="info"
                message={`Execution started \u2014 ${runData.total_tasks} tasks queued`}
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
                      ? `Task "${taskName}" failed \u2014 ${r.error}`
                      : `Task "${taskName}" completed \u2014 score ${r.calibrated_score.toFixed(3)}, ${r.steps_used} steps, ${formatDuration(r.duration_ms)}`
                  }
                />
              );
            })}
            {runData.completed_at && (
              <LogEntry
                ts={runData.completed_at}
                level={runData.status === "failed" ? "error" : "info"}
                message={`Run ${runData.status} \u2014 ${runData.completed_tasks}/${runData.total_tasks} tasks, mean score ${runData.mean_score?.toFixed(3) ?? "n/a"}, wall time ${duration}`}
              />
            )}
            {!runData.started_at && (
              <div className="py-6 text-center text-xs text-text-tertiary">
                Run is pending &mdash; logs will stream once execution begins.
              </div>
            )}
          </div>
        </Card>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Log entry component                                                */
/* ------------------------------------------------------------------ */

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
