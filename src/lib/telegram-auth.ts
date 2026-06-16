import { createHmac, timingSafeEqual } from "crypto";

const MAX_AUTH_AGE_SECONDS = 86400;

export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface ValidatedTelegramInitData {
  user: TelegramWebAppUser;
  authDate: number;
  queryId?: string;
}

function parseInitData(initData: string): URLSearchParams {
  return new URLSearchParams(initData);
}

function buildDataCheckString(params: URLSearchParams): string {
  const entries: string[] = [];

  params.forEach((value, key) => {
    if (key !== "hash") {
      entries.push(`${key}=${value}`);
    }
  });

  return entries.sort().join("\n");
}

function verifyHash(
  dataCheckString: string,
  receivedHash: string,
  botToken: string,
): boolean {
  const secretKey = createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const calculatedHash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  try {
    const received = Buffer.from(receivedHash, "hex");
    const calculated = Buffer.from(calculatedHash, "hex");

    if (received.length !== calculated.length) {
      return false;
    }

    return timingSafeEqual(received, calculated);
  } catch {
    return false;
  }
}

export function validateTelegramInitData(
  initData: string,
  botToken: string,
): ValidatedTelegramInitData | null {
  if (!initData?.trim()) {
    return null;
  }

  const params = parseInitData(initData);
  const hash = params.get("hash");

  if (!hash) {
    return null;
  }

  const dataCheckString = buildDataCheckString(params);

  if (!verifyHash(dataCheckString, hash, botToken)) {
    return null;
  }

  const authDate = Number(params.get("auth_date"));
  if (!authDate || Number.isNaN(authDate)) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > MAX_AUTH_AGE_SECONDS) {
    return null;
  }

  const userRaw = params.get("user");
  if (!userRaw) {
    return null;
  }

  try {
    const user = JSON.parse(userRaw) as TelegramWebAppUser;

    if (!user?.id) {
      return null;
    }

    return {
      user,
      authDate,
      queryId: params.get("query_id") ?? undefined,
    };
  } catch {
    return null;
  }
}

export function extractTelegramIdFromInitData(
  initData: string,
): number | null {
  if (!initData?.trim()) {
    return null;
  }

  const userRaw = new URLSearchParams(initData).get("user");
  if (!userRaw) {
    return null;
  }

  try {
    const user = JSON.parse(userRaw) as TelegramWebAppUser;
    return user?.id ?? null;
  } catch {
    return null;
  }
}
