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
import type { EnvironmentVersion, Task } from "@/types/database";

/** Build the GitHub download link for a task file. */
function taskGithubUrl(task: Task): string {
  return `https://github.com/athanor-ai/congestion-control/blob/master/student_data/${task.slug}`;
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
    {
      key: "download",
      header: "Download",
      render: (t) => (
        <a
          href={taskGithubUrl(t)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 rounded-sm border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-text-secondary transition-colors hover:border-accent/30 hover:text-accent"
        >
          <PiGithubLogo className="h-3 w-3" />
          Source
        </a>
      ),
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
            Download task files for this environment. Each task is available as a
            source file on GitHub.
          </p>
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() =>
                window.open(
                  "https://github.com/athanor-ai/congestion-control/tree/master/student_data",
                  "_blank",
                )
              }
            >
              <PiDownloadSimple className="mr-1.5 h-4 w-4" />
              Browse All Files
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                window.open(
                  "https://github.com/athanor-ai/congestion-control",
                  "_blank",
                )
              }
            >
              <PiGithubLogo className="mr-1.5 h-4 w-4" />
              GitHub Repo
            </Button>
          </div>
          <p className="text-xs text-text-tertiary">
            Includes: Containerfile, scoring harness, {taskList.length} task
            configs, baselines, calibration toolkit, and production Docker
            Compose.
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
