"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PiDownloadSimple, PiGithubLogo } from "react-icons/pi";
import {
  useEnvironment,
  useEnvironmentVersions,
} from "@/hooks/useEnvironments";
import { useTasksByEnvironment } from "@/hooks/useTasks";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { REAL_HEATMAP_DATA } from "@/data/heatmap";
import { BASELINE_MODELS } from "@/data/models";
import type { EnvironmentVersion, Task } from "@/types/database";

function getEnvStats(slug: string) {
  const heatmap = REAL_HEATMAP_DATA[slug];
  if (!heatmap) return { tasks: 0, meanScore: 0, hardest: 0 };

  const allScores: number[] = [];
  for (const model of BASELINE_MODELS) {
    const cells = heatmap[model.slug];
    if (cells) {
      for (const c of cells) allScores.push(c.score);
    }
  }

  const tasks = new Set(
    Object.values(heatmap).flatMap((cells) => cells.map((c) => c.task)),
  ).size;

  const mean =
    allScores.length > 0
      ? allScores.reduce((a, b) => a + b, 0) / allScores.length
      : 0;

  const hardest = allScores.filter((s) => s < 0.05).length;

  return { tasks, meanScore: mean, hardest };
}

export default function EnvironmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const environment = useEnvironment(id);
  const versions = useEnvironmentVersions(id);
  const tasks = useTasksByEnvironment(id);

  const isPending =
    environment.isPending || versions.isPending || tasks.isPending;

  if (isPending) {
    return <LoadingState message="Loading environment..." />;
  }

  const env = environment.data;

  if (!env) {
    return (
      <EmptyState
        title="Environment not found"
        description={`No environment exists with ID "${id}".`}
        action={
          <Link href="/environments">
            <Button variant="secondary">Back to Environments</Button>
          </Link>
        }
      />
    );
  }

  const versionList = versions.data ?? [];
  const taskList = tasks.data ?? [];

  // Sort versions by created_at descending to find the latest
  const sortedVersions = [...versionList].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const latestVersion = sortedVersions[0]?.version_tag ?? "No versions";

  // Download stats from heatmap data
  const stats = getEnvStats(env.slug);

  const versionColumns: Column<EnvironmentVersion>[] = [
    {
      key: "version_tag",
      header: "Version",
      render: (v) => (
        <span className="font-mono text-xs font-medium text-text-primary">
          {v.version_tag}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (v) => <StatusBadge status={v.status} />,
    },
    {
      key: "docker_image",
      header: "Docker Image",
      className: "max-w-[200px]",
      render: (v) => (
        <span className="block truncate font-mono text-xs text-text-secondary">
          {v.docker_image}
        </span>
      ),
    },
    {
      key: "changelog",
      header: "Changelog",
      className: "max-w-[280px]",
      render: (v) => (
        <span className="block truncate text-xs text-text-secondary">
          {v.changelog}
        </span>
      ),
    },
    {
      key: "published_at",
      header: "Published",
      render: (v) => (
        <span className="text-xs text-text-tertiary">
          {v.published_at
            ? new Date(v.published_at).toLocaleDateString()
            : "\u2014"}
        </span>
      ),
    },
  ];

  const taskColumns: Column<Task>[] = [
    {
      key: "name",
      header: "Name",
      render: (t) => (
        <span className="text-xs font-medium text-text-primary">{t.name}</span>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (t) => (
        <span className="text-xs text-text-secondary">{t.category}</span>
      ),
    },
    {
      key: "difficulty",
      header: "Difficulty",
      render: (t) => <StatusBadge status={t.difficulty} />,
    },
  ];

  return (
    <>
      <PageHeader
        title={env.name}
        description={`${env.engine} engine \u00b7 ${env.description}`}
        actions={
          <Link href="/environments">
            <Button variant="ghost" size="sm">
              Back to Environments
            </Button>
          </Link>
        }
      />

      {/* Metric cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Status" value={env.status} />
        <MetricCard label="Engine" value={env.engine} />
        <MetricCard label="Tasks" value={taskList.length} />
        <MetricCard label="Latest Version" value={latestVersion} />
      </div>

      {/* Download section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Download</CardTitle>
        </CardHeader>
        <div className="space-y-3 px-6 pb-6">
          <p className="text-sm text-text-secondary">
            Self-contained package. Download, build, evaluate. No platform
            dependency required.
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-surface-secondary p-2">
              <div className="text-lg font-semibold text-text-primary">
                {stats.tasks}
              </div>
              <div className="text-xs text-text-tertiary">tasks</div>
            </div>
            <div className="rounded-md bg-surface-secondary p-2">
              <div className="text-lg font-semibold text-text-primary">
                {stats.meanScore.toFixed(2)}
              </div>
              <div className="text-xs text-text-tertiary">avg score</div>
            </div>
            <div className="rounded-md bg-surface-secondary p-2">
              <div className="text-lg font-semibold text-text-primary">
                {stats.hardest}
              </div>
              <div className="text-xs text-text-tertiary">frontier</div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={() =>
                window.open(
                  `https://github.com/athanor-ai/${env.slug}/releases/latest`,
                  "_blank",
                )
              }
            >
              <PiDownloadSimple className="mr-1.5 h-4 w-4" />
              Download {latestVersion}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                window.open(
                  `https://github.com/athanor-ai/${env.slug}`,
                  "_blank",
                )
              }
            >
              <PiGithubLogo className="mr-1.5 h-4 w-4" />
              GitHub
            </Button>
          </div>

          <p className="text-xs text-text-tertiary">
            Includes: Containerfile, scoring harness, {stats.tasks} task
            configs, 5-model baselines, calibration toolkit, and production
            Docker Compose.
          </p>
        </div>
      </Card>

      {/* Versions table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Versions</CardTitle>
        </CardHeader>
        <DataTable
          columns={versionColumns}
          data={sortedVersions}
          emptyMessage="No versions published yet"
        />
      </Card>

      {/* Tasks table */}
      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
        </CardHeader>
        <DataTable
          columns={taskColumns}
          data={taskList}
          onRowClick={(task) => router.push(`/tasks?task=${task.id}`)}
          emptyMessage="No tasks defined for this environment"
        />
      </Card>
    </>
  );
}
