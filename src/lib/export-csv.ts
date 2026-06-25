import { getSupabaseAdmin } from "@/lib/supabase";

function toCSVRow(values: (string | number)[]): string {
  return values.map((v) => {
    const str = String(v);
    const sanitized = str.replace(/"/g, '""');
    if (/^[=+\-@\t\r]/.test(sanitized)) {
      return `"'${sanitized}"`;
    }
    return `"${sanitized}"`;
  }).join(",");
}

export async function generateSalaryCSV(
  year: number,
  month: number,
): Promise<string> {
  const supabase = getSupabaseAdmin();

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

  const { data: employees } = await supabase
    .from("users")
    .select("id, full_name, position, hourly_rate")
    .in("role", ["employee", "admin"])
    .order("full_name");

  if (!employees || employees.length === 0) {
    return toCSVRow(["Нет сотрудников"]);
  }

  const rows: string[] = [];
  rows.push(toCSVRow(["Сотрудник", "Должность", "Часы", "Ставка (л/ч)", "Сумма (MDL)", "Смен"]));

  let totalHours = 0;
  let totalAmount = 0;

  for (const emp of employees) {
    const { data: shifts } = await supabase
      .from("shifts")
      .select("hours_worked")
      .eq("user_id", emp.id)
      .in("status", ["COMPLETED", "REVIEWED", "AUTO_CLOSED"])
      .gte("clock_in", startDate)
      .lt("clock_in", endDate);

    const totalEmpHours = Math.round(
      (shifts ?? []).reduce((s, sh) => s + (sh.hours_worked ?? 0), 0) * 100,
    ) / 100;
    const totalEmpAmount = Math.round(totalEmpHours * emp.hourly_rate);
    const shiftCount = (shifts ?? []).length;

    if (totalEmpHours > 0 || shiftCount > 0) {
      rows.push(toCSVRow([
        emp.full_name,
        emp.position || "-",
        totalEmpHours.toFixed(1),
        emp.hourly_rate,
        totalEmpAmount,
        shiftCount,
      ]));
      totalHours += totalEmpHours;
      totalAmount += totalEmpAmount;
    }
  }

  rows.push("");
  rows.push(toCSVRow(["ИТОГО", "", totalHours.toFixed(1), "", totalAmount, ""]));

  return rows.join("\n");
}
