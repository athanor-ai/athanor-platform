"use client";

import { Suspense, useMemo, useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { PiCaretDown, PiCaretRight } from "react-icons/pi";
import { useTasks } from "@/hooks/useTasks";
import { useRuns } from "@/hooks/useRuns";
import { useEnvironments } from "@/hooks/useEnvironments";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  ColumnFilter,
  type ColumnFilterConfig,
} from "@/components/ui/ColumnFilter";
import {
  useColumnFilters,
  matchesTextFilter,
  matchesSelectFilter,
  uniqueOptions,
} from "@/hooks/useColumnFilters";
import type { Task } from "@/types/database";

/* ------------------------------------------------------------------ */
/*  Difficulty options (static)                                        */
/* ------------------------------------------------------------------ */

const DIFFICULTY_OPTIONS = [
  { label: "trivial", value: "trivial" },
  { label: "easy", value: "easy" },
  { label: "medium", value: "medium" },
  { label: "hard", value: "hard" },
  { label: "expert", value: "expert" },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader
            title="Tasks"
            description="Browse and filter registered tasks across your shipped environments"
          />
          <LoadingState message="Loading tasks..." />
        </>
      }
    >
      <TasksPageContent />
    </Suspense>
  );
}

function TasksPageContent() {
  const tasks = useTasks();
  const runs = useRuns();
  const environments = useEnvironments();
  const runResults = useQuery({
    queryKey: ["run-results"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/run-results");
        if (res.ok) return res.json();
      } catch { /* fall through */ }
      return [];
    },
    staleTime: 1000 * 60 * 5,
  });
  const searchParams = useSearchParams();

  const taskParam = searchParams.get("task");

  const { filters, setColumnFilter, activeCount, clearAll } =
    useColumnFilters();
  const [expandedId, setExpandedId] = useState<string | null>(
    taskParam ?? null,
  );

  const isPending = tasks.isPending || environments.isPending || runs.isPending || runResults.isPending;

  const envMap = useMemo(
    () => new Map((environments.data ?? []).map((e) => [e.id, e.name])),
    [environments.data],
  );

  /* Build dynamic filter options from data */
  const envOptions = useMemo(
    () => uniqueOptions((environments.data ?? []).map((e) => e.name)),
    [environments.data],
  );

  const categoryOptions = useMemo(
    () => uniqueOptions((tasks.data ?? []).map((t) => t.category)),
    [tasks.data],
  );

  /* Resolve environment_id → name for filtering */
  const envIdToName = envMap;

  /** Map each task ID to the runs that include results for it. */
  const taskRunMap = useMemo(() => {
    const runMap = new Map((runs.data ?? []).map((r) => [r.id, r]));
    const map = new Map<
      string,
      { runId: string; shortId: string; modelName: string }[]
    >();

    for (const rr of (runResults.data ?? []) as { run_id: string; task_id: string }[]) {
      const run = runMap.get(rr.run_id);
      if (!run) continue;

      const existing = map.get(rr.task_id) ?? [];
      if (!existing.some((e) => e.runId === rr.run_id)) {
        existing.push({
          runId: rr.run_id,
          shortId: rr.run_id.slice(0, 8),
          modelName: run.model_name,
        });
      }
      map.set(rr.task_id, existing);
    }

    return map;
  }, [runs.data, runResults.data]);

  const filteredTasks = useMemo(() => {
    let list = tasks.data ?? [];

    list = list.filter((t) => {
      const envName = envIdToName.get(t.environment_id) ?? "Unknown";

      return (
        matchesTextFilter(filters.name, t.name) &&
        matchesSelectFilter(filters.environment, envName) &&
        matchesSelectFilter(filters.category, t.category) &&
        matchesSelectFilter(filters.difficulty, t.difficulty)
      );
    });

    return list;
  }, [tasks.data, filters, envIdToName]);

  function toggleRow(taskId: string) {
    setExpandedId((prev) => (prev === taskId ? null : taskId));
  }

  /* ---- Filter configs ---- */
  const nameFilterConfig: ColumnFilterConfig = {
    type: "text",
    placeholder: "Filter by name...",
  };
  const envFilterConfig: ColumnFilterConfig = {
    type: "select",
    options: envOptions,
  };
  const categoryFilterConfig: ColumnFilterConfig = {
    type: "select",
    options: categoryOptions,
  };
  const difficultyFilterConfig: ColumnFilterConfig = {
    type: "select",
    options: DIFFICULTY_OPTIONS,
  };

  if (isPending) {
    return (
      <>
        <PageHeader
          title="Tasks"
          description="Browse and filter registered tasks across your shipped environments"
        />
        <LoadingState message="Loading tasks..." />
      </>
    );
  }

  if ((tasks.data ?? []).length === 0) {
    return (
      <>
        <PageHeader
          title="Tasks"
          description="Browse and filter registered tasks across your shipped environments"
        />
        <EmptyState
          title="No tasks found"
          description="Tasks will appear here once Athanor provisions environments for your account."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Tasks"
        description="Browse and filter evaluation tasks across environments"
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
            {filteredTasks.length} task
            {filteredTasks.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Results table */}
      <Card padding="none">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
            <div className="text-sm">No tasks match your filters</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="w-8 pb-2 pl-4 pr-1 pt-4" />
                  <th className="pb-2 pr-4 pt-4 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                    <span className="inline-flex items-center gap-0.5">
                      Name
                      <ColumnFilter
                        config={nameFilterConfig}
                        value={filters.name ?? {}}
                        onChange={(next) => setColumnFilter("name", next)}
                      />
                    </span>
                  </th>
                  <th className="pb-2 pr-4 pt-4 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                    <span className="inline-flex items-center gap-0.5">
                      Environment
                      <ColumnFilter
                        config={envFilterConfig}
                        value={filters.environment ?? {}}
                        onChange={(next) =>
                          setColumnFilter("environment", next)
                        }
                      />
                    </span>
                  </th>
                  <th className="pb-2 pr-4 pt-4 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                    <span className="inline-flex items-center gap-0.5">
                      Category
                      <ColumnFilter
                        config={categoryFilterConfig}
                        value={filters.category ?? {}}
                        onChange={(next) => setColumnFilter("category", next)}
                      />
                    </span>
                  </th>
                  <th className="pb-2 pr-4 pt-4 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                    <span className="inline-flex items-center gap-0.5">
                      Difficulty
                      <ColumnFilter
                        config={difficultyFilterConfig}
                        value={filters.difficulty ?? {}}
                        onChange={(next) => setColumnFilter("difficulty", next)}
                      />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => {
                  const isExpanded = expandedId === task.id;
                  const linkedRuns = taskRunMap.get(task.id) ?? [];

                  return (
                    <TaskRow
                      key={task.id}
                      task={task}
                      isExpanded={isExpanded}
                      envName={envMap.get(task.environment_id) ?? "Unknown"}
                      linkedRuns={linkedRuns}
                      onToggle={() => toggleRow(task.id)}
                      autoScroll={taskParam === task.id}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Expandable task row                                                */
/* ------------------------------------------------------------------ */

function TaskRow({
  task,
  isExpanded,
  envName,
  linkedRuns,
  onToggle,
  autoScroll,
}: {
  task: Task;
  isExpanded: boolean;
  envName: string;
  linkedRuns: { runId: string; shortId: string; modelName: string }[];
  onToggle: () => void;
  autoScroll?: boolean;
}) {
  const rowRef = useRef<HTMLTableRowElement>(null);

  const scrollIntoView = useCallback(() => {
    if (autoScroll && isExpanded && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [autoScroll, isExpanded]);

  useEffect(() => {
    scrollIntoView();
  }, [scrollIntoView]);

  return (
    <>
      <tr
        ref={rowRef}
        className={clsx(
          "cursor-pointer border-b transition-colors",
          isExpanded
            ? "border-border bg-surface-overlay"
            : "border-border-subtle hover:bg-surface-overlay",
        )}
        onClick={onToggle}
      >
        {/* Chevron */}
        <td className="py-2.5 pl-4 pr-1">
          {isExpanded ? (
            <PiCaretDown className="h-3.5 w-3.5 text-text-tertiary" />
          ) : (
            <PiCaretRight className="h-3.5 w-3.5 text-text-tertiary" />
          )}
        </td>

        {/* Name */}
        <td className="py-2.5 pr-4">
          <span className="text-xs font-semibold text-text-primary">
            {task.name}
          </span>
        </td>

        {/* Environment */}
        <td className="py-2.5 pr-4">
          <span className="text-xs text-text-secondary">{envName}</span>
        </td>

        {/* Category */}
        <td className="py-2.5 pr-4">
          <span className="inline-flex items-center rounded-sm bg-surface-overlay px-1.5 py-0.5 text-[11px] font-medium text-text-secondary">
            {task.category}
          </span>
        </td>

        {/* Difficulty */}
        <td className="py-2.5 pr-4">
          <StatusBadge status={task.difficulty} />
        </td>
      </tr>

      {/* Expanded detail row */}
      {isExpanded && (
        <tr className="border-b border-border bg-surface-overlay">
          <td colSpan={5} className="px-4 py-3">
            <div className="space-y-3">
              {/* Description + GitHub link */}
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
                    Description
                  </div>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                  {task.description || "No description available."}
                </p>
              </div>

              {/* Linked runs */}
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
                  Runs
                </div>
                {linkedRuns.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {linkedRuns.map((lr) => (
                      <Link
                        key={lr.runId}
                        href={`/runs/${lr.runId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center rounded-sm border border-border bg-background px-2 py-1 font-mono text-[11px] text-accent transition-colors hover:border-accent/30 hover:bg-accent-subtle"
                      >
                        {lr.modelName} run
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-text-tertiary">
                    No runs include this task yet.
                  </p>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
