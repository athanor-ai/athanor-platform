"use client";

import { useMemo, useState } from "react";
import { useTasks } from "@/hooks/useTasks";
import { useEnvironments } from "@/hooks/useEnvironments";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Task } from "@/types/database";

export default function TasksPage() {
  const tasks = useTasks();
  const environments = useEnvironments();

  const [search, setSearch] = useState("");
  const [envFilter, setEnvFilter] = useState<string>("all");

  const isPending = tasks.isPending || environments.isPending;

  const envMap = useMemo(
    () => new Map((environments.data ?? []).map((e) => [e.id, e.name])),
    [environments.data],
  );

  const envList = environments.data ?? [];

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

  const taskColumns: Column<Task>[] = [
    {
      key: "name",
      header: "Name",
      render: (t) => (
        <span className="text-xs font-semibold text-text-primary">
          {t.name}
        </span>
      ),
    },
    {
      key: "environment",
      header: "Environment",
      render: (t) => (
        <span className="text-xs text-text-secondary">
          {envMap.get(t.environment_id) ?? "Unknown"}
        </span>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (t) => (
        <span className="inline-flex items-center rounded-sm bg-surface-overlay px-1.5 py-0.5 text-[11px] font-medium text-text-secondary">
          {t.category}
        </span>
      ),
    },
    {
      key: "difficulty",
      header: "Difficulty",
      render: (t) => <StatusBadge status={t.difficulty} />,
    },
    {
      key: "max_steps",
      header: "Max Steps",
      render: (t) => (
        <span className="font-mono text-xs text-text-secondary">
          {t.max_steps}
        </span>
      ),
    },
    {
      key: "description",
      header: "Description",
      className: "max-w-[280px]",
      render: (t) => (
        <span className="block truncate text-xs text-text-tertiary">
          {t.description}
        </span>
      ),
    },
  ];

  if (isPending) {
    return (
      <>
        <PageHeader
          title="Tasks"
          description="Browse and filter evaluation tasks across environments"
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
          description="Browse and filter evaluation tasks across environments"
        />
        <EmptyState
          title="No tasks found"
          description="Tasks will appear here once environments have been configured with evaluation tasks."
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
      <Card>
        <DataTable
          columns={taskColumns}
          data={filteredTasks}
          emptyMessage="No tasks match your filters"
        />
      </Card>
    </>
  );
}
