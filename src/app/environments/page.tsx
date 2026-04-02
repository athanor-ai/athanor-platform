"use client";

import Link from "next/link";
import { useEnvironments } from "@/hooks/useEnvironments";
import { useTasks } from "@/hooks/useTasks";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";

export default function EnvironmentsPage() {
  const environments = useEnvironments();
  const tasks = useTasks();

  const isPending = environments.isPending || tasks.isPending;

  if (isPending) {
    return (
      <>
        <PageHeader
          title="Environments"
          description="Versioned evaluation sandboxes for RL agent benchmarking"
          actions={<Button variant="primary">New Environment</Button>}
        />
        <LoadingState message="Loading environments..." />
      </>
    );
  }

  const envList = environments.data ?? [];
  const taskList = tasks.data ?? [];

  // Build a map of environment_id -> task count
  const taskCountMap = new Map<string, number>();
  for (const task of taskList) {
    taskCountMap.set(
      task.environment_id,
      (taskCountMap.get(task.environment_id) ?? 0) + 1,
    );
  }

  if (envList.length === 0) {
    return (
      <>
        <PageHeader
          title="Environments"
          description="Versioned evaluation sandboxes for RL agent benchmarking"
          actions={<Button variant="primary">New Environment</Button>}
        />
        <EmptyState
          title="No environments yet"
          description="Create your first evaluation environment to start benchmarking agents."
          action={<Button variant="primary">New Environment</Button>}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Environments"
        description="Versioned evaluation sandboxes for RL agent benchmarking"
        actions={<Button variant="primary">New Environment</Button>}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {envList.map((env) => (
          <Link key={env.id} href={`/environments/${env.id}`}>
            <Card hover>
              <CardHeader>
                <CardTitle>{env.name}</CardTitle>
                <StatusBadge status={env.status} />
              </CardHeader>

              <div className="mb-3">
                <span className="rounded-sm bg-surface-overlay px-1.5 py-0.5 font-mono text-xs text-text-secondary">
                  {env.engine}
                </span>
              </div>

              <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-text-secondary">
                {env.description}
              </p>

              <div className="text-[11px] text-text-tertiary">
                {taskCountMap.get(env.id) ?? 0} tasks
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
