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

  // Invite customer
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteOrg, setInviteOrg] = useState("");
  const [inviteEnvs, setInviteEnvs] = useState<Set<string>>(new Set());
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<string | null>(null);

  const handleInvite = async () => {
    if (!inviteEmail || !inviteOrg) return;
    setInviting(true);
    setInviteResult(null);
    try {
      // 1. Create account + org
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          password: crypto.randomUUID().slice(0, 16), // temp password, they'll reset
          orgName: inviteOrg,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // 2. Grant env access for selected envs
      for (const envSlug of inviteEnvs) {
        const envDef = ATHANOR_ENVIRONMENTS.find((e) => e.slug === envSlug);
        if (envDef) {
          await fetch("/api/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "grant-access",
              organization_id: data.organization_id,
              environment_id: envDef.id,
            }),
          });
        }
      }

      setInviteResult(`Customer created: ${inviteEmail} (${inviteOrg}) with ${inviteEnvs.size} env(s). They can now log in and reset their password.`);
      setInviteEmail("");
      setInviteOrg("");
      setInviteEnvs(new Set());
      fetchOrgs();
    } catch (e) {
      setInviteResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setInviting(false);
    }
  };

  if (loading) return <div className="p-8 text-text-secondary">Loading...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  const envIdMap = new Map(
    ATHANOR_ENVIRONMENTS.map((e) => [e.slug, e.id]),
  );

  return (
    <>
      <PageHeader
        title="Admin"
        description="Manage customer organizations and environment access"
      />

      {/* Invite Customer */}
      <div className="mb-6">
        {!showInvite ? (
          <Button variant="primary" size="sm" onClick={() => setShowInvite(true)}>
            + Invite Customer
          </Button>
        ) : (
          <Card>
            <div className="p-4 space-y-3">
              <p className="text-sm font-medium text-text-primary">New Customer</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="customer@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-md border border-border-primary bg-surface-primary text-sm text-text-primary placeholder:text-text-tertiary"
                />
                <input
                  type="text"
                  placeholder="Company Name"
                  value={inviteOrg}
                  onChange={(e) => setInviteOrg(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-md border border-border-primary bg-surface-primary text-sm text-text-primary placeholder:text-text-tertiary"
                />
              </div>
              <div>
                <p className="text-[11px] text-text-tertiary mb-1">Grant access to:</p>
                <div className="flex flex-wrap gap-1.5">
                  {ATHANOR_ENVIRONMENTS.map((env) => (
                    <button
                      key={env.slug}
                      onClick={() => {
                        const next = new Set(inviteEnvs);
                        next.has(env.slug) ? next.delete(env.slug) : next.add(env.slug);
                        setInviteEnvs(next);
                      }}
                      className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                        inviteEnvs.has(env.slug)
                          ? "bg-green-900/30 text-green-300"
                          : "bg-surface-secondary text-text-tertiary hover:bg-surface-tertiary"
                      }`}
                    >
                      {inviteEnvs.has(env.slug) ? "✓" : "+"} {env.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <Button variant="primary" size="sm" onClick={handleInvite} disabled={inviting || !inviteEmail || !inviteOrg}>
                  {inviting ? "Creating..." : "Create Account & Grant Access"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowInvite(false)}>
                  Cancel
                </Button>
              </div>
              {inviteResult && (
                <p className={`text-xs ${inviteResult.startsWith("Error") ? "text-red-400" : "text-green-400"}`}>
                  {inviteResult}
                </p>
              )}
            </div>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        {orgs.map((org) => (
          <Card key={org.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{org.name}</CardTitle>
                  <p className="text-xs text-text-tertiary mt-1">
                    {org.slug} | {org.environments.length} env(s) | joined {new Date(org.created_at).toLocaleDateString()}
                  </p>
                </div>
                {org.plan === "internal" && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-900/30 text-purple-300">
                    internal
                  </span>
                )}
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
