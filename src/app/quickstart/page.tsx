"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ATHANOR_ENVIRONMENTS } from "@/data/environments";

const STEPS = [
  {
    title: "1. Download an environment",
    description: "Each environment is a self-contained package with tasks, scoring, and baselines.",
    code: (env: string) => `# Download from GitHub
gh release download v1.0.0 -R athanor-ai/${env} -p '*.tar.gz'
tar xzf ${env}-v1.0.0.tar.gz
cd ${env}-v1.0.0`,
  },
  {
    title: "2. Build the container",
    description: "One command builds the scoring container with all tools pre-installed.",
    code: (env: string) => `# Build (takes 2-5 minutes)
./build.sh

# Verify
docker images | grep ${env}`,
  },
  {
    title: "3. Run your first evaluation",
    description: "Score any model against all tasks. Results are deterministic and reproducible.",
    code: (env: string) => `# Set your API key (any LiteLLM-compatible provider)
export OPENAI_API_KEY=sk-...

# Evaluate with 3 independent runs
python3 scripts/evaluate.py . --all-tasks --model gpt-4o --output runs/gpt-4o_run1.json
python3 scripts/evaluate.py . --all-tasks --model gpt-4o --output runs/gpt-4o_run2.json
python3 scripts/evaluate.py . --all-tasks --model gpt-4o --output runs/gpt-4o_run3.json`,
  },
  {
    title: "4. Compare with baselines",
    description: "Your results sit alongside our 5-model baselines in the interactive heatmap.",
    code: (env: string) => `# Regenerate heatmap with your model added
python3 scripts/finalize_readme.py .

# View results
open scores.svg  # or: python3 -m http.server 8080`,
  },
  {
    title: "5. Integrate with RL training",
    description: "Use the scoring endpoint in your training loop. Each call returns a [0,1] reward.",
    code: (env: string) => `# Score a single submission (the RL reward signal)
./scripts/rl_wrapper.sh . <task_id> /path/to/agent/workspace

# Returns JSON: {"score": 0.73, "metadata": {...}}
# score=0 means no progress, score=1 means fully solved
# Partial solutions get partial credit (sigmoid-calibrated)`,
  },
  {
    title: "6. Tune difficulty",
    description: "Switch between training (generous) and eval (strict) scoring presets.",
    code: (env: string) => `# Training preset: rewards partial progress (good for RL gradient)
python3 scripts/calibrate.py preset training

# Eval preset: strict pass/fail (good for benchmarking)
python3 scripts/calibrate.py preset eval

# Per-task adjustment
python3 scripts/calibrate.py set <task_id> center=0.60`,
  },
];

export default function QuickstartPage() {
  const [selectedEnv, setSelectedEnv] = useState(ATHANOR_ENVIRONMENTS[0].slug);

  return (
    <>
      <PageHeader
        title="Quick Start"
        subtitle="From download to your first RL training signal in 10 minutes"
      />

      {/* Environment selector */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Choose your environment:
        </label>
        <div className="flex flex-wrap gap-2">
          {ATHANOR_ENVIRONMENTS.map((env) => (
            <button
              key={env.slug}
              onClick={() => setSelectedEnv(env.slug)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                selectedEnv === env.slug
                  ? "bg-accent-primary text-white"
                  : "bg-surface-secondary text-text-secondary hover:bg-surface-tertiary"
              }`}
            >
              {env.name}
            </button>
          ))}
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-6">
        {STEPS.map((step, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle>{step.title}</CardTitle>
              <p className="text-sm text-text-secondary mt-1">{step.description}</p>
            </CardHeader>
            <div className="px-6 pb-6">
              <pre className="bg-surface-primary border border-border-primary rounded-lg p-4 text-sm font-mono overflow-x-auto whitespace-pre">
                {step.code(selectedEnv)}
              </pre>
            </div>
          </Card>
        ))}
      </div>

      {/* Training integration section */}
      <div className="mt-12">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Training Loop Integration
        </h2>
        <Card>
          <div className="p-6">
            <p className="text-sm text-text-secondary mb-4">
              The environment acts as a reward function. Your training loop:
            </p>
            <pre className="bg-surface-primary border border-border-primary rounded-lg p-4 text-sm font-mono overflow-x-auto whitespace-pre">
{`# Python pseudocode for RL training integration
import json, subprocess

def get_reward(task_id: str, agent_workspace: str) -> float:
    """Score the agent's work on a single task. Returns [0, 1]."""
    result = subprocess.run(
        ["./scripts/rl_wrapper.sh", ".", task_id, agent_workspace],
        capture_output=True, text=True
    )
    return json.loads(result.stdout)["score"]

# Your training loop
for episode in range(num_episodes):
    task = sample_task()                    # pick a task
    workspace = agent.attempt(task)          # agent writes code
    reward = get_reward(task.id, workspace)  # deterministic reward
    agent.update(reward)                     # RL update step
    reset_workspace(workspace)               # clean for next episode`}
            </pre>
            <p className="text-sm text-text-tertiary mt-4">
              Scores are deterministic (same code = same score) and continuous
              (partial solutions get partial credit). No LLM judges, no variance.
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}
