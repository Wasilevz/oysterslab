import { NextResponse } from "next/server";
import { generateSalaryCSV } from "@/lib/export-csv";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const year = parseInt(url.searchParams.get("year") || String(new Date().getFullYear()));
  const month = parseInt(url.searchParams.get("month") || String(new Date().getMonth() + 1));

  if (month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { allowed } = checkRateLimit(`export:${ip}`, 3, 60000);
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit" }, { status: 429 });
  }

  try {
    const csv = await generateSalaryCSV(year, month);
    const filename = `salary_${year}_${String(month).padStart(2, "0")}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Export error" },
      { status: 500 },
    );
  }
}
