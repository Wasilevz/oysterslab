import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("КРИТИЧЕСКАЯ ОШИБКА: NEXT_PUBLIC_SUPABASE_URL пустой или не найден в Vercel!");
  }

  if (!supabaseUrl.startsWith("http")) {
    throw new Error(`КРИТИЧЕСКАЯ ОШИБКА: URL БД должен начинаться с https://. Текущее: ${supabaseUrl}`);
  }

  if (!supabaseKey) {
    throw new Error("КРИТИЧЕСКАЯ ОШИБКА: SUPABASE_SERVICE_ROLE_KEY пустой или не найден в Vercel!");
  }

  return createClient(supabaseUrl, supabaseKey);
}