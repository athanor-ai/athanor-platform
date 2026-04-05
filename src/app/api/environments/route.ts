/**
 * GET /api/environments — List environments for the user's organization.
 *
 * Supports all auth methods: Supabase session, Cloudflare headers, middleware bridge.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = getServiceClient();

  // Get environments for this user's org
  const { data, error } = await service
    .from("environments")
    .select("*")
    .eq("organization_id", authUser.organizationId)
    .eq("status", "active")
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
