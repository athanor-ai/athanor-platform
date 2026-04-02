"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";

export default function TrainingPage() {
  return (
    <>
      <PageHeader
        title="Training"
        description="RL wrapper and infrastructure integration guides for Athanor verification environments"
      />

      <div className="space-y-6">
        {/* Docker Integration */}
        <Card padding="lg">
          <CardTitle>Docker Integration</CardTitle>
          <p className="mt-2 text-xs leading-relaxed text-text-secondary">
            Build and run training containers using the Athanor RL wrapper image.
            The wrapper provides a standardized interface for connecting your
            reinforcement learning agent to any Athanor environment — from Lean
            theorem proving to hardware verification with EBMC.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-md bg-surface p-4 font-mono text-xs leading-relaxed text-text-secondary">
{`docker pull athanor/rl-wrapper:latest`}
          </pre>
          <p className="mt-4 text-xs leading-relaxed text-text-secondary">
            Example Dockerfile for a Lean theorem proving training container:
          </p>
          <pre className="mt-2 overflow-x-auto rounded-md bg-surface p-4 font-mono text-xs leading-relaxed text-text-secondary">
{`FROM athanor/rl-wrapper:latest

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY train.py .
COPY agent/ ./agent/

ENV ATHANOR_ENV=lean-theorem-proving
ENV ATHANOR_MODEL=claude-3.5-sonnet

CMD ["python", "train.py"]`}
          </pre>
        </Card>

        {/* Kubernetes Deployment */}
        <Card padding="lg">
          <CardTitle>Kubernetes Deployment</CardTitle>
          <p className="mt-2 text-xs leading-relaxed text-text-secondary">
            Deploy training jobs to a Kubernetes cluster for scalable,
            distributed RL training runs. The following manifest defines a
            basic Job spec targeting the Cedar policy verification environment.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-md bg-surface p-4 font-mono text-xs leading-relaxed text-text-secondary">
{`apiVersion: batch/v1
kind: Job
metadata:
  name: athanor-rl-training
  namespace: athanor
spec:
  backoffLimit: 3
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: rl-trainer
          image: athanor/rl-wrapper:latest
          resources:
            requests:
              memory: "4Gi"
              cpu: "2"
            limits:
              memory: "8Gi"
              cpu: "4"
          env:
            - name: ATHANOR_API_KEY
              valueFrom:
                secretKeyRef:
                  name: athanor-credentials
                  key: api-key
            - name: ATHANOR_ENV
              value: "cedar-policy-verification"
            - name: ATHANOR_MODEL
              value: "claude-3.5-sonnet"`}
          </pre>
        </Card>

        {/* Python SDK */}
        <Card padding="lg">
          <CardTitle>Python SDK</CardTitle>
          <p className="mt-2 text-xs leading-relaxed text-text-secondary">
            Install the Athanor Python SDK for programmatic access to
            environments, runs, and baselines. The SDK provides a high-level
            interface for training loop integration across all six core
            environments.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-md bg-surface p-4 font-mono text-xs leading-relaxed text-text-secondary">
{`pip install athanor-sdk`}
          </pre>
          <p className="mt-4 text-xs leading-relaxed text-text-secondary">
            Example: running a C-to-Rust safe translation evaluation:
          </p>
          <pre className="mt-2 overflow-x-auto rounded-md bg-surface p-4 font-mono text-xs leading-relaxed text-text-secondary">
{`import athanor

client = athanor.Client(api_key="sk-...")

# Connect to the C-to-Rust environment
env = client.environments.get("c-to-rust")

# Start an evaluation run
run = client.runs.create(
    environment_id=env.id,
    model_name="claude-3.5-sonnet",
    config={"temperature": 0.0, "max_tokens": 4096},
)

# Stream results as tasks complete
for result in run.stream():
    print(f"Task {result.task_id}: {result.calibrated_score:.3f}")

print(f"Final mean score: {run.mean_score:.3f}")`}
          </pre>
        </Card>

        {/* Environment-specific notes */}
        <Card padding="lg">
          <CardTitle>Environment-Specific Notes</CardTitle>
          <p className="mt-2 text-xs leading-relaxed text-text-secondary">
            Each Athanor environment has unique resource requirements and
            execution characteristics:
          </p>
          <div className="mt-4 space-y-3">
            <div className="rounded-md bg-surface p-3">
              <span className="font-mono text-xs font-medium text-accent">lean-theorem-proving</span>
              <p className="mt-1 text-[11px] text-text-tertiary">
                Requires Lean 4 toolchain. Proofs are verified by the Lean kernel — binary pass/fail scoring recommended.
              </p>
            </div>
            <div className="rounded-md bg-surface p-3">
              <span className="font-mono text-xs font-medium text-accent">cedar-policy-verification</span>
              <p className="mt-1 text-[11px] text-text-tertiary">
                Uses the Cedar CLI for policy validation. Entailment checking tasks may require extended timeouts.
              </p>
            </div>
            <div className="rounded-md bg-surface p-3">
              <span className="font-mono text-xs font-medium text-accent">distributed-consensus</span>
              <p className="mt-1 text-[11px] text-text-tertiary">
                Network simulation runs in-process. Fault-injection tasks spawn multiple simulated nodes (5-7 typical).
              </p>
            </div>
            <div className="rounded-md bg-surface p-3">
              <span className="font-mono text-xs font-medium text-accent">congestion-control</span>
              <p className="mt-1 text-[11px] text-text-tertiary">
                Powered by ns-3 network simulator. Fairness-tuning tasks run for up to 60 simulated seconds.
              </p>
            </div>
            <div className="rounded-md bg-surface p-3">
              <span className="font-mono text-xs font-medium text-accent">c-to-rust</span>
              <p className="mt-1 text-[11px] text-text-tertiary">
                Requires cargo toolchain in the container. Translated code is compiled and tested against the C reference output.
              </p>
            </div>
            <div className="rounded-md bg-surface p-3">
              <span className="font-mono text-xs font-medium text-accent">hw-cbmc</span>
              <p className="mt-1 text-[11px] text-text-tertiary">
                Uses EBMC for bounded model checking on RTL designs. Memory-intensive — recommend 8 Gi+ per container.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
