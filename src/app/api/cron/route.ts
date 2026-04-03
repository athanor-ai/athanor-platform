/**
 * GET /api/cron — VM safety watchdog endpoint for external cron services.
 *
 * Call every 30 minutes from Vercel Cron, Azure Logic Apps, or a simple
 * curl cron job. If the VM is idle or has exceeded the 6-hour uptime limit,
 * it gets deallocated automatically.
 *
 * Auth: Bearer token from CRON_SECRET env var (not user auth).
 * Vercel Cron sends this automatically via the Authorization header.
 */
import { NextRequest, NextResponse } from "next/server";
import { enforceVMSafetyLimits } from "@/lib/vm-manager";

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends it as Authorization: Bearer <secret>)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await enforceVMSafetyLimits();
  return NextResponse.json({ ok: true, ...result });
}
