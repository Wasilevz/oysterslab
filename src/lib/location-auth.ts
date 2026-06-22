import { createHmac, randomBytes } from "crypto";

const QR_SECRET = process.env.QR_SIGNING_SECRET || "default-qr-secret-change-me";
const QR_VALIDITY_SECONDS = 60;

export interface QRPayload {
  secret: string;
  ts: number;
  nonce: string;
}

export function generateQRSecret(): string {
  return randomBytes(16).toString("hex");
}

export function signQR(ts: number, nonce: string): string {
  const data = `${ts}:${nonce}`;
  return createHmac("sha256", QR_SECRET).update(data).digest("hex");
}

export function generateQRData(): { payload: QRPayload; signature: string } {
  const ts = Math.floor(Date.now() / 1000);
  const nonce = randomBytes(8).toString("hex");
  const signature = signQR(ts, nonce);

  return {
    payload: { secret: QR_SECRET.slice(0, 8), ts, nonce },
    signature,
  };
}

export function validateQR(ts: number, nonce: string, signature: string): boolean {
  const now = Math.floor(Date.now() / 1000);

  if (Math.abs(now - ts) > QR_VALIDITY_SECONDS) {
    return false;
  }

  const expected = signQR(ts, nonce);
  if (expected.length !== signature.length) return false;

  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }

  return result === 0;
}

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }
  return "127.0.0.1";
}

export function isIPAllowed(clientIP: string, allowedIPs: string[]): boolean {
  if (allowedIPs.length === 0) return false;

  const normalizedClient = clientIP.toLowerCase().trim();

  return allowedIPs.some((allowed) => {
    const trimmed = allowed.trim().toLowerCase();
    if (!trimmed) return false;

    if (trimmed.includes("/")) {
      const prefix = trimmed.split("/")[0];
      return normalizedClient.startsWith(prefix);
    }

    return normalizedClient === trimmed;
  });
}
