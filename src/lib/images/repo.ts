import { getSql } from "@/lib/db/client";
import type { ImageMime, ImageRecord } from "@/types";

export interface ImageRow {
  id: string;
  owner_id: string | null;
  blob_pathname: string;
  original_name: string;
  mime_type: ImageMime;
  extension: string;
  size_bytes: number;
  delete_token_hash: string | null;
  uploaded_at: Date | string;
  expires_at: Date | string;
}

export interface NewImage {
  id: string;
  ownerId: string | null;
  blobPathname: string;
  originalName: string;
  mimeType: ImageMime;
  extension: string;
  sizeBytes: number;
  deleteTokenHash: string | null;
  expiresAt: Date;
}

export function toImageRecord(row: ImageRow): ImageRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    blobPathname: row.blob_pathname,
    originalName: row.original_name,
    mimeType: row.mime_type,
    extension: row.extension,
    sizeBytes: row.size_bytes,
    uploadedAt: new Date(row.uploaded_at).toISOString(),
    expiresAt: new Date(row.expires_at).toISOString(),
  };
}

export async function insertImage(image: NewImage): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO images (
      id, owner_id, blob_pathname, original_name, mime_type,
      extension, size_bytes, delete_token_hash, expires_at
    ) VALUES (
      ${image.id}, ${image.ownerId}, ${image.blobPathname}, ${image.originalName},
      ${image.mimeType}, ${image.extension}, ${image.sizeBytes}, ${image.deleteTokenHash},
      ${image.expiresAt.toISOString()}::timestamptz
    )
  `;
}

export async function findImage(id: string): Promise<ImageRow | null> {
  const sql = getSql();
  const rows = (await sql`SELECT * FROM images WHERE id = ${id} LIMIT 1`) as ImageRow[];
  return rows[0] ?? null;
}

export async function listImagesByOwner(ownerId: string): Promise<ImageRecord[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT * FROM images
    WHERE owner_id = ${ownerId} AND expires_at > now()
    ORDER BY uploaded_at DESC
    LIMIT 500
  `) as ImageRow[];
  return rows.map(toImageRecord);
}

export async function deleteImageRow(id: string): Promise<void> {
  const sql = getSql();
  await sql`DELETE FROM images WHERE id = ${id}`;
}

export async function findExpiredImages(limit: number): Promise<{ id: string; blob_pathname: string }[]> {
  const sql = getSql();
  return (await sql`
    SELECT id, blob_pathname FROM images WHERE expires_at <= now() ORDER BY expires_at LIMIT ${limit}
  `) as { id: string; blob_pathname: string }[];
}
