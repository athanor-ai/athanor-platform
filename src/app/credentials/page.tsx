"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useCredentials } from "@/hooks/useCredentials";
import { useCredentialMutations } from "@/hooks/useCredentialMutations";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  PROVIDERS,
  type ProviderConfig,
} from "@/data/providers";
import type { CredentialSummary, CredentialProvider } from "@/types/database";

/* ------------------------------------------------------------------ */
/*  Provider avatar                                                    */
/* ------------------------------------------------------------------ */

function ProviderAvatar({ name }: { name: string }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-surface-overlay text-lg font-semibold text-text-primary">
      {name.charAt(0)}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Category label                                                     */
/* ------------------------------------------------------------------ */

function CategoryLabel({
  category,
}: {
  category: "direct" | "proxy";
}) {
  if (category === "direct") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        Direct API
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
      <span className="h-1.5 w-1.5 rounded-full bg-info" />
      Key + Base URL
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Credential form (add / edit) with key + optional base URL          */
/* ------------------------------------------------------------------ */

function CredentialForm({
  provider,
  existingCredential,
  onClose,
}: {
  provider: ProviderConfig;
  existingCredential?: CredentialSummary;
  onClose: () => void;
}) {
  const { addCredential, updateCredential } = useCredentialMutations();
  const [label, setLabel] = useState(
    existingCredential?.label ?? `${provider.name} API Key`,
  );
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(
    existingCredential?.base_url ?? (provider.requiresBaseUrl ? provider.baseUrlPlaceholder : ""),
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!existingCredential;
  const isPending = addCredential.isPending || updateCredential.isPending;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const trimmedKey = apiKey.trim();
      const trimmedLabel = label.trim();
      const trimmedBaseUrl = baseUrl.trim();

      if (!trimmedLabel) {
        setError("Label is required.");
        return;
      }
      if (!trimmedKey) {
        setError("API key is required.");
        return;
      }
      if (trimmedKey.length < 8) {
        setError("API key seems too short. Please check and try again.");
        return;
      }
      if (provider.requiresBaseUrl && !trimmedBaseUrl) {
        setError(`Base URL is required for ${provider.name}. ${provider.baseUrlHelp}`);
        return;
      }

      if (isEditing && existingCredential) {
        updateCredential.mutate(
          {
            id: existingCredential.id,
            label: trimmedLabel,
            apiKey: trimmedKey,
            baseUrl: trimmedBaseUrl || undefined,
          },
          {
            onSuccess: () => {
              setSuccess(true);
              setTimeout(onClose, 1200);
            },
            onError: () => setError("Failed to update credential."),
          },
        );
      } else {
        addCredential.mutate(
          {
            provider: provider.key as CredentialProvider,
            label: trimmedLabel,
            apiKey: trimmedKey,
            baseUrl: trimmedBaseUrl || undefined,
          },
          {
            onSuccess: () => {
              setSuccess(true);
              setTimeout(onClose, 1200);
            },
            onError: () => setError("Failed to save credential."),
          },
        );
      }
    },
    [apiKey, label, baseUrl, isEditing, existingCredential, addCredential, updateCredential, onClose, provider],
  );

  if (success) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
            <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {isEditing ? "Credential updated successfully." : "Credential saved successfully."}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Label */}
      <div>
        <label htmlFor={`label-${provider.key}`} className="mb-1 block text-[11px] font-medium text-text-secondary">
          Label
        </label>
        <input
          id={`label-${provider.key}`}
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
          placeholder="e.g. Production API Key"
          disabled={isPending}
        />
      </div>

      {/* API Key */}
      <div>
        <label htmlFor={`key-${provider.key}`} className="mb-1 block text-[11px] font-medium text-text-secondary">
          {provider.keyLabel}
        </label>
        <input
          ref={inputRef}
          id={`key-${provider.key}`}
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
          placeholder={provider.keyPlaceholder}
          autoComplete="off"
          disabled={isPending}
        />
        {provider.envVars.key && (
          <p className="mt-1 text-[10px] text-text-tertiary">
            Maps to <code className="rounded bg-surface-overlay px-1 py-0.5 font-mono">{provider.envVars.key}</code>
          </p>
        )}
      </div>

      {/* Base URL (conditional) */}
      {provider.requiresBaseUrl && (
        <div>
          <label htmlFor={`base-${provider.key}`} className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-text-secondary">
            Base URL
            <span className="rounded-sm bg-warning/15 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-warning">
              Required
            </span>
          </label>
          <input
            id={`base-${provider.key}`}
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
            placeholder={provider.baseUrlPlaceholder}
            disabled={isPending}
          />
          {provider.baseUrlHelp && (
            <p className="mt-1 text-[10px] text-text-tertiary">
              {provider.baseUrlHelp}
            </p>
          )}
          {provider.envVars.base && (
            <p className="mt-0.5 text-[10px] text-text-tertiary">
              Maps to <code className="rounded bg-surface-overlay px-1 py-0.5 font-mono">{provider.envVars.base}</code>
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-error">{error}</p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" variant="primary" size="sm" disabled={isPending}>
          {isPending ? "Saving..." : isEditing ? "Update Key" : "Save Key"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Connected card                                                     */
/* ------------------------------------------------------------------ */

function ConnectedCard({
  provider,
  credential,
}: {
  provider: ProviderConfig;
  credential: CredentialSummary;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "revoke">("view");
  const [copied, setCopied] = useState(false);
  const { revokeCredential } = useCredentialMutations();

  const handleCopyLabel = useCallback(() => {
    void navigator.clipboard.writeText(credential.label);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [credential.label]);

  const handleRevoke = useCallback(() => {
    revokeCredential.mutate(
      { id: credential.id },
      { onSuccess: () => setMode("view") },
    );
  }, [credential.id, revokeCredential]);

  if (mode === "edit") {
    return (
      <Card padding="lg">
        <div className="mb-3 flex items-start gap-3">
          <ProviderAvatar name={provider.name} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-primary">
                {provider.name}
              </span>
              <StatusBadge status="Editing" variant="info" />
            </div>
            <p className="mt-0.5 text-xs text-text-tertiary">
              {provider.description}
            </p>
          </div>
        </div>
        <CredentialForm
          provider={provider}
          existingCredential={credential}
          onClose={() => setMode("view")}
        />
      </Card>
    );
  }

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
            <CategoryLabel category={provider.category} />
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
          <span className="font-mono text-xs text-text-tertiary">
            {credential.key_suffix}
          </span>
        </div>
        {credential.base_url && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-text-tertiary">Base URL</span>
            <span className="max-w-[200px] truncate font-mono text-xs text-text-tertiary">
              {credential.base_url}
            </span>
          </div>
        )}
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
        {mode === "revoke" ? (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-error">Revoke this key?</span>
            <Button
              size="sm"
              variant="danger"
              onClick={handleRevoke}
              disabled={revokeCredential.isPending}
            >
              {revokeCredential.isPending ? "Revoking..." : "Confirm"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setMode("view")}
              disabled={revokeCredential.isPending}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setMode("edit")}
            >
              Update Key
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => setMode("revoke")}
            >
              Revoke
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Not-configured card                                                */
/* ------------------------------------------------------------------ */

function NotConfiguredCard({
  provider,
}: {
  provider: ProviderConfig;
}) {
  const [showForm, setShowForm] = useState(false);

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
            <CategoryLabel category={provider.category} />
          </div>
          <p className="mt-0.5 text-xs text-text-tertiary">
            {provider.description}
          </p>
        </div>
      </div>

      {/* Model hint */}
      <div className="mt-3 rounded-md bg-surface-overlay px-3 py-2">
        <p className="text-[10px] text-text-tertiary">
          <span className="font-medium text-text-secondary">Models: </span>
          {provider.modelHint}
        </p>
      </div>

      <div className="mt-4">
        {showForm ? (
          <CredentialForm
            provider={provider}
            onClose={() => setShowForm(false)}
          />
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowForm(true)}
          >
            {provider.requiresBaseUrl ? "Configure Key + Base URL" : "Add API Key"}
          </Button>
        )}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

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

  const credentialMap = new Map<string, CredentialSummary>(
    credentialList.map((c) => [c.provider, c]),
  );

  const directProviders = PROVIDERS.filter((p) => p.category === "direct");
  const proxyProviders = PROVIDERS.filter((p) => p.category === "proxy");
  const configuredCount = credentialList.length;
  const totalProviders = PROVIDERS.length;

  return (
    <>
      <PageHeader
        title="Credentials"
        description="Manage API keys for model providers used in evaluation runs"
        actions={
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <span className="rounded-md bg-surface-overlay px-2 py-1 font-mono">
              {configuredCount}/{totalProviders}
            </span>
            <span>configured</span>
          </div>
        }
      />

      {/* Direct API providers */}
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-medium text-text-primary">Direct API Providers</h2>
          <span className="text-[10px] text-text-tertiary">API key only</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
          {directProviders.map((provider) => {
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
      </div>

      {/* Proxy / compatible providers */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-medium text-text-primary">
            Proxy &amp; OpenAI-Compatible Providers
          </h2>
          <span className="text-[10px] text-text-tertiary">API key + base URL required</span>
        </div>
        <p className="mb-4 text-xs text-text-secondary">
          Configure these to access models through OpenAI-compatible endpoints, LiteLLM gateways, Azure deployments, or AWS Bedrock.
          Many models (Mistral, Kimi, Claude) can be accessed through these proxy providers as well as directly.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
          {proxyProviders.map((provider) => {
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
      </div>
    </>
  );
}
