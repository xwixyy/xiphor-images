import { cookies } from "next/headers";
import { sha256Hex } from "@/lib/crypto";
import { getSql } from "@/lib/db/client";
import { SESSION_TTL_DAYS } from "@/lib/constants";
import { generateToken } from "@/lib/ids";
import type { SessionUser } from "@/types";

export const SESSION_COOKIE = "xi_session";

/** В БД хранится только SHA-256 токена; сам токен живёт лишь в HTTP-only cookie. */
export async function createSession(userId: string): Promise<void> {
  const token = generateToken(32);
  const sql = getSql();
  await sql`
    INSERT INTO sessions (token_hash, user_id, expires_at)
    VALUES (${sha256Hex(token)}, ${userId}, now() + make_interval(days => ${SESSION_TTL_DAYS}))
  `;
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || token.length > 256) return null;

  const sql = getSql();
  const rows = (await sql`
    SELECT u.id, u.nickname
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${sha256Hex(token)} AND s.expires_at > now()
    LIMIT 1
  `) as { id: string; nickname: string }[];
  const row = rows[0];
  return row ? { id: row.id, nickname: row.nickname } : null;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const sql = getSql();
    await sql`DELETE FROM sessions WHERE token_hash = ${sha256Hex(token)}`;
  }
  jar.delete(SESSION_COOKIE);
}
