"use client";

import Link from "next/link";
import { useEnvironments } from "@/hooks/useEnvironments";
import { useRuns } from "@/hooks/useRuns";
import { useTasks } from "@/hooks/useTasks";
import { useCalibrationProfiles } from "@/hooks/useCalibration";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import type { Run } from "@/types/database";

export default function OverviewPage() {
  const environments = useEnvironments();
  const runs = useRuns();
  const tasks = useTasks();
  const calibration = useCalibrationProfiles();

  const isPending =
    environments.isPending ||
    runs.isPending ||
    tasks.isPending ||
    calibration.isPending;

  if (isPending) {
    return (
      <>
        <PageHeader
          title="Overview"
          description="Athanor RL environment status at a glance"
        />
        <LoadingState message="Loading dashboard..." />
      </>
    );
  }

  const envList = environments.data ?? [];
  const runList = runs.data ?? [];
  const taskList = tasks.data ?? [];
  const profileList = calibration.data ?? [];

  const activeEnvCount = envList.filter((e) => e.status === "active").length;
  const totalTasks = taskList.length;

  const recentRunCount = runList.length;

  const defaultProfile = profileList.find((p) => p.is_default);
  const defaultCalibrationName = defaultProfile?.name ?? "None";

  // Last 5 runs sorted by created_at descending
  const recentRuns = [...runList]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 5);

  const envMap = new Map(envList.map((e) => [e.id, e.name]));

  const runColumns: Column<Run>[] = [
    {
      key: "model",
      header: "Model",
      render: (run) => (
        <span className="font-mono text-xs text-text-primary">
          {run.model_name}
        </span>
      ),
    },
    {
      key: "environment",
      header: "Environment",
      render: (run) => (
        <span className="text-text-secondary">
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
      key: "score",
      header: "Score",
      render: (run) => (
        <span className="font-mono text-xs text-text-primary">
          {run.mean_score !== null ? run.mean_score.toFixed(2) : "\u2014"}
        </span>
      ),
    },
    {
      key: "tasks",
      header: "Tasks",
      render: (run) => (
        <span className="text-xs text-text-secondary">
          {run.completed_tasks}/{run.total_tasks}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Overview"
        description="Athanor RL environment status at a glance"
      />

      {/* Metric cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Active Environments"
          value={activeEnvCount}
          subtext={`${envList.length} total`}
        />
        <MetricCard
          label="Total Tasks"
          value={totalTasks}
          subtext={`Across ${envList.length} environments`}
        />
        <MetricCard
          label="Recent Runs"
          value={recentRunCount}
          subtext="Last 7 days"
        />
        <MetricCard
          label="Default Calibration"
          value={defaultCalibrationName}
          subtext={
            defaultProfile
              ? `Center ${defaultProfile.sigmoid_center} / Steep ${defaultProfile.sigmoid_steepness}`
              : undefined
          }
        />
      </div>

      {/* Recent runs table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Recent Runs</CardTitle>
          <Link href="/runs">
            <Button variant="ghost" size="sm">
              View all
            </Button>
          </Link>
        </CardHeader>
        <DataTable columns={runColumns} data={recentRuns} />
      </Card>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <div className="flex flex-wrap gap-3">
          <Link href="/runs?action=new">
            <Button variant="primary">New Run</Button>
          </Link>
          <Link href="/tasks">
            <Button variant="secondary">Browse Tasks</Button>
          </Link>
          <Link href="/baselines">
            <Button variant="secondary">View Baselines</Button>
          </Link>
        </div>
      </Card>
    </>
  );
}
