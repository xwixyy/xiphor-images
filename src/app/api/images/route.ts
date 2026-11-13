import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { MAX_FILES_PER_REQUEST } from "@/lib/constants";
import { hmacHex } from "@/lib/crypto";
import { listImagesByOwner } from "@/lib/images/repo";
import { processUpload, type UploadedItem } from "@/lib/images/upload";
import { clientIp } from "@/lib/request";

export const runtime = "nodejs";

/** Галерея текущего пользователя. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const images = await listImagesByOwner(user.id);
  return NextResponse.json({ images });
}

/** Загрузка. Доступна и анонимно, и авторизованным пользователям. */
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const files = form.getAll("files").filter((v): v is File => v instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "Файлы не выбраны" }, { status: 400 });
  }
  if (files.length > MAX_FILES_PER_REQUEST) {
    return NextResponse.json(
      { error: `Не больше ${MAX_FILES_PER_REQUEST} файлов за раз` },
      { status: 400 },
    );
  }

  const user = await getCurrentUser();
  const ipDigest = hmacHex(await clientIp());

  const uploaded: UploadedItem[] = [];
  const errors: { name: string; error: string }[] = [];
  for (const file of files) {
    const outcome = await processUpload(file, user, ipDigest);
    if (outcome.ok) uploaded.push(outcome.item);
    else errors.push({ name: outcome.name, error: outcome.error });
  }

  const status = uploaded.length > 0 ? 201 : (errors[0] ? 422 : 400);
  return NextResponse.json({ uploaded, errors }, { status });
}
