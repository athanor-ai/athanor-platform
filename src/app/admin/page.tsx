"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ATHANOR_ENVIRONMENTS } from "@/data/environments";

function AddUserInline({ orgId, orgName, onDone }: { orgId: string; orgName: string; onDone: () => void }) {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="mt-1 text-[10px] text-accent/60 hover:text-accent transition-colors"
      >
        + Add user
      </button>
    );
  }

  return (
    <div className="mt-1 flex gap-1.5 items-center">
      <input
        type="email"
        placeholder="email@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 px-2 py-1 rounded border border-border-primary bg-surface-primary text-[11px] text-text-primary placeholder:text-text-tertiary font-mono"
        autoFocus
      />
      <button
        disabled={adding || !email.trim()}
        onClick={async () => {
          setAdding(true);
          await fetch("/api/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "add-user", organization_id: orgId, email: email.trim() }),
          });
          setEmail("");
          setShow(false);
          setAdding(false);
          onDone();
        }}
        className="px-2 py-1 rounded text-[10px] font-medium bg-accent/20 text-accent hover:bg-accent/30 transition-colors disabled:opacity-40"
      >
        {adding ? "..." : "Add"}
      </button>
      <button
        onClick={() => { setShow(false); setEmail(""); }}
        className="text-[10px] text-text-tertiary hover:text-text-secondary"
      >
        Cancel
      </button>
    </div>
  );
}

interface OrgUser {
  email: string;
  role: string;
  status: "invited" | "active";
  created_at: string;
}

interface OrgData {
  id: string;
  name: string;
  slug: string;
  plan: string;
  created_at: string;
  environments: Array<{ env: string; slug: string; level: string }>;
  users: OrgUser[];
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

  const grantAccess = async (orgId: string, envSlug: string) => {
    await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "grant-access", organization_id: orgId, environment_slug: envSlug }),
    });
    fetchOrgs();
  };

  const revokeAccess = async (orgId: string, envSlug: string) => {
    await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "revoke-access", organization_id: orgId, environment_slug: envSlug }),
    });
    fetchOrgs();
  };

  // Invite customer
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmails, setInviteEmails] = useState("");
  const [inviteOrg, setInviteOrg] = useState("");
  const [inviteEnvs, setInviteEnvs] = useState<Set<string>>(new Set());
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<string | null>(null);

  const handleInvite = async () => {
    const emails = inviteEmails.split(/[,\n]+/).map((e) => e.trim()).filter(Boolean);
    if (!emails.length || !inviteOrg) return;
    setInviting(true);
    setInviteResult(null);
    try {
      const envSlugs = ATHANOR_ENVIRONMENTS
        .filter((e) => inviteEnvs.has(e.slug))
        .map((e) => e.slug);

      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgName: inviteOrg,
          emails,
          environmentSlugs: envSlugs,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const created = data.users.filter((u: { status: string }) => u.status === "created").length;
      const cfAdded = data.cloudflare?.added?.length || 0;
      setInviteResult(
        `${inviteOrg} created: ${created}/${emails.length} users, ${data.environments.length} env(s), ${cfAdded} emails added to Cloudflare access.`
      );
      setInviteEmails("");
      setInviteOrg("");
      setInviteEnvs(new Set());
      fetchOrgs();
    } catch (e) {
      setInviteResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-sm text-text-tertiary">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Admin" />
        <Card>
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-10 h-10 rounded-full bg-surface-secondary flex items-center justify-center mb-4">
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none" className="text-text-tertiary">
                <path d="M8 5v3M8 10.5h.01M14 8A6 6 0 1 1 2 8a6 6 0 0 1 12 0Z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-sm font-medium text-text-primary mb-1">Access Restricted</p>
            <p className="text-xs text-text-tertiary max-w-sm">{error}</p>
          </div>
        </Card>
      </>
    );
  }

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
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Company Name"
                  value={inviteOrg}
                  onChange={(e) => setInviteOrg(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md border border-border-primary bg-surface-primary text-sm text-text-primary placeholder:text-text-tertiary"
                />
                <textarea
                  placeholder={"Emails (one per line or comma-separated)\nalice@company.com\nbob@company.com"}
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-1.5 rounded-md border border-border-primary bg-surface-primary text-sm text-text-primary placeholder:text-text-tertiary font-mono resize-none"
                />
                <p className="text-[10px] text-text-tertiary">
                  First email becomes org owner. All emails get Cloudflare access automatically.
                </p>
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
                <Button variant="primary" size="sm" onClick={handleInvite} disabled={inviting || !inviteEmails.trim() || !inviteOrg}>
                  {inviting ? "Creating..." : "Create Account & Grant Access"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowInvite(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}
        {inviteResult && (
          <div className={`mt-2 px-4 py-2 rounded-md text-xs ${inviteResult.startsWith("Error") ? "bg-red-900/20 text-red-400" : "bg-green-900/20 text-green-400"}`}>
            {inviteResult}
          </div>
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
                          ? revokeAccess(org.id, env.slug)
                          : grantAccess(org.id, env.slug)
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

              {/* Users */}
              {org.users.length > 0 && (
                <div className="mt-3">
                  <p className="text-[11px] font-medium text-text-tertiary mb-1.5">
                    Users ({org.users.length})
                  </p>
                  <div className="space-y-1">
                    {org.users.map((u) => (
                      <div key={u.email} className="flex items-center gap-2 text-[11px]">
                        <span className={`w-1.5 h-1.5 rounded-full ${u.status === "active" ? "bg-green-400" : "bg-yellow-400"}`} />
                        <span className="font-mono text-text-secondary flex-1">{u.email}</span>
                        <span className="text-text-tertiary">{u.role}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                          u.status === "active"
                            ? "bg-green-900/20 text-green-400"
                            : "bg-yellow-900/20 text-yellow-400"
                        }`}>
                          {u.status}
                        </span>
                        {org.plan !== "internal" && (
                          <button
                            onClick={async () => {
                              if (!confirm(`Remove ${u.email} from ${org.name}?`)) return;
                              await fetch("/api/admin", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ action: "remove-user", organization_id: org.id, email: u.email }),
                              });
                              fetchOrgs();
                            }}
                            className="text-red-400/40 hover:text-red-400 transition-colors"
                            title={`Remove ${u.email}`}
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    ))}
                    {org.plan !== "internal" && (
                      <AddUserInline orgId={org.id} orgName={org.name} onDone={fetchOrgs} />
                    )}
                  </div>
                </div>
              )}

              {/* Delete org (only for non-internal orgs) */}
              {org.plan !== "internal" && (
                <div className="mt-3 pt-3 border-t border-border-primary/30">
                  <button
                    onClick={async () => {
                      if (!confirm(`Delete ${org.name}? This removes the org, all users, and their access.`)) return;
                      await fetch("/api/admin", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "delete-org", organization_id: org.id }),
                      });
                      fetchOrgs();
                    }}
                    className="text-[10px] text-red-400/60 hover:text-red-400 transition-colors"
                  >
                    Delete organization
                  </button>
                </div>
              )}
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
