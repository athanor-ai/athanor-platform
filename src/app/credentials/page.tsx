"use client";

import { useCredentials } from "@/hooks/useCredentials";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import type { Credential } from "@/types/database";

const PROVIDERS = [
  {
    key: "openai" as const,
    name: "OpenAI",
    description: "GPT-4, GPT-4o, o1",
  },
  {
    key: "anthropic" as const,
    name: "Anthropic",
    description: "Claude 3.5, Claude 3 Opus",
  },
  {
    key: "gemini" as const,
    name: "Google Gemini",
    description: "Gemini 2.0, Gemini Pro",
  },
  {
    key: "azure_openai" as const,
    name: "Azure OpenAI",
    description: "Azure-hosted OpenAI models",
  },
  {
    key: "bedrock" as const,
    name: "AWS Bedrock",
    description: "Claude, Titan, and more via AWS",
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
          <span className="text-xs text-text-secondary">{credential.label}</span>
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

      <div className="mt-4 flex items-center gap-2">
        <Button size="sm">Edit</Button>
        <Button size="sm" variant="danger">Revoke</Button>
      </div>
    </Card>
  );
}

function NotConfiguredCard({ provider }: { provider: typeof PROVIDERS[number] }) {
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
        <Button variant="primary" size="sm">Connect</Button>
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
          description="Manage API keys for model providers"
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
