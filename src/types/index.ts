export type ImageMime = "image/png" | "image/jpeg" | "image/gif" | "image/webp";

export interface SessionUser {
  id: string;
  nickname: string;
}

export interface ImageRecord {
  id: string;
  ownerId: string | null;
  blobPathname: string;
  originalName: string;
  mimeType: ImageMime;
  extension: string;
  sizeBytes: number;
  uploadedAt: string;
  expiresAt: string;
}

export interface ApiError {
  error: string;
}
