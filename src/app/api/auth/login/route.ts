import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/service";
import { createSession } from "@/lib/auth/session";
import {
  LOGIN_ATTEMPTS_PER_IP,
  LOGIN_ATTEMPTS_PER_NICKNAME,
  LOGIN_WINDOW_SECONDS,
} from "@/lib/constants";
import { hmacHex } from "@/lib/crypto";
import { clientIp } from "@/lib/request";
import { consumeRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  // JSON-only: форма с другого сайта не может отправить такой запрос без CORS-предзапроса.
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json({ error: "Неверный формат запроса" }, { status: 415 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (typeof parsed !== "object" || parsed === null) throw new Error("bad body");
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const ip = await clientIp();
  const ipOk = await consumeRateLimit(`login-ip:${hmacHex(ip)}`, LOGIN_ATTEMPTS_PER_IP, LOGIN_WINDOW_SECONDS);
  if (!ipOk) {
    return NextResponse.json({ error: "Слишком много попыток, попробуйте позже" }, { status: 429 });
  }
  if (typeof body.nickname === "string") {
    const nickOk = await consumeRateLimit(
      `login-nick:${body.nickname.toLowerCase()}`,
      LOGIN_ATTEMPTS_PER_NICKNAME,
      LOGIN_WINDOW_SECONDS,
    );
    if (!nickOk) {
      return NextResponse.json({ error: "Слишком много попыток для этого ника" }, { status: 429 });
    }
  }

  const outcome = await authenticate(body.nickname, body.password);
  if (!outcome.ok) {
    return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  }

  await createSession(outcome.user.id);
  return NextResponse.json({ user: outcome.user, created: outcome.created });
}
