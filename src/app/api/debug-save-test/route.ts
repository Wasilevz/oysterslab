import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const supabase = getSupabaseAdmin();
  const results: string[] = [];

  // 1. Total rows
  const { count } = await supabase
    .from("schedules")
    .select("*", { count: "exact", head: true });
  results.push(`Total rows: ${count}`);

  // 2. Insert test row
  const testDate = "2099-01-15";
  const testUserId = "00000000-0000-0000-0000-000000000001";

  await supabase.from("schedules").delete().eq("date", testDate).eq("user_id", testUserId);

  const { error: insertErr } = await supabase
    .from("schedules")
    .insert({ user_id: testUserId, date: testDate, type: "off" })
    .select();

  if (insertErr) {
    results.push(`TEST INSERT FAILED (expected - fake user): ${insertErr.message}`);
  } else {
    results.push(`TEST INSERT OK`);
    await supabase.from("schedules").delete().eq("date", testDate).eq("user_id", testUserId);
  }

  // 3. Read back
  const { data: readBack } = await supabase
    .from("schedules")
    .select("*")
    .eq("date", testDate)
    .eq("user_id", testUserId);

  results.push(`READ BACK: ${JSON.stringify(readBack)}`);

  // 4. Delete test row
  await supabase.from("schedules").delete().eq("date", testDate).eq("user_id", testUserId);

  // 5. Month query (same as getSchedule)
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const pad = (n: number) => String(n).padStart(2, "0");
  const startDate = `${year}-${pad(month)}-01`;
  const nextM = month === 12 ? 1 : month + 1;
  const nextY = month === 12 ? year + 1 : year;
  const endDate = `${nextY}-${pad(nextM)}-01`;

  const { data: monthData, error: monthErr } = await supabase
    .from("schedules")
    .select("*")
    .gte("date", startDate)
    .lt("date", endDate)
    .order("date");

  if (monthErr) {
    results.push(`MONTH QUERY FAILED: ${monthErr.message}`);
  } else {
    results.push(`MONTH QUERY (${startDate}..${endDate}): ${monthData?.length ?? 0} rows`);
    if (monthData && monthData.length > 0) {
      results.push(`SAMPLE: ${JSON.stringify(monthData[0])}`);
    }
  }

  // 6. Real user schedule test
  const { data: realUsers } = await supabase.from("users").select("id").in("role", ["employee", "admin"]).limit(1);
  if (realUsers && realUsers.length > 0) {
    const uid = realUsers[0]!.id;
    const testDate2 = "2026-06-28";

    await supabase.from("schedules").delete().eq("user_id", uid).eq("date", testDate2);

    const { data: insData, error: insErr } = await supabase
      .from("schedules")
      .insert({ user_id: uid, date: testDate2, type: "vacation" })
      .select();

    if (insErr) {
      results.push(`REAL INSERT FAILED: ${insErr.message} (code: ${insErr.code})`);
    } else {
      results.push(`REAL INSERT OK: ${JSON.stringify(insData)}`);
    }

    const { data: readBack2 } = await supabase
      .from("schedules")
      .select("*")
      .eq("user_id", uid)
      .eq("date", testDate2);
    results.push(`REAL READ: ${JSON.stringify(readBack2)}`);

    await supabase.from("schedules").delete().eq("user_id", uid).eq("date", testDate2);
    results.push(`CLEANUP: OK`);
  }

  return NextResponse.json({ results });
}
