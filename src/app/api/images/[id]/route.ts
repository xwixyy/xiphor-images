import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { safeEqualHex, sha256Hex } from "@/lib/crypto";
import { deleteImageRow, findImage } from "@/lib/images/repo";
import { removeImage } from "@/lib/files/blob";

export const runtime = "nodejs";

const ID_PATTERN = /^[A-Za-z0-9]{16}$/;

/**
 * Удаление. Разрешено владельцу аккаунта или держателю токена удаления анонимной загрузки.
 * Для чужих и несуществующих изображений возвращается одинаковый 404,
 * чтобы не раскрывать, какие ID существуют (защита от IDOR и перебора).
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  const image = await findImage(id);
  if (!image) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  const user = await getCurrentUser();
  const isOwner = user !== null && image.owner_id === user.id;

  const token = request.headers.get("x-delete-token") ?? "";
  const isTokenHolder =
    image.delete_token_hash !== null &&
    token.length > 0 &&
    token.length <= 256 &&
    safeEqualHex(sha256Hex(token), image.delete_token_hash);

  if (!isOwner && !isTokenHolder) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  await removeImage(image.blob_pathname).catch(() => undefined);
  await deleteImageRow(id);
  return new NextResponse(null, { status: 204 });
}
