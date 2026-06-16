"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import {
  extractTelegramIdFromInitData,
  validateTelegramInitData,
} from "@/lib/telegram-auth";
import type { ActionResult, User } from "@/types/database";

export async function verifyTelegramAuth(
  initData: string,
): Promise<ActionResult<User> & { telegramId?: number | null }> {
  console.log("=== СТАРТ АВТОРИЗАЦИИ ===");
  
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  console.log("1. Токен бота существует:", !!botToken);

  if (!botToken) {
    return {
      success: false,
      error: "TELEGRAM_BOT_TOKEN не настроен на сервере",
    };
  }

  const validated = validateTelegramInitData(initData, botToken);
  const fallbackTelegramId = extractTelegramIdFromInitData(initData);
  
  console.log("2. Результат проверки подписи (validated):", !!validated);
  console.log("3. Извлеченный ID:", fallbackTelegramId);

  if (!validated) {
    console.log("!!! ОШИБКА: Подпись недействительна или устарела !!!");
    return {
      success: false,
      telegramId: fallbackTelegramId,
      error: "Недействительная подпись Telegram",
    };
  }

  const telegramId = validated.user.id;
  console.log("4. Подпись верна! Идем в БД искать ID:", telegramId);

  try {
    const supabase = getSupabaseAdmin();

    // ВАЖНО: Оборачиваем telegramId в String(), чтобы типы совпали с БД
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("telegram_id", String(telegramId))
      .maybeSingle();

    if (error) {
      console.log("5. Ошибка БД:", error.message);
      return {
        success: false,
        telegramId,
        error: `Ошибка базы данных: ${error.message}`,
      };
    }

    if (!user) {
      console.log("5. Пользователь не найден в БД.");
      return {
        success: false,
        telegramId,
        error: "Пользователь не найден",
      };
    }

    console.log("5. УСПЕХ! Пользователь найден:", user.role);
    return {
      success: true,
      data: user as User,
      telegramId,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Неизвестная ошибка авторизации";
    console.log("Критическая ошибка try/catch:", message);

    return {
      success: false,
      telegramId,
      error: message,
    };
  }
}