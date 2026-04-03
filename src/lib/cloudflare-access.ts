/**
 * Cloudflare Access management — add/remove customer emails.
 *
 * When a customer is invited, their email is added to the Cloudflare Access
 * policy so they can pass Zero Trust and reach the platform.
 * When revoked, their email is removed.
 *
 * Server-only. Uses CF_ACCESS_TOKEN env var.
 */

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID || "ba44e4ae75f15522ac7ef1560e89f61b";
const CF_APP_ID = process.env.CF_APP_ID || "815a3950-cc76-4f64-a8ad-b371ce98c31b";
const CF_POLICY_ID = process.env.CF_POLICY_ID || "66b45dbd-6409-443c-bf08-013377e5233c"; // "athanor" email policy

function getToken(): string {
  const token = process.env.CF_ACCESS_TOKEN;
  if (!token) throw new Error("CF_ACCESS_TOKEN not set");
  return token;
}

interface AccessPolicy {
  id: string;
  name: string;
  include: Array<{ email?: { email: string } }>;
}

/**
 * Get the current email allowlist from the Cloudflare Access policy.
 */
export async function getAccessEmails(): Promise<string[]> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/access/apps/${CF_APP_ID}/policies/${CF_POLICY_ID}`,
    { headers: { Authorization: `Bearer ${getToken()}` } },
  );
  const data = await res.json() as { result: AccessPolicy };
  return (data.result?.include || [])
    .filter((inc) => inc.email)
    .map((inc) => inc.email!.email);
}

/**
 * Add emails to the Cloudflare Access policy.
 * Idempotent — skips emails already in the list.
 */
export async function addAccessEmails(emails: string[]): Promise<{ added: string[]; existing: string[] }> {
  const current = await getAccessEmails();
  const currentSet = new Set(current.map((e) => e.toLowerCase()));

  const toAdd = emails.filter((e) => !currentSet.has(e.toLowerCase()));
  const existing = emails.filter((e) => currentSet.has(e.toLowerCase()));

  if (toAdd.length === 0) return { added: [], existing };

  // Build updated include list
  const include = [
    ...current.map((email) => ({ email: { email } })),
    ...toAdd.map((email) => ({ email: { email: email.toLowerCase() } })),
  ];

  // Get full policy to preserve other fields
  const getRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/access/apps/${CF_APP_ID}/policies/${CF_POLICY_ID}`,
    { headers: { Authorization: `Bearer ${getToken()}` } },
  );
  const policyData = await getRes.json() as { result: Record<string, unknown> };
  const policy = policyData.result;

  // Update policy with new include list
  const updateRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/access/apps/${CF_APP_ID}/policies/${CF_POLICY_ID}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${getToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: policy.name,
        decision: policy.decision,
        include,
        exclude: policy.exclude || [],
        require: policy.require || [],
      }),
    },
  );

  if (!updateRes.ok) {
    const err = await updateRes.text();
    throw new Error(`Cloudflare API error: ${err}`);
  }

  return { added: toAdd, existing };
}

/**
 * Remove emails from the Cloudflare Access policy.
 */
export async function removeAccessEmails(emails: string[]): Promise<{ removed: string[] }> {
  const removeSet = new Set(emails.map((e) => e.toLowerCase()));
  const current = await getAccessEmails();

  const remaining = current.filter((e) => !removeSet.has(e.toLowerCase()));
  const removed = current.filter((e) => removeSet.has(e.toLowerCase()));

  if (removed.length === 0) return { removed: [] };

  const include = remaining.map((email) => ({ email: { email } }));

  const getRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/access/apps/${CF_APP_ID}/policies/${CF_POLICY_ID}`,
    { headers: { Authorization: `Bearer ${getToken()}` } },
  );
  const policyData = await getRes.json() as { result: Record<string, unknown> };
  const policy = policyData.result;

  await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/access/apps/${CF_APP_ID}/policies/${CF_POLICY_ID}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${getToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: policy.name,
        decision: policy.decision,
        include,
        exclude: policy.exclude || [],
        require: policy.require || [],
      }),
    },
  );

  return { removed };
}
