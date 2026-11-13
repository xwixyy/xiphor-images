import { neon } from "@neondatabase/serverless";

type Sql = ReturnType<typeof neon>;
let client: Sql | undefined;

/** Ленивая инициализация: переменная читается при первом запросе, а не при сборке. */
export function getSql(): Sql {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not configured");
    }
    client = neon(url);
  }
  return client;
}
