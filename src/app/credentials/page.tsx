"use client";

import { useState, useCallback } from "react";
import { useCredentials } from "@/hooks/useCredentials";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import type { Credential } from "@/types/database";

const PROVIDERS = [
  {
    key: "anthropic" as const,
    name: "Anthropic",
    description: "Claude Sonnet 4.6",
  },
  {
    key: "mistral" as const,
    name: "Mistral AI",
    description: "Mistral Large 3",
  },
  {
    key: "moonshot" as const,
    name: "Moonshot AI",
    description: "Kimi K2.5",
  },
  {
    key: "gemini" as const,
    name: "Google Gemini",
    description: "Gemini 3.1 Pro, Gemini 2.5 Flash",
  },
  {
    key: "bedrock" as const,
    name: "AWS Bedrock",
    description: "Claude, Mistral, and more via AWS",
  },
];

function ProviderAvatar({ name }: { name: string }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-surface-overlay text-lg font-semibold text-text-primary">
      {name.charAt(0)}
    </div>
  );
}

function ConnectedCard({ provider, credential }: { provider: typeof PROVIDERS[number]; credential: Credential }) {
  const [showRevoke, setShowRevoke] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyLabel = useCallback(() => {
    void navigator.clipboard.writeText(credential.label);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [credential.label]);

  return (
    <Card padding="lg">
      <div className="flex items-start gap-3">
        <ProviderAvatar name={provider.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">
              {provider.name}
            </span>
            <StatusBadge status="Connected" variant="success" />
          </div>
          <p className="mt-0.5 text-xs text-text-tertiary">
            {provider.description}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-text-tertiary">Label</span>
          <button
            className="cursor-pointer text-xs text-text-secondary transition-colors hover:text-accent"
            onClick={handleCopyLabel}
            title="Copy label to clipboard"
          >
            {copied ? "Copied!" : credential.label}
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-text-tertiary">Key</span>
          <span className="font-mono text-xs text-text-tertiary">{credential.encrypted_key}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-text-tertiary">Last Verified</span>
          <span className="text-xs text-text-secondary">
            {credential.last_verified_at
              ? new Date(credential.last_verified_at).toLocaleDateString()
              : "Never"}
          </span>
        </div>
      </div>

      <div className="mt-4">
        {showRevoke ? (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-error">Revoke this key?</span>
            <Button
              size="sm"
              variant="danger"
              onClick={() => setShowRevoke(false)}
            >
              Cancel
            </Button>
            <span className="text-[11px] text-text-tertiary">
              (API integration required)
            </span>
          </div>
        ) : (
          <Button
            size="sm"
            variant="danger"
            onClick={() => setShowRevoke(true)}
          >
            Revoke
          </Button>
        )}
      </div>
    </Card>
  );
}

function NotConfiguredCard({ provider }: { provider: typeof PROVIDERS[number] }) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <Card padding="lg">
      <div className="flex items-start gap-3">
        <ProviderAvatar name={provider.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">
              {provider.name}
            </span>
            <StatusBadge status="Not Configured" variant="neutral" />
          </div>
          <p className="mt-0.5 text-xs text-text-tertiary">
            {provider.description}
          </p>
        </div>
      </div>

      <div className="mt-4">
        {showHelp ? (
          <div className="space-y-2">
            <p className="text-[11px] text-text-secondary">
              To connect {provider.name}, add your API key via the Tahoe CLI
              or REST API:
            </p>
            <pre className="overflow-x-auto rounded-md bg-surface p-2 font-mono text-[11px] text-text-tertiary">
              {`tahoe credentials set ${provider.key} --key "sk-..."`}
            </pre>
            <Button size="sm" variant="ghost" onClick={() => setShowHelp(false)}>
              Dismiss
            </Button>
          </div>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => setShowHelp(true)}>
            How to connect
          </Button>
        )}
      </div>
    </Card>
  );
}

export default function CredentialsPage() {
  const credentials = useCredentials();

  if (credentials.isPending) {
    return (
      <>
        <PageHeader
          title="Credentials"
          description="Manage API keys for the model providers used in your evaluation runs"
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
        title="Credentials"
        description="Manage API keys for model providers"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PROVIDERS.map((provider) => {
          const credential = credentialMap.get(provider.key);
          return credential ? (
            <ConnectedCard
              key={provider.key}
              provider={provider}
              credential={credential}
            />
          ) : (
            <NotConfiguredCard key={provider.key} provider={provider} />
          );
        })}
      </div>
    </>
  );
}
