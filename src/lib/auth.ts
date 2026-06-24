import { getSupabaseAdmin } from "@/lib/supabase";
import { validateTelegramInitData } from "@/lib/telegram-auth";

export interface AuthUser {
  id: string;
  role: string;
  telegram_id: number;
}

export async function verifyRequestAuth(
  initData: string,
): Promise<AuthUser | null> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken || !initData) return null;

  const validated = validateTelegramInitData(initData, botToken);
  if (!validated) return null;

  const supabase = getSupabaseAdmin();
  const { data: user } = await supabase
    .from("users")
    .select("id, role, telegram_id")
    .eq("telegram_id", String(validated.user.id))
    .maybeSingle();

  return user ?? null;
}

export async function requireAdmin(
  initData: string,
): Promise<{ user: AuthUser } | { error: string; status: number }> {
  const user = await verifyRequestAuth(initData);
  if (!user) {
    return { error: "Не авторизован", status: 401 };
  }
  if (user.role !== "admin" && user.role !== "superadmin") {
    return { error: "Нет доступа", status: 403 };
  }
  return { user };
}
