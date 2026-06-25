import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function getSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("КРИТИЧЕСКАЯ ОШИБКА: NEXT_PUBLIC_SUPABASE_URL пустой!");
  }

  if (!supabaseUrl.startsWith("https://")) {
    throw new Error("КРИТИЧЕСКАЯ ОШИБКА: URL БД должен начинаться с https://");
  }

  if (!supabaseKey) {
    throw new Error("КРИТИЧЕСКАЯ ОШИБКА: SUPABASE_SERVICE_ROLE_KEY пустой!");
  }

  return createClient(supabaseUrl, supabaseKey);
}

export async function verifyUserFromInitData(
  initData: string,
): Promise<{ id: string; role: string } | null> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return null;

  const { validateTelegramInitData } = await import("@/lib/telegram-auth");
  const validated = validateTelegramInitData(initData, botToken);
  if (!validated) return null;

  const supabase = getSupabaseAdmin();
  const { data: user } = await supabase
    .from("users")
    .select("id, role")
    .eq("telegram_id", String(validated.user.id))
    .maybeSingle();

  return user ?? null;
}
