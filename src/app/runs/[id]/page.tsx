"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { PiCaretDown, PiCaretRight } from "react-icons/pi";
import { useRun, useRunResults } from "@/hooks/useRuns";
import { useEnvironments } from "@/hooks/useEnvironments";
import { useTasks } from "@/hooks/useTasks";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import type { RunResult } from "@/types/database";
import {
  synthesizeTrace,
  type TraceEntry,
} from "@/lib/trace-synthesis";
// Environment lookup now uses live data from useEnvironments()

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

/** Count tool_call actions across all results by synthesising traces. */
function deriveToolUseSummary(
  resultList: RunResult[],
  envSlug: string,
) {
  let totalToolCalls = 0;

  for (const r of resultList) {
    const trace = buildTrace(r, envSlug);
    totalToolCalls += trace.filter((e) => e.action === "tool_call").length;
  }

  const avgToolCalls =
    resultList.length > 0
      ? Math.round(totalToolCalls / resultList.length)
      : 0;
  const errored = resultList.filter((r) => r.error).length;

  return { totalToolCalls, avgToolCalls, errored };
}

/** Build the trace for a single result — shared helper. */
function buildTrace(result: RunResult, envSlug: string, taskSlugMap?: Map<string, string>): TraceEntry[] {
  const traj = result.trajectory;
  if (Array.isArray(traj) && traj.length > 0) {
    // Real trajectory data: could be TraceEntry objects or plain strings from evaluate.py
    if (typeof traj[0] === "string") {
      // Convert string summaries to TraceEntry-like objects
      return (traj as string[]).map((s, i) => ({
        step: i + 1,
        timestamp_ms: i * 5000,
        action: s.startsWith("bash") ? "terminal" as const
          : s.startsWith("edit") ? "edit" as const
          : s.startsWith("read") ? "observation" as const
          : "tool_call" as const,
        tool: s.split(":")[0],
        input_summary: s,
        output_summary: "",
        duration_ms: 5000,
        success: true,
      }));
    }
    return traj as TraceEntry[];
  }
  // No trajectory — synthesize one
  const taskSlug = taskSlugMap?.get(result.task_id) ?? result.task_id.slice(0, 8);
  return synthesizeTrace(
    taskSlug,
    envSlug,
    result.raw_score,
    result.steps_used,
    result.duration_ms,
    result.error,
  );
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
/*  Trace entry card (reused from previous implementation)             */
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
        <span className="shrink-0 rounded-sm bg-surface-overlay px-1.5 py-0.5 font-mono text-[9px] text-text-tertiary">
          S{entry.step}
        </span>
        <span
          className={`shrink-0 rounded-sm px-1.5 py-0.5 text-[9px] font-medium uppercase ${style.bg} ${style.text}`}
        >
          {style.label}
        </span>
        {entry.tool && (
          <span className="shrink-0 rounded-sm bg-accent/5 px-1.5 py-0.5 font-mono text-[10px] text-accent">
            {entry.tool}
          </span>
        )}
        <span
          className={`ml-auto shrink-0 text-[10px] ${entry.success ? "text-success" : "text-error"}`}
        >
          {entry.success ? "\u2713" : "\u2717"}
        </span>
        <span className="shrink-0 font-mono text-[10px] text-text-tertiary">
          {formatDuration(entry.duration_ms)}
        </span>
        <span className="shrink-0 text-[10px] text-text-tertiary">
          {isExpanded ? "\u25B2" : "\u25BC"}
        </span>
      </div>

      <div className="mt-1 truncate text-[11px] text-text-secondary">
        {entry.input_summary}
      </div>

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

/* ------------------------------------------------------------------ */
/*  Expandable task result row                                         */
/* ------------------------------------------------------------------ */

function TaskResultRow({
  result,
  taskName,
  envSlug,
  index,
  isExpanded,
  onToggle,
  runData,
  shortId,
  envName,
  duration,
}: {
  result: RunResult;
  taskName: string;
  envSlug: string;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  runData: { created_at: string; started_at: string | null; completed_at: string | null; model_name: string; status: string; total_tasks: number; completed_tasks: number; mean_score: number | null };
  shortId: string;
  envName: string;
  duration: string;
}) {
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(
    new Set(),
  );

  const trace: TraceEntry[] = useMemo(
    () => buildTrace(result, envSlug),
    [result, envSlug],
  );

  const toolCallCount = useMemo(
    () => trace.filter((e) => e.action === "tool_call").length,
    [trace],
  );

  const successfulSteps = trace.filter((e) => e.success).length;
  const toolCalls = trace.filter((e) => e.action === "tool_call");

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

  return (
    <div className="rounded-md border border-border bg-surface">
      {/* Collapsed row header */}
      <button
        type="button"
        onClick={onToggle}
        className={clsx(
          "flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-surface-overlay",
          isExpanded && "bg-surface-overlay",
        )}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <PiCaretDown className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
          ) : (
            <PiCaretRight className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
          )}
          <span className="rounded-sm bg-surface-overlay px-1.5 py-0.5 font-mono text-[10px] text-text-tertiary">
            #{index + 1}
          </span>
          <span className="text-xs font-medium text-text-primary">
            {taskName}
          </span>
          {result.error && (
            <span className="rounded-sm bg-error/10 px-1.5 py-0.5 text-[10px] font-medium text-error">
              Error
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-[11px] text-accent">
            {result.calibrated_score.toFixed(3)}
          </span>
          <span className="text-[11px] text-text-tertiary">
            {toolCallCount} tool call{toolCallCount !== 1 ? "s" : ""}
          </span>
          <span className="text-[11px] text-text-tertiary">
            {formatDuration(result.duration_ms)}
          </span>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border/50 px-3 py-3 space-y-4">
          {/* Error banner */}
          {result.error && (
            <div className="rounded-md border border-error/20 bg-error/5 px-3 py-2 text-[11px] text-error">
              Error: {result.error}
            </div>
          )}

          {/* Agent Traces section */}
          <div>
            <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
              Agent Traces
            </div>

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

          {/* Run Logs section */}
          <div>
            <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
              Run Logs
            </div>
            <div className="rounded-md border border-border/50 bg-background">
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
                <LogEntry
                  ts={result.created_at}
                  level={result.error ? "error" : "info"}
                  message={
                    result.error
                      ? `Task "${taskName}" failed \u2014 ${result.error}`
                      : `Task "${taskName}" completed \u2014 score ${result.calibrated_score.toFixed(3)}, ${formatDuration(result.duration_ms)}`
                  }
                />
                {runData.completed_at && (
                  <LogEntry
                    ts={runData.completed_at}
                    level={runData.status === "failed" ? "error" : "info"}
                    message={`Run ${runData.status} \u2014 ${runData.completed_tasks}/${runData.total_tasks} tasks, mean score ${runData.mean_score?.toFixed(3) ?? "n/a"}, wall time ${duration}`}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function RunDetailPage() {
  const routeParams = useParams();
  const id = routeParams.id as string;

  const run = useRun(id);
  const results = useRunResults(id);
  const environments = useEnvironments();
  const tasks = useTasks();

  const [expandedResultId, setExpandedResultId] = useState<string | null>(
    null,
  );

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

  const taskSlugMap = useMemo(
    () => new Map((tasks.data ?? []).map((t) => [t.id, t.slug])),
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
  const envEntry = (environments.data ?? []).find(
    (e) => e.id === runData.environment_id,
  );
  const envSlug = envEntry?.slug ?? runData.environment_id;
  const duration = computeRunDuration(
    runData.started_at,
    runData.completed_at,
  );
  const toolUsage = deriveToolUseSummary(resultList, envSlug);

  const toggleResult = (resultId: string) => {
    setExpandedResultId((prev) => (prev === resultId ? null : resultId));
  };

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

      {/* Tool Usage Summary */}
      {resultList.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Tool Usage Summary</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                Total Tool Calls
              </div>
              <div className="mt-0.5 font-mono text-lg text-text-primary">
                {toolUsage.totalToolCalls}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                Avg Tool Calls / Task
              </div>
              <div className="mt-0.5 font-mono text-lg text-text-primary">
                {toolUsage.avgToolCalls}
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

      {/* Task Results — unified expandable list */}
      <Card>
        <CardHeader>
          <CardTitle>Task Results</CardTitle>
          <span className="text-[11px] text-text-tertiary">
            {resultList.length} result{resultList.length !== 1 ? "s" : ""}{" "}
            &mdash; click a task to expand traces and logs
          </span>
        </CardHeader>
        {resultList.length > 0 ? (
          <div className="space-y-2">
            {resultList.map((r, i) => {
              const taskName =
                taskMap.get(r.task_id) ?? r.task_id.slice(0, 8);
              return (
                <TaskResultRow
                  key={r.id}
                  result={r}
                  taskName={taskName}
                  envSlug={envSlug}
                  index={i}
                  isExpanded={expandedResultId === r.id}
                  onToggle={() => toggleResult(r.id)}
                  runData={runData}
                  shortId={shortId}
                  envName={envName}
                  duration={duration}
                />
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-text-tertiary">
            No results recorded for this run yet.
          </div>
        )}
      </Card>
    </>
  );
}
