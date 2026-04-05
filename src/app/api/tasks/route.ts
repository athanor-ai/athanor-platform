/**
 * GET /api/tasks — List all tasks for the user's organization's environments.
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

  // Get environments for this org
  const { data: envs } = await service
    .from("environments")
    .select("id")
    .eq("organization_id", authUser.organizationId);

  if (!envs || envs.length === 0) {
    return NextResponse.json([]);
  }

  const envIds = envs.map((e) => e.id);

  const { data, error } = await service
    .from("tasks")
    .select("*")
    .in("environment_id", envIds)
    .order("slug");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
