"use client";

import { useState, useCallback } from "react";
import { useCredentials } from "@/hooks/useCredentials";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import type { Credential } from "@/types/database";

type ProviderKey =
  | "openai"
  | "anthropic"
  | "gemini"
  | "azure_openai"
  | "bedrock";

const PROVIDERS: {
  key: ProviderKey;
  name: string;
  description: string;
  placeholder: string;
}[] = [
  {
    key: "openai",
    name: "OpenAI",
    description: "GPT-4, GPT-4o, o1",
    placeholder: "sk-...",
  },
  {
    key: "anthropic",
    name: "Anthropic",
    description: "Claude Sonnet 4, Claude 3 Opus",
    placeholder: "sk-ant-...",
  },
  {
    key: "gemini",
    name: "Google Gemini",
    description: "Gemini 2.0, Gemini Pro",
    placeholder: "AIza...",
  },
  {
    key: "azure_openai",
    name: "Azure OpenAI",
    description: "Azure-hosted OpenAI models",
    placeholder: "your-azure-api-key",
  },
  {
    key: "bedrock",
    name: "AWS Bedrock",
    description: "Claude, Titan, and more via AWS",
    placeholder: "your-aws-access-key",
  },
];

function ProviderAvatar({ name }: { name: string }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-surface-overlay text-lg font-semibold text-text-primary">
      {name.charAt(0)}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Test result display                                                */
/* ------------------------------------------------------------------ */

function TestResultBanner({ model }: { model: string }) {
  return (
    <div className="mt-3 rounded-md border border-success/30 bg-success/10 p-3">
      <p className="text-sm font-medium text-success">hello {model}</p>
      <p className="mt-0.5 text-[11px] text-success/70">
        Key verified successfully
      </p>
    </div>
  );
}

function TestErrorBanner({ error }: { error: string }) {
  return (
    <div className="mt-3 rounded-md border border-error/30 bg-error/10 p-3">
      <p className="text-xs text-error">{error}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Provider card with inline key input + test                         */
/* ------------------------------------------------------------------ */

function ProviderKeyCard({
  provider,
  credential,
}: {
  provider: (typeof PROVIDERS)[number];
  credential: Credential | undefined;
}) {
  const [apiKey, setApiKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [testModel, setTestModel] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  const handleTest = useCallback(async () => {
    const key = apiKey.trim();
    if (!key) return;

    setTesting(true);
    setTestModel(null);
    setTestError(null);

    try {
      const res = await fetch("/api/test-key", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: provider.key,
          apiKey: key,
        }),
      });
      const data = await res.json();

      if (data.ok) {
        setTestModel(data.model);
        setVerified(true);
      } else {
        setTestError(data.error ?? "Unknown error");
      }
    } catch (err) {
      setTestError(`Request failed: ${String(err)}`);
    } finally {
      setTesting(false);
    }
  }, [apiKey, provider.key]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        void handleTest();
      }
    },
    [handleTest],
  );

  const isConnected = !!credential || verified;

  return (
    <Card padding="lg">
      {/* Header */}
      <div className="flex items-start gap-3">
        <ProviderAvatar name={provider.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">
              {provider.name}
            </span>
            {verified ? (
              <StatusBadge status="Verified" variant="success" />
            ) : isConnected ? (
              <StatusBadge status="Connected" variant="success" />
            ) : (
              <StatusBadge status="Not Configured" variant="neutral" />
            )}
          </div>
          <p className="mt-0.5 text-xs text-text-tertiary">
            {provider.description}
          </p>
        </div>
      </div>

      {/* Existing credential info */}
      {credential && (
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-text-tertiary">Saved key</span>
            <span className="font-mono text-xs text-text-tertiary">
              {credential.encrypted_key}
            </span>
          </div>
          {credential.last_verified_at && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-text-tertiary">
                Last verified
              </span>
              <span className="text-xs text-text-secondary">
                {new Date(credential.last_verified_at).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      )}

      {/* API Key input */}
      <div className="mt-4">
        <label
          htmlFor={`key-${provider.key}`}
          className="mb-1.5 block text-[11px] font-medium text-text-secondary"
        >
          {credential ? "Enter key to re-test" : "API Key"}
        </label>
        <div className="flex gap-2">
          <input
            id={`key-${provider.key}`}
            type="password"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              // Clear previous results when key changes
              if (testModel || testError) {
                setTestModel(null);
                setTestError(null);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={provider.placeholder}
            className="flex-1 rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          <Button
            size="sm"
            variant="primary"
            onClick={() => void handleTest()}
            disabled={testing || !apiKey.trim()}
          >
            {testing ? "Testing..." : "Test Key"}
          </Button>
        </div>
      </div>

      {/* Test results */}
      {testModel && <TestResultBanner model={testModel} />}
      {testError && <TestErrorBanner error={testError} />}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function CredentialsPage() {
  const credentials = useCredentials();

  if (credentials.isPending) {
    return (
      <>
        <PageHeader
          title="API Keys"
          description="Enter and test API keys for the model providers used in your evaluation runs"
        />
        <LoadingState message="Loading credentials..." />
      </>
    );
  }

  const credentialList = credentials.data ?? [];
  const credentialMap = new Map<string, Credential>(
    credentialList.map((c) => [c.provider, c]),
  );

  return (
    <>
      <PageHeader
        title="API Keys"
        description="Enter your API keys below and test them instantly. After a successful test you will see a hello <model name> confirmation."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PROVIDERS.map((provider) => (
          <ProviderKeyCard
            key={provider.key}
            provider={provider}
            credential={credentialMap.get(provider.key)}
          />
        ))}
      </div>
    </>
  );
}
