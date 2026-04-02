"use client";

import { useState } from "react";
import { mockDocsPages } from "@/data/mock";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";

const CATEGORIES = [
  { key: "quickstart", label: "Getting Started" },
  { key: "concepts", label: "Concepts" },
  { key: "guides", label: "Guides" },
  { key: "reference", label: "API Reference" },
];

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
              <div className="space-y-4 text-xs leading-relaxed text-text-secondary">
                <p>{selectedPage.content}</p>
                <p>
                  The Athanor platform provides a unified interface for
                  evaluating AI agents across six core verification and systems
                  environments: Lean Theorem Proving, Cedar Policy Verification,
                  Distributed Consensus, Congestion Control, C-to-Rust, and
                  Hardware Verification (EBMC). Each environment is a versioned,
                  reproducible sandbox with domain-specific task families and
                  scoring criteria.
                </p>
                <p>
                  Evaluation runs execute a model against a set of tasks within
                  an environment, producing raw scores that are then transformed
                  through configurable calibration profiles. Verification-focused
                  environments (Lean, Cedar, EBMC) work best with the Strict
                  Binary calibration profile, while iterative environments
                  (C-to-Rust, Congestion Control) benefit from the Lenient
                  Gradient profile that rewards partial progress.
                </p>
                <p>
                  Baselines establish reference performance levels for known
                  models across all six environments, enabling relative
                  comparisons across model versions, prompting strategies, and
                  fine-tuning approaches. The platform tracks baseline runs
                  independently from evaluation runs to maintain a stable
                  reference point as environments evolve.
                </p>
                <p>
                  For programmatic access, the REST API and Python SDK provide
                  full control over environments, runs, calibration profiles, and
                  results. Training integration is supported through Docker
                  containers and Kubernetes job specs that connect RL training
                  loops directly to Athanor environments.
                </p>
              </div>
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
