/**
 * GET   /api/runs/:id — Get run detail
 * PATCH /api/runs/:id — Update run status (called by executor)
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = getServiceClient();
  const { data, error } = await service
    .from("runs")
    .select("*")
    .eq("id", id)
    .eq("organization_id", authUser.organizationId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.status) updates.status = body.status;
  if (body.completed_tasks !== undefined) updates.completed_tasks = body.completed_tasks;
  if (body.mean_score !== undefined) updates.mean_score = body.mean_score;
  if (body.completed_at) updates.completed_at = body.completed_at;
  if (body.started_at) updates.started_at = body.started_at;

  const service = getServiceClient();
  const { data, error } = await service
    .from("runs")
    .update(updates)
    .eq("id", id)
    .eq("organization_id", authUser.organizationId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
