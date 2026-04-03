"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ATHANOR_ENVIRONMENTS } from "@/data/environments";

interface OrgData {
  id: string;
  name: string;
  slug: string;
  plan: string;
  created_at: string;
  environments: Array<{ env: string; slug: string; level: string }>;
}

export default function AdminPage() {
  const [orgs, setOrgs] = useState<OrgData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrgs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin");
      if (res.status === 403) {
        setError("Not authorized. Only internal Athanor admins can access this page.");
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      setOrgs(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

  const grantAccess = async (orgId: string, envId: string) => {
    await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "grant-access", organization_id: orgId, environment_id: envId }),
    });
    fetchOrgs();
  };

  const revokeAccess = async (orgId: string, envId: string) => {
    await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "revoke-access", organization_id: orgId, environment_id: envId }),
    });
    fetchOrgs();
  };

  if (loading) return <div className="p-8 text-text-secondary">Loading...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  // Map env slugs to IDs for the grant buttons
  const envIdMap = new Map(
    ATHANOR_ENVIRONMENTS.map((e) => [e.slug, e.id]),
  );

  return (
    <>
      <PageHeader
        title="Admin"
        description="Manage customer organizations and environment access"
      />

      <div className="space-y-4">
        {orgs.map((org) => (
          <Card key={org.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{org.name}</CardTitle>
                  <p className="text-xs text-text-tertiary mt-1">
                    {org.slug} | plan: {org.plan} | created: {new Date(org.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                  org.plan === "internal" ? "bg-purple-900/30 text-purple-300" :
                  org.plan === "pro" ? "bg-green-900/30 text-green-300" :
                  "bg-surface-secondary text-text-tertiary"
                }`}>
                  {org.plan}
                </span>
              </div>
            </CardHeader>
            <div className="px-6 pb-4">
              <p className="text-[11px] font-medium text-text-tertiary mb-2">
                Environment Access ({org.environments.length}/{ATHANOR_ENVIRONMENTS.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {ATHANOR_ENVIRONMENTS.map((env) => {
                  const hasAccess = org.environments.some((e) => e.slug === env.slug);
                  return (
                    <button
                      key={env.slug}
                      onClick={() =>
                        hasAccess
                          ? revokeAccess(org.id, envIdMap.get(env.slug) || env.id)
                          : grantAccess(org.id, envIdMap.get(env.slug) || env.id)
                      }
                      className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                        hasAccess
                          ? "bg-green-900/30 text-green-300 hover:bg-red-900/30 hover:text-red-300"
                          : "bg-surface-secondary text-text-tertiary hover:bg-green-900/20 hover:text-green-400"
                      }`}
                      title={hasAccess ? `Click to revoke ${env.name}` : `Click to grant ${env.name}`}
                    >
                      {hasAccess ? "✓" : "+"} {env.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {orgs.length === 0 && (
        <div className="text-center py-12 text-text-tertiary">
          No organizations yet. Customers will appear here after signup.
        </div>
      )}
    </>
  );
}
