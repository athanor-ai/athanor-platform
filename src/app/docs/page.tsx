"use client";

import { useState } from "react";
import { mockDocsPages } from "@/data/mock";
import { ATHANOR_ENVIRONMENTS } from "@/data/environments";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";

const CATEGORIES = [
  { key: "quickstart", label: "Getting Started" },
  { key: "concepts", label: "Concepts" },
  { key: "guides", label: "Guides" },
  { key: "reference", label: "API Reference" },
];

/** Expanded content per doc page — each page gets unique, relevant content. */
const EXPANDED_CONTENT: Record<string, React.ReactNode> = {
  "getting-started": (
    <div className="space-y-4 text-xs leading-relaxed text-text-secondary">
      <p>
        Athanor provides versioned RL training environments for formal
        verification, systems engineering, and safe code generation. This guide
        walks you through the key concepts.
      </p>
      <h4 className="text-sm font-medium text-text-primary">Core workflow</h4>
      <ol className="ml-4 list-decimal space-y-1">
        <li>Choose an environment from the six available suites.</li>
        <li>Run an evaluation against a set of tasks within that environment.</li>
        <li>
          Review calibrated scores — raw scores are transformed through
          configurable sigmoid profiles.
        </li>
        <li>
          Compare results against baselines to track model improvement over
          time.
        </li>
      </ol>
      <h4 className="text-sm font-medium text-text-primary">
        Available environments
      </h4>
      <ul className="ml-4 list-disc space-y-1">
        {ATHANOR_ENVIRONMENTS.map((env) => (
          <li key={env.id}>
            <span className="font-medium text-text-primary">{env.name}</span>
            {" — "}
            <span className="font-mono text-[11px] text-text-tertiary">
              {env.slug}
            </span>
          </li>
        ))}
      </ul>
    </div>
  ),
  "environments-overview": (
    <div className="space-y-4 text-xs leading-relaxed text-text-secondary">
      <p>
        Athanor ships six core environments. Each is a versioned, reproducible
        sandbox with domain-specific task families and scoring criteria.
      </p>
      {ATHANOR_ENVIRONMENTS.map((env) => (
        <div key={env.id} className="rounded-md bg-surface p-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">
              {env.name}
            </span>
            <span className="rounded-sm bg-surface-overlay px-1.5 py-0.5 font-mono text-[10px] text-text-tertiary">
              {env.engine}
            </span>
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            {env.description}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {env.taskFamilies.map((tf) => (
              <span
                key={tf}
                className="rounded-sm bg-surface-overlay px-1.5 py-0.5 text-[10px] text-text-tertiary"
              >
                {tf}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
  "calibration-guide": (
    <div className="space-y-4 text-xs leading-relaxed text-text-secondary">
      <p>
        Calibration profiles control how raw scores are transformed into
        calibrated scores using a sigmoid function. This two-stage scoring
        separates objective task completion from the subjective weighting of
        partial progress, time efficiency, and step economy.
      </p>
      <h4 className="text-sm font-medium text-text-primary">
        Profile parameters
      </h4>
      <div className="space-y-2">
        <div className="rounded-md bg-surface p-3">
          <span className="font-mono text-xs text-accent">sigmoid_center</span>
          <p className="mt-1">
            The raw score value where the sigmoid outputs 0.5. Scores above
            this receive greater-than-half credit.
          </p>
        </div>
        <div className="rounded-md bg-surface p-3">
          <span className="font-mono text-xs text-accent">sigmoid_steepness</span>
          <p className="mt-1">
            Controls how sharply the curve transitions around the center.
            Higher values approach binary pass/fail; lower values allow gradual
            reward.
          </p>
        </div>
        <div className="rounded-md bg-surface p-3">
          <span className="font-mono text-xs text-accent">time_weight</span>
          <p className="mt-1">
            How much the duration of task completion factors into the final
            calibrated score.
          </p>
        </div>
        <div className="rounded-md bg-surface p-3">
          <span className="font-mono text-xs text-accent">step_penalty</span>
          <p className="mt-1">
            Per-step penalty deducted from the calibrated score to encourage
            efficient solutions.
          </p>
        </div>
      </div>
      <h4 className="text-sm font-medium text-text-primary">
        Recommended profiles per environment type
      </h4>
      <ul className="ml-4 list-disc space-y-1">
        <li>
          <span className="font-medium text-text-primary">Strict Binary</span> —
          Lean, Cedar, EBMC (proofs either check or they don&apos;t)
        </li>
        <li>
          <span className="font-medium text-text-primary">Lenient Gradient</span>{" "}
          — C-to-Rust, Congestion Control (partial progress matters)
        </li>
        <li>
          <span className="font-medium text-text-primary">Default Sigmoid</span>{" "}
          — Distributed Consensus and general-purpose evaluations
        </li>
      </ul>
    </div>
  ),
  "api-reference": (
    <div className="space-y-4 text-xs leading-relaxed text-text-secondary">
      <p>
        The Athanor REST API provides programmatic access to environments,
        runs, calibration profiles, baselines, and results.
      </p>
      <h4 className="text-sm font-medium text-text-primary">
        Key endpoints
      </h4>
      <div className="space-y-2">
        {[
          { method: "GET", path: "/api/v1/environments", desc: "List all environments" },
          { method: "GET", path: "/api/v1/environments/:id", desc: "Get environment detail" },
          { method: "GET", path: "/api/v1/tasks", desc: "List tasks (filterable by environment)" },
          { method: "GET", path: "/api/v1/runs", desc: "List evaluation runs" },
          { method: "GET", path: "/api/v1/runs/:id/results", desc: "Get per-task results for a run" },
          { method: "GET", path: "/api/v1/baselines", desc: "List baseline comparisons" },
          { method: "GET", path: "/api/v1/calibration/profiles", desc: "List calibration profiles" },
        ].map((ep) => (
          <div key={ep.path} className="flex items-start gap-3 rounded-md bg-surface p-2">
            <span className="rounded-sm bg-accent/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-accent">
              {ep.method}
            </span>
            <div>
              <span className="font-mono text-xs text-text-primary">{ep.path}</span>
              <p className="text-[11px] text-text-tertiary">{ep.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-text-tertiary">
        Full OpenAPI spec available at <span className="font-mono">/api/v1/openapi.json</span>
      </p>
    </div>
  ),
  "training-integration": (
    <div className="space-y-4 text-xs leading-relaxed text-text-secondary">
      <p>
        Athanor environments integrate with RL training pipelines through three
        interfaces: Docker containers, Kubernetes job specs, and the Python SDK.
        See the Training page for complete examples.
      </p>
      <h4 className="text-sm font-medium text-text-primary">Quick start</h4>
      <pre className="overflow-x-auto rounded-md bg-surface p-3 font-mono text-[11px] text-text-tertiary">
{`pip install athanor-sdk

import athanor
client = athanor.Client(api_key="sk-...")
env = client.environments.get("lean-theorem-proving")
run = client.runs.create(
    environment_id=env.id,
    model_name="claude-3.5-sonnet",
)`}
      </pre>
      <h4 className="text-sm font-medium text-text-primary">
        Supported environment slugs
      </h4>
      <div className="flex flex-wrap gap-1.5">
        {ATHANOR_ENVIRONMENTS.map((env) => (
          <span
            key={env.id}
            className="rounded-sm bg-surface-overlay px-1.5 py-0.5 font-mono text-[10px] text-text-tertiary"
          >
            {env.slug}
          </span>
        ))}
      </div>
    </div>
  ),
};

export default function DocsPage() {
  const [selectedPageId, setSelectedPageId] = useState(mockDocsPages[0]?.id ?? "");

  const selectedPage = mockDocsPages.find((p) => p.id === selectedPageId) ?? mockDocsPages[0];

  return (
    <>
      <PageHeader
        title="Documentation"
        description="Guides, references, and API documentation for Athanor verification environments"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left sidebar navigation */}
        <div className="lg:col-span-1">
          <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
            Categories
          </div>
          <div className="space-y-1">
            {CATEGORIES.map((category) => {
              const pages = mockDocsPages.filter(
                (p) => p.category === category.key,
              );
              return (
                <div key={category.key}>
                  <div className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                    {category.label}
                  </div>
                  {pages.map((page) => (
                    <div
                      key={page.id}
                      className={`cursor-pointer rounded-md px-3 py-1.5 text-xs transition-colors ${
                        selectedPage?.id === page.id
                          ? "bg-accent/10 text-accent"
                          : "text-text-secondary hover:bg-surface-overlay hover:text-text-primary"
                      }`}
                      onClick={() => setSelectedPageId(page.id)}
                    >
                      {page.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right content area */}
        <div className="lg:col-span-3">
          {selectedPage ? (
            <Card padding="lg">
              <CardTitle className="text-base">{selectedPage.title}</CardTitle>
              <div className="mt-1 mb-4 text-[11px] text-text-tertiary">
                Last updated{" "}
                {new Date(selectedPage.updated_at).toLocaleDateString()}
              </div>
              {EXPANDED_CONTENT[selectedPage.slug] ?? (
                <div className="text-xs leading-relaxed text-text-secondary">
                  <p>{selectedPage.content}</p>
                </div>
              )}
            </Card>
          ) : (
            <Card padding="lg">
              <div className="py-8 text-center text-xs text-text-tertiary">
                Select a documentation page from the sidebar.
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
