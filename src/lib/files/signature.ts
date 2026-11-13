import type { ImageMime } from "@/types";

export interface DetectedImage {
  mime: ImageMime;
  extension: "png" | "jpg" | "gif" | "webp";
}

/**
 * Определение формата по магическим байтам. MIME-тип от клиента и расширение
 * имени файла не используются для решения, является ли файл изображением.
 */
export function detectImageType(buf: Uint8Array): DetectedImage | null {
  if (buf.length >= 8 &&
      buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
      buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a) {
    return { mime: "image/png", extension: "png" };
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mime: "image/jpeg", extension: "jpg" };
  }
  if (buf.length >= 6 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 &&
      buf[3] === 0x38 && (buf[4] === 0x37 || buf[4] === 0x39) && buf[5] === 0x61) {
    return { mime: "image/gif", extension: "gif" };
  }
  if (buf.length >= 12 &&
      buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) {
    return { mime: "image/webp", extension: "webp" };
  }
  return null;
}

/** Безопасное имя для отображения: без путей, управляющих символов и лишней длины. */
export function sanitizeOriginalName(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  const limited = cleaned.slice(0, 255);
  return limited.length > 0 ? limited : "image";
}

export const MAX_FILE_BYTES = 4 * 1024 * 1024;
