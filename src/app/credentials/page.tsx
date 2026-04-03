"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useCredentials } from "@/hooks/useCredentials";
import { useCredentialMutations } from "@/hooks/useCredentialMutations";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import type { Credential } from "@/types/database";

/* ------------------------------------------------------------------ */
/*  Provider definitions — aligned with real Athanor model lineup      */
/* ------------------------------------------------------------------ */

const PROVIDERS = [
  {
    key: "anthropic" as const,
    name: "Anthropic",
    description: "Claude Sonnet 4.6",
    placeholder: "sk-ant-api03-...",
  },
  {
    key: "google" as const,
    name: "Google",
    description: "Gemini 3.1 Pro, Gemini 2.5 Flash",
    placeholder: "AIza...",
  },
  {
    key: "mistral" as const,
    name: "Mistral",
    description: "Mistral Large 3",
    placeholder: "sk-...",
  },
  {
    key: "moonshot" as const,
    name: "Moonshot",
    description: "Kimi K2.5",
    placeholder: "sk-...",
  },
];

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
/*  Credential form (add / edit)                                       */
/* ------------------------------------------------------------------ */

function CredentialForm({
  provider,
  existingCredential,
  onClose,
}: {
  provider: (typeof PROVIDERS)[number];
  existingCredential?: Credential;
  onClose: () => void;
}) {
  const { addCredential, updateCredential } = useCredentialMutations();
  const [label, setLabel] = useState(
    existingCredential?.label ?? `${provider.name} API Key`,
  );
  const [apiKey, setApiKey] = useState("");
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

      if (isEditing && existingCredential) {
        updateCredential.mutate(
          { id: existingCredential.id, label: trimmedLabel, apiKey: trimmedKey },
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
          { provider: provider.key as Credential["provider"], label: trimmedLabel, apiKey: trimmedKey },
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
    [apiKey, label, isEditing, existingCredential, addCredential, updateCredential, onClose, provider.key],
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

      <div>
        <label htmlFor={`key-${provider.key}`} className="mb-1 block text-[11px] font-medium text-text-secondary">
          API Key
        </label>
        <input
          ref={inputRef}
          id={`key-${provider.key}`}
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
          placeholder={provider.placeholder}
          autoComplete="off"
          disabled={isPending}
        />
      </div>

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
  provider: (typeof PROVIDERS)[number];
  credential: Credential;
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
            {credential.encrypted_key}
          </span>
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
  provider: (typeof PROVIDERS)[number];
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
          </div>
          <p className="mt-0.5 text-xs text-text-tertiary">
            {provider.description}
          </p>
        </div>
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
            Add API Key
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
