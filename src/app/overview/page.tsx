"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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
          title="Dashboard"
          description="Monitor your shipped environments, active runs, and scoring"
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
  const runningCount = runList.filter((r) => r.status === "running").length;
  const completedCount = runList.filter(
    (r) => r.status === "completed",
  ).length;

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
      header: "Agent / Model",
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
      header: "Mean Score",
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
        title="Dashboard"
        description="Monitor your shipped environments, active runs, and scoring"
      />

      {/* Metric cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Shipped Environments"
          value={activeEnvCount}
          subtext={`${envList.length} provisioned`}
        />
        <MetricCard
          label="Registered Tasks"
          value={totalTasks}
          subtext={`Across ${envList.length} environments`}
        />
        <MetricCard
          label="Runs"
          value={runList.length}
          subtext={
            runningCount > 0
              ? `${runningCount} active · ${completedCount} completed`
              : `${completedCount} completed`
          }
        />
        <MetricCard
          label="Scoring Profile"
          value={defaultCalibrationName}
          subtext={
            defaultProfile
              ? `Center ${defaultProfile.sigmoid_center} / Steep ${defaultProfile.sigmoid_steepness}`
              : undefined
          }
        />
      </div>

      {/* Recent run activity */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Recent Run Activity</CardTitle>
          <Link href="/runs">
            <Button variant="ghost" size="sm">
              View all runs
            </Button>
          </Link>
        </CardHeader>
        <DataTable
          columns={runColumns}
          data={recentRuns}
          onRowClick={(run) => router.push(`/runs/${run.id}`)}
        />
      </Card>
    </>
  );
}
