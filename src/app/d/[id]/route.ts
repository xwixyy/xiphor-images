import { findImage } from "@/lib/images/repo";
import { openImage } from "@/lib/files/blob";

export const runtime = "nodejs";

const ID_PATTERN = /^[A-Za-z0-9]{16}$/;

const notFound = () =>
  new Response("Not found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });

/**
 * Прямая ссылка: отдаёт сам файл с правильным Content-Type.
 * Без HTML и без редиректа на домен хранилища: файл стримится через сервер.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID_PATTERN.test(id)) return notFound();

  const image = await findImage(id);
  if (!image || new Date(image.expires_at).getTime() <= Date.now()) return notFound();

  const file = await openImage(image.blob_pathname);
  if (!file) return notFound();

  return new Response(file.stream, {
    status: 200,
    headers: {
      "Content-Type": image.mime_type,
      "Content-Length": String(image.size_bytes),
      "Content-Disposition": `inline; filename="${id}.${image.extension}"`,
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
