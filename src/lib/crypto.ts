import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** HMAC с секретом сервера: используется для IP, чтобы не хранить адреса в открытом виде. */
export function hmacHex(value: string): string {
  const secret = process.env.IP_HASH_SECRET;
  if (!secret) throw new Error("IP_HASH_SECRET is not configured");
  return createHmac("sha256", secret).update(value).digest("hex");
}

/** Сравнение hex-строк за постоянное время. */
export function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}
