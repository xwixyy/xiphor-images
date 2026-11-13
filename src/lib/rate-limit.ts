import { sha256Hex } from "@/lib/crypto";
import { getSql } from "@/lib/db/client";

/**
 * Атомарный счётчик с фиксированным окном. Одна SQL-операция,
 * поэтому параллельные запросы не обходят лимит.
 * Возвращает true, если после добавления amount лимит не превышен.
 */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
  amount = 1,
): Promise<boolean> {
  const bucket = sha256Hex(key);
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO rate_limits (bucket_key, hits, window_start)
    VALUES (${bucket}, ${amount}, now())
    ON CONFLICT (bucket_key) DO UPDATE SET
      hits = CASE
        WHEN rate_limits.window_start <= now() - make_interval(secs => ${windowSeconds})
        THEN EXCLUDED.hits
        ELSE rate_limits.hits + EXCLUDED.hits
      END,
      window_start = CASE
        WHEN rate_limits.window_start <= now() - make_interval(secs => ${windowSeconds})
        THEN now()
        ELSE rate_limits.window_start
      END
    RETURNING hits
  `) as { hits: string | number }[];
  return Number(rows[0]?.hits ?? 0) <= limit;
}
