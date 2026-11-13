import { randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 * Криптографически стойкий ID из 16 символов (~95 бит энтропии).
 * Rejection sampling убирает смещение распределения при модуле.
 */
export function generateImageId(length = 16): string {
  const limit = 256 - (256 % ALPHABET.length);
  let out = "";
  while (out.length < length) {
    for (const byte of randomBytes(length * 2)) {
      if (byte < limit && out.length < length) {
        out += ALPHABET[byte % ALPHABET.length];
      }
    }
  }
  return out;
}

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
