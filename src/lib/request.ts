import { headers } from "next/headers";

/** IP клиента. На Vercel заголовок x-forwarded-for выставляется платформой. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || "unknown";
}
