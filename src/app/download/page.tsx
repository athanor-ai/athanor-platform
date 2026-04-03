"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ATHANOR_ENVIRONMENTS } from "@/data/environments";
import { REAL_HEATMAP_DATA } from "@/data/heatmap";
import { BASELINE_MODELS } from "@/data/models";

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

  const mean = allScores.length > 0
    ? allScores.reduce((a, b) => a + b, 0) / allScores.length
    : 0;

  const hardest = allScores.filter((s) => s < 0.05).length;

  return { tasks, meanScore: mean, hardest };
}

export default function DownloadPage() {
  return (
    <>
      <PageHeader
        title="Download Environments"
        subtitle="Each environment is a self-contained package. Download, build, evaluate. No platform dependency required."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {ATHANOR_ENVIRONMENTS.map((env) => {
          const stats = getEnvStats(env.slug);
          return (
            <Card key={env.id}>
              <CardHeader>
                <CardTitle>{env.name}</CardTitle>
                <p className="text-sm text-text-secondary mt-1">
                  {stats.tasks} tasks across easy, medium, and hard tiers
                </p>
              </CardHeader>
              <div className="px-6 pb-6 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-surface-secondary rounded-md p-2">
                    <div className="text-lg font-semibold text-text-primary">
                      {stats.tasks}
                    </div>
                    <div className="text-xs text-text-tertiary">tasks</div>
                  </div>
                  <div className="bg-surface-secondary rounded-md p-2">
                    <div className="text-lg font-semibold text-text-primary">
                      {stats.meanScore.toFixed(2)}
                    </div>
                    <div className="text-xs text-text-tertiary">avg score</div>
                  </div>
                  <div className="bg-surface-secondary rounded-md p-2">
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
                    Download v1.0.0
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
                    GitHub
                  </Button>
                </div>

                <p className="text-xs text-text-tertiary">
                  Includes: Containerfile, scoring harness, {stats.tasks} task
                  configs, 5-model baselines, calibration toolkit, and
                  production Docker Compose.
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 p-4 bg-surface-secondary rounded-lg border border-border-primary">
        <h3 className="text-sm font-medium text-text-primary mb-2">
          No platform account needed
        </h3>
        <p className="text-sm text-text-secondary">
          Each package runs completely offline. The scoring container includes
          all verifiers (Lean 4, EBMC, Cedar CLI, Go, Cargo, Verus). Your
          agent&apos;s code never leaves your infrastructure. The platform is
          optional -- use it to compare results, launch cloud runs, or browse
          task details.
        </p>
      </div>
    </>
  );
}
