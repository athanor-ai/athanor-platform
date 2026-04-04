"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState } from "@/components/ui/LoadingState";
import { PiArrowLeft } from "react-icons/pi";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PlatformKeyStatus {
  provider: string;
  displayName: string;
  envVar: string;
  models: string[];
  status: "live" | "not_configured";
  maskedKey: string | null;
  baseUrlEnvVar?: string;
  baseUrlConfigured?: boolean;
}

interface PlatformKeysResponse {
  platformKeysEnabled: boolean;
  keys: PlatformKeyStatus[];
  sshTarget: string | null;
}

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
/*  Key card                                                           */
/* ------------------------------------------------------------------ */

function KeyCard({ keyInfo }: { keyInfo: PlatformKeyStatus }) {
  const isLive = keyInfo.status === "live";

  return (
    <Card padding="lg">
      <div className="flex items-start gap-3">
        <ProviderAvatar name={keyInfo.displayName} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">
              {keyInfo.displayName}
            </span>
            <StatusBadge
              status={isLive ? "Live" : "Not Configured"}
              variant={isLive ? "success" : "neutral"}
            />
          </div>
          <p className="mt-0.5 text-xs text-text-tertiary">
            {keyInfo.models.length > 0
              ? keyInfo.models.join(", ")
              : "No models assigned"}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-text-tertiary">Env Var</span>
          <code className="rounded bg-surface-overlay px-1.5 py-0.5 font-mono text-xs text-text-secondary">
            {keyInfo.envVar}
          </code>
        </div>

        {isLive && keyInfo.maskedKey && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-text-tertiary">Key</span>
            <span className="font-mono text-xs text-text-tertiary">
              {keyInfo.maskedKey}
            </span>
          </div>
        )}

        {keyInfo.baseUrlEnvVar && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-text-tertiary">Base URL</span>
            <div className="flex items-center gap-1.5">
              <code className="rounded bg-surface-overlay px-1.5 py-0.5 font-mono text-[10px] text-text-tertiary">
                {keyInfo.baseUrlEnvVar}
              </code>
              {keyInfo.baseUrlConfigured ? (
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-text-tertiary" />
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PlatformKeysPage() {
  const [data, setData] = useState<PlatformKeysResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/platform-keys");
      if (res.status === 403) {
        setError(
          "Not authorized. Only internal Athanor admins can access this page.",
        );
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  if (loading) {
    return (
      <>
        <PageHeader title="Platform API Keys" />
        <LoadingState message="Checking platform keys..." />
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Platform API Keys" />
        <Card>
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-surface-overlay">
              <svg
                width="20"
                height="20"
                viewBox="0 0 16 16"
                fill="none"
                className="text-text-tertiary"
              >
                <path
                  d="M8 5v3M8 10.5h.01M14 8A6 6 0 1 1 2 8a6 6 0 0 1 12 0Z"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="mb-1 text-sm font-medium text-text-primary">
              Access Restricted
            </p>
            <p className="max-w-sm text-xs text-text-tertiary">{error}</p>
          </div>
        </Card>
      </>
    );
  }

  if (!data) return null;

  const liveCount = data.keys.filter((k) => k.status === "live").length;

  return (
    <>
      <PageHeader
        title="Platform API Keys"
        description="Athanor-owned API keys for baseline scoring and evaluation runs (Vercel env vars)"
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <span className="rounded-md bg-surface-overlay px-2 py-1 font-mono">
                {liveCount}/{data.keys.length}
              </span>
              <span>live</span>
            </div>
            <Link
              href="/admin"
              className="flex items-center gap-1 text-xs text-text-tertiary transition-colors hover:text-accent"
            >
              <PiArrowLeft className="h-3.5 w-3.5" />
              Admin
            </Link>
          </div>
        }
      />

      {/* Platform keys toggle status */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${data.platformKeysEnabled ? "bg-success" : "bg-warning"}`}
          />
          <span className="text-xs text-text-secondary">
            <code className="rounded bg-surface-overlay px-1.5 py-0.5 font-mono text-[10px]">
              ATHANOR_USE_PLATFORM_KEYS
            </code>
            {" = "}
            <span
              className={
                data.platformKeysEnabled
                  ? "font-medium text-success"
                  : "font-medium text-warning"
              }
            >
              {data.platformKeysEnabled ? "true" : "false"}
            </span>
          </span>
        </div>
        {!data.platformKeysEnabled && (
          <p className="mt-1 text-[10px] text-text-tertiary">
            Platform keys are disabled. Set{" "}
            <code className="font-mono">ATHANOR_USE_PLATFORM_KEYS=true</code>{" "}
            in Vercel env vars to enable fallback keys for runs.
          </p>
        )}
      </div>

      {/* Key cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {data.keys.map((keyInfo) => (
          <KeyCard key={keyInfo.envVar} keyInfo={keyInfo} />
        ))}
      </div>

      {/* SSH Target */}
      {data.sshTarget && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-medium text-text-primary">
            Infrastructure
          </h2>
          <Card padding="lg">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-text-secondary">
                  Azure VM SSH Target
                </span>
                <p className="mt-0.5 text-[10px] text-text-tertiary">
                  <code className="font-mono">AZURE_VM_SSH_TARGET</code>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <code className="rounded bg-surface-overlay px-2 py-1 font-mono text-xs text-text-secondary">
                  {data.sshTarget}
                </code>
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
