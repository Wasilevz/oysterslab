import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database"; // Если этого файла нет, удали эту строку и `<Database>` ниже

export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("КРИТИЧЕСКАЯ ОШИБКА: NEXT_PUBLIC_SUPABASE_URL пустой или не найден в Vercel!");
  }

  if (!supabaseUrl.startsWith("http")) {
    throw new Error(`КРИТИЧЕСКАЯ ОШИБКА: URL базы данных должен начинаться с https://. Текущее значение: ${supabaseUrl}`);
  }

  if (!supabaseKey) {
    throw new Error("КРИТИЧЕСКАЯ ОШИБКА: SUPABASE_SERVICE_ROLE_KEY пустой или не найден в Vercel!");
  }

  // Если файл типов есть, используем createClient<Database>, иначе просто createClient
  return createClient(supabaseUrl, supabaseKey);
}
