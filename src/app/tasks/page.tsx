"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { PiCaretDown, PiCaretRight } from "react-icons/pi";
import { useTasks } from "@/hooks/useTasks";
import { useRuns } from "@/hooks/useRuns";
import { useEnvironments } from "@/hooks/useEnvironments";
import { mockRunResults } from "@/data/mock";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Task } from "@/types/database";

export default function TasksPage() {
  const tasks = useTasks();
  const runs = useRuns();
  const environments = useEnvironments();

  const [search, setSearch] = useState("");
  const [envFilter, setEnvFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isPending = tasks.isPending || environments.isPending || runs.isPending;

  const envMap = useMemo(
    () => new Map((environments.data ?? []).map((e) => [e.id, e.name])),
    [environments.data],
  );

  const envList = environments.data ?? [];

  /** Map each task ID to the runs that include results for it. */
  const taskRunMap = useMemo(() => {
    const runMap = new Map((runs.data ?? []).map((r) => [r.id, r]));
    const map = new Map<string, { runId: string; shortId: string }[]>();

    for (const rr of mockRunResults) {
      if (!runMap.has(rr.run_id)) continue;

      const existing = map.get(rr.task_id) ?? [];
      // Avoid duplicating the same run for the same task
      if (!existing.some((e) => e.runId === rr.run_id)) {
        existing.push({
          runId: rr.run_id,
          shortId: rr.run_id.slice(0, 8),
        });
      }
      map.set(rr.task_id, existing);
    }

    return map;
  }, [runs.data]);

  const filteredTasks = useMemo(() => {
    let list = tasks.data ?? [];

    if (envFilter !== "all") {
      list = list.filter((t) => t.environment_id === envFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q),
      );
    }

    return list;
  }, [tasks.data, envFilter, search]);

  function toggleRow(taskId: string) {
    setExpandedId((prev) => (prev === taskId ? null : taskId));
  }

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

      {/* Filter area */}
      <Card padding="sm" className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks by name, description, or category..."
            className="min-w-[280px] flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
          />
          <select
            value={envFilter}
            onChange={(e) => setEnvFilter(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="all">All Environments</option>
            {envList.map((env) => (
              <option key={env.id} value={env.id}>
                {env.name}
              </option>
            ))}
          </select>
          <span className="text-[11px] text-text-tertiary">
            {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
          </span>
        </div>
      </Card>

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
                    Name
                  </th>
                  <th className="pb-2 pr-4 pt-4 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                    Environment
                  </th>
                  <th className="pb-2 pr-4 pt-4 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                    Category
                  </th>
                  <th className="pb-2 pr-4 pt-4 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                    Difficulty
                  </th>
                  <th className="pb-2 pr-4 pt-4 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                    Max Steps
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
}: {
  task: Task;
  isExpanded: boolean;
  envName: string;
  linkedRuns: { runId: string; shortId: string }[];
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className={clsx(
          "cursor-pointer border-b transition-colors",
          isExpanded
            ? "border-border bg-surface-overlay"
            : "border-border-subtle hover:bg-surface-overlay",
        )}
        onClick={onToggle}
      >
        {/* Chevron */}
        <td className="pl-4 pr-1 py-2.5">
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

        {/* Max Steps */}
        <td className="py-2.5 pr-4">
          <span className="font-mono text-xs text-text-secondary">
            {task.max_steps}
          </span>
        </td>
      </tr>

      {/* Expanded detail row */}
      {isExpanded && (
        <tr className="border-b border-border bg-surface-overlay">
          <td colSpan={6} className="px-4 py-3">
            <div className="space-y-3">
              {/* Description */}
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
                  Description
                </div>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                  {task.description}
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
                        View in Run {lr.shortId}
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
