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
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    return {
      success: false,
      error: "TELEGRAM_BOT_TOKEN не настроен на сервере",
    };
  }

  const validated = validateTelegramInitData(initData, botToken);
  const fallbackTelegramId = extractTelegramIdFromInitData(initData);

  if (!validated) {
    return {
      success: false,
      telegramId: fallbackTelegramId,
      error: "Недействительная подпись Telegram",
    };
  }

  const telegramId = validated.user.id;

  try {
    const supabase = getSupabaseAdmin();

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (error) {
      return {
        success: false,
        telegramId,
        error: `Ошибка базы данных: ${error.message}`,
      };
    }

    if (!user) {
      return {
        success: false,
        telegramId,
        error: "Пользователь не найден",
      };
    }

    return {
      success: true,
      data: user as User,
      telegramId,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Неизвестная ошибка авторизации";

    return {
      success: false,
      telegramId,
      error: message,
    };
  }
}
