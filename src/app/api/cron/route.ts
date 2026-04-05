/**
 * GET /api/cron — Daily maintenance: VM safety watchdog + run data sync.
 *
 * Runs once daily via Vercel Cron (Hobby plan limit). Can also be called
 * from Azure Logic Apps or a simple curl cron job.
 *
 * 1. Enforces VM uptime limits (deallocate if idle > 6h)
 * 2. Syncs latest run results from VM repos into Supabase (safety net
 *    for any runs that evaluate.py's real-time push missed)
 *
 * Auth: Bearer token from CRON_SECRET env var (not user auth).
 * Vercel Cron sends this automatically via the Authorization header.
 */
import { NextRequest, NextResponse } from "next/server";
import { enforceVMSafetyLimits } from "@/lib/vm-manager";

async function syncRuns(): Promise<{ synced: boolean; error?: string }> {
  // Call our own /api/sync endpoint with action: "runs"
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const cronSecret = process.env.CRON_SECRET;

  try {
    const resp = await fetch(`${baseUrl}/api/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cronSecret && { Authorization: `Bearer ${cronSecret}` }),
      },
      body: JSON.stringify({ action: "runs" }),
    });

    if (!resp.ok) {
      return { synced: false, error: `HTTP ${resp.status}` };
    }
    return { synced: true };
  } catch (e) {
    return { synced: false, error: String(e).slice(0, 200) };
  }
}

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends it as Authorization: Bearer <secret>)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. VM safety limits
  const vmResult = await enforceVMSafetyLimits();

  // 2. Sync latest runs from VM (safety net)
  const syncResult = await syncRuns();

  return NextResponse.json({
    ok: true,
    vm: vmResult,
    sync: syncResult,
  });
}
