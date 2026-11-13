import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { normalizeNickname, validateNickname, validatePassword } from "@/lib/auth/validation";
import { getSql } from "@/lib/db/client";
import type { SessionUser } from "@/types";

export type AuthOutcome =
  | { ok: true; user: SessionUser; created: boolean }
  | { ok: false; status: number; error: string };

type UserRow = { id: string; nickname: string; password_hash: string };

const invalidCredentials = (): AuthOutcome => ({
  ok: false,
  status: 401,
  error: "Неверный никнейм или пароль",
});

/**
 * Вход или автоматическое создание аккаунта.
 * Ник уникален без учёта регистра: индекс nickname_normalized + ON CONFLICT
 * не допускают дублей даже при одновременной регистрации.
 */
export async function authenticate(nicknameInput: unknown, passwordInput: unknown): Promise<AuthOutcome> {
  const nickname = validateNickname(nicknameInput);
  if (!nickname.ok) return { ok: false, status: 400, error: nickname.error };
  const password = validatePassword(passwordInput);
  if (!password.ok) return { ok: false, status: 400, error: password.error };

  const sql = getSql();
  const normalized = normalizeNickname(nickname.value);

  const existing = (await sql`
    SELECT id, nickname, password_hash FROM users WHERE nickname_normalized = ${normalized} LIMIT 1
  `) as UserRow[];
  const found = existing[0];
  if (found) {
    const valid = await verifyPassword(password.value, found.password_hash);
    if (!valid) return invalidCredentials();
    return { ok: true, user: { id: found.id, nickname: found.nickname }, created: false };
  }

  const passwordHash = await hashPassword(password.value);
  const inserted = (await sql`
    INSERT INTO users (nickname, nickname_normalized, password_hash)
    VALUES (${nickname.value}, ${normalized}, ${passwordHash})
    ON CONFLICT (nickname_normalized) DO NOTHING
    RETURNING id, nickname
  `) as { id: string; nickname: string }[];
  const created = inserted[0];
  if (created) {
    return { ok: true, user: { id: created.id, nickname: created.nickname }, created: true };
  }

  // Ник заняли параллельным запросом: входим в уже созданный аккаунт по его паролю.
  const raced = (await sql`
    SELECT id, nickname, password_hash FROM users WHERE nickname_normalized = ${normalized} LIMIT 1
  `) as UserRow[];
  const winner = raced[0];
  if (!winner) return invalidCredentials();
  const valid = await verifyPassword(password.value, winner.password_hash);
  if (!valid) return invalidCredentials();
  return { ok: true, user: { id: winner.id, nickname: winner.nickname }, created: false };
}
