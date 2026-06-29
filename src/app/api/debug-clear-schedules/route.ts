import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST() {
  const supabase = getSupabaseAdmin();
  const { error, count } = await supabase.from("schedules").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) return NextResponse.json({ ok: false, error: error.message });
  return NextResponse.json({ ok: true, deleted: count });
}
