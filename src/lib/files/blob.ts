import { del, get, put } from "@vercel/blob";

/** Все операции с Blob выполняются только на сервере; токен в браузер не передаётся. */
export async function storeImage(pathname: string, data: Buffer, contentType: string): Promise<void> {
  await put(pathname, data, {
    access: "private",
    contentType,
    addRandomSuffix: false,
  });
}

export async function openImage(pathname: string) {
  const result = await get(pathname, { access: "private" });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  return result;
}

export async function removeImage(pathname: string): Promise<void> {
  await del(pathname);
}
