import { createHmac } from "crypto";
import { validateTelegramInitData, extractTelegramIdFromInitData } from "../lib/telegram-auth";

function generateInitData(userId: number, botToken: string): string {
  const user = JSON.stringify({ id: userId, first_name: "Test" });
  const authDate = Math.floor(Date.now() / 1000);

  const dataCheckString = `auth_date=${authDate}\nuser=${user}`;

  const secretKey = createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const hash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  return `auth_date=${authDate}&user=${encodeURIComponent(user)}&hash=${hash}`;
}

describe("validateTelegramInitData", () => {
  const botToken = "test:bot-token-123";

  it("validates correct initData", () => {
    const initData = generateInitData(12345, botToken);
    const result = validateTelegramInitData(initData, botToken);
    expect(result).not.toBeNull();
    expect(result?.user.id).toBe(12345);
    expect(result?.user.first_name).toBe("Test");
  });

  it("rejects empty initData", () => {
    expect(validateTelegramInitData("", botToken)).toBeNull();
  });

  it("rejects null initData", () => {
    expect(validateTelegramInitData(null as unknown as string, botToken)).toBeNull();
  });

  it("rejects missing hash", () => {
    const user = JSON.stringify({ id: 12345, first_name: "Test" });
    const authDate = Math.floor(Date.now() / 1000);
    const initData = `auth_date=${authDate}&user=${encodeURIComponent(user)}`;
    expect(validateTelegramInitData(initData, botToken)).toBeNull();
  });

  it("rejects invalid hash", () => {
    const user = JSON.stringify({ id: 12345, first_name: "Test" });
    const authDate = Math.floor(Date.now() / 1000);
    const initData = `auth_date=${authDate}&user=${encodeURIComponent(user)}&hash=invalidhash`;
    expect(validateTelegramInitData(initData, botToken)).toBeNull();
  });

  it("rejects wrong bot token", () => {
    const initData = generateInitData(12345, botToken);
    expect(validateTelegramInitData(initData, "wrong:token")).toBeNull();
  });

  it("rejects expired auth_date", () => {
    const user = JSON.stringify({ id: 12345, first_name: "Test" });
    const oldDate = Math.floor(Date.now() / 1000) - 100000; // > 24h ago

    const dataCheckString = `auth_date=${oldDate}\nuser=${user}`;
    const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
    const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

    const initData = `auth_date=${oldDate}&user=${encodeURIComponent(user)}&hash=${hash}`;
    expect(validateTelegramInitData(initData, botToken)).toBeNull();
  });

  it("rejects missing user field", () => {
    const authDate = Math.floor(Date.now() / 1000);
    const dataCheckString = `auth_date=${authDate}`;
    const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
    const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

    const initData = `auth_date=${authDate}&hash=${hash}`;
    expect(validateTelegramInitData(initData, botToken)).toBeNull();
  });

  it("rejects invalid user JSON", () => {
    const authDate = Math.floor(Date.now() / 1000);
    const user = "not-json";
    const dataCheckString = `auth_date=${authDate}\nuser=${user}`;
    const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
    const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

    const initData = `auth_date=${authDate}&user=${user}&hash=${hash}`;
    expect(validateTelegramInitData(initData, botToken)).toBeNull();
  });

  it("extracts query_id", () => {
    const user = JSON.stringify({ id: 12345, first_name: "Test" });
    const authDate = Math.floor(Date.now() / 1000);
    const queryId = "query-abc-123";
    const dataCheckString = `auth_date=${authDate}\nquery_id=${queryId}\nuser=${user}`;
    const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
    const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

    const initData = `auth_date=${authDate}&query_id=${queryId}&user=${encodeURIComponent(user)}&hash=${hash}`;
    const result = validateTelegramInitData(initData, botToken);
    expect(result?.queryId).toBe(queryId);
  });
});

describe("extractTelegramIdFromInitData", () => {
  it("extracts user ID from valid initData", () => {
    const user = JSON.stringify({ id: 12345, first_name: "Test" });
    const initData = `user=${encodeURIComponent(user)}&hash=fake`;
    expect(extractTelegramIdFromInitData(initData)).toBe(12345);
  });

  it("returns null for empty initData", () => {
    expect(extractTelegramIdFromInitData("")).toBeNull();
  });

  it("returns null for missing user", () => {
    expect(extractTelegramIdFromInitData("hash=fake")).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(extractTelegramIdFromInitData("user=not-json&hash=fake")).toBeNull();
  });
});
