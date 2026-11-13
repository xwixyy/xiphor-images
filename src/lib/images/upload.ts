import {
  ANON_BYTES_PER_DAY,
  ANON_RETENTION_DAYS,
  ANON_UPLOADS_PER_HOUR,
  USER_RETENTION_DAYS,
  USER_UPLOADS_PER_HOUR,
} from "@/lib/constants";
import { sha256Hex } from "@/lib/crypto";
import { storeImage, removeImage } from "@/lib/files/blob";
import { detectImageType, MAX_FILE_BYTES, sanitizeOriginalName } from "@/lib/files/signature";
import { generateImageId, generateToken } from "@/lib/ids";
import { insertImage, toImageRecord, type ImageRow } from "@/lib/images/repo";
import { consumeRateLimit } from "@/lib/rate-limit";
import type { ImageRecord, SessionUser } from "@/types";

export interface UploadedItem {
  image: ImageRecord;
  /** Показывается один раз, только для анонимных загрузок. */
  deleteToken?: string;
}

export type UploadOutcome =
  | { ok: true; item: UploadedItem }
  | { ok: false; status: number; name: string; error: string };

/** Обрабатывает один файл: проверка размера, сигнатуры, лимитов, сохранение в Blob и БД. */
export async function processUpload(
  file: File,
  user: SessionUser | null,
  ipDigest: string,
): Promise<UploadOutcome> {
  const name = sanitizeOriginalName(file.name);
  const fail = (status: number, error: string): UploadOutcome => ({ ok: false, status, name, error });

  if (file.size === 0) return fail(400, "Файл пустой");
  if (file.size > MAX_FILE_BYTES) return fail(413, "Файл больше 4 МБ");

  const data = Buffer.from(await file.arrayBuffer());
  if (data.length > MAX_FILE_BYTES) return fail(413, "Файл больше 4 МБ");

  // Формат определяем по содержимому, до списания квот.
  const detected = detectImageType(data);
  if (!detected) return fail(415, "Формат не поддерживается: только PNG, JPG, GIF и WebP");

  if (user) {
    const allowed = await consumeRateLimit(`user-upload:${user.id}`, USER_UPLOADS_PER_HOUR, 3600);
    if (!allowed) return fail(429, "Слишком много загрузок, попробуйте позже");
  } else {
    const countOk = await consumeRateLimit(`anon-upload-count:${ipDigest}`, ANON_UPLOADS_PER_HOUR, 3600);
    if (!countOk) return fail(429, "Лимит анонимных загрузок в час исчерпан");
    const bytesOk = await consumeRateLimit(
      `anon-upload-bytes:${ipDigest}`,
      ANON_BYTES_PER_DAY,
      24 * 3600,
      data.length,
    );
    if (!bytesOk) return fail(429, "Дневной лимит объёма для анонимов исчерпан");
  }

  const id = generateImageId(16);
  const blobPathname = `images/${id}.${detected.extension}`;
  const retentionDays = user ? USER_RETENTION_DAYS : ANON_RETENTION_DAYS;
  const expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);
  const deleteToken = user ? undefined : generateToken(32);

  await storeImage(blobPathname, data, detected.mime);
  try {
    await insertImage({
      id,
      ownerId: user?.id ?? null,
      blobPathname,
      originalName: name,
      mimeType: detected.mime,
      extension: detected.extension,
      sizeBytes: data.length,
      deleteTokenHash: deleteToken ? sha256Hex(deleteToken) : null,
      expiresAt,
    });
  } catch (error) {
    // Не оставляем файл без записи в БД.
    await removeImage(blobPathname).catch(() => undefined);
    throw error;
  }

  const row: ImageRow = {
    id,
    owner_id: user?.id ?? null,
    blob_pathname: blobPathname,
    original_name: name,
    mime_type: detected.mime,
    extension: detected.extension,
    size_bytes: data.length,
    delete_token_hash: deleteToken ? sha256Hex(deleteToken) : null,
    uploaded_at: new Date(),
    expires_at: expiresAt,
  };
  return { ok: true, item: { image: toImageRecord(row), deleteToken } };
}
