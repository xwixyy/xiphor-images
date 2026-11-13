import { NextResponse } from "next/server";
import { removeImage } from "@/lib/files/blob";
import { deleteImageRow, findExpiredImages } from "@/lib/images/repo";

export const runtime = "nodejs";
export const maxDuration = 60;

const BATCH_SIZE = 200;

/** Вызывается Vercel Cron. Удаляет файлы и записи с истёкшим сроком хранения. */
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const expired = await findExpiredImages(BATCH_SIZE);
  let deleted = 0;
  for (const image of expired) {
    await removeImage(image.blob_pathname).catch(() => undefined);
    await deleteImageRow(image.id);
    deleted += 1;
  }
  return NextResponse.json({ deleted });
}
