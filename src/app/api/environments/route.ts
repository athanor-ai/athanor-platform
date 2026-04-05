/**
 * GET /api/environments — List environments for the user's organization.
 *
 * RLS on environments table handles org scoping automatically.
 */
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // RLS policy on environments enforces org scoping via auth_user_org_id()
  const { data, error } = await supabase
    .from("environments")
    .select("*")
    .eq("status", "active")
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
