import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
// Параметры scrypt: N=2^17, r=8, p=1 — соответствуют рекомендациям OWASP.
const SCRYPT_OPTIONS = { N: 2 ** 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 } as const;
const FORMAT = "scrypt";

function deriveKey(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, options, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}

/** Формат хранения: scrypt$N$r$p$salt(base64)$hash(base64) */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await deriveKey(password, salt, SCRYPT_OPTIONS);
  return [
    FORMAT,
    SCRYPT_OPTIONS.N,
    SCRYPT_OPTIONS.r,
    SCRYPT_OPTIONS.p,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== FORMAT) return false;

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = Buffer.from(parts[4] ?? "", "base64");
  const expected = Buffer.from(parts[5] ?? "", "base64");
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
  if (expected.length !== KEY_LENGTH) return false;

  const key = await deriveKey(password, salt, { N, r, p, maxmem: SCRYPT_OPTIONS.maxmem });
  return timingSafeEqual(key, expected);
}

/**
 * Для несуществующего ника тоже выполняется проверка хеша,
 * чтобы время ответа не выдавало, есть ли такой аккаунт.
 * Хеш-заглушка вычисляется один раз на процесс.
 */
let dummyHashPromise: Promise<string> | undefined;
export function getDummyHash(): Promise<string> {
  dummyHashPromise ??= hashPassword(randomBytes(32).toString("hex"));
  return dummyHashPromise;
}
