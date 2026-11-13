import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findImage, toImageRecord } from "@/lib/images/repo";
import { formatBytes, formatDate } from "@/lib/format";

export const runtime = "nodejs";

const ID_PATTERN = /^[A-Za-z0-9]{16}$/;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: ID_PATTERN.test(id) ? "Изображение · Xiphor Images" : "Не найдено" };
}

/** Простая ссылка: страница просмотра с картинкой и метаданными. */
export default async function ImagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID_PATTERN.test(id)) notFound();

  const row = await findImage(id);
  if (!row || new Date(row.expires_at).getTime() <= Date.now()) notFound();
  const image = toImageRecord(row);

  return (
    <main className="viewer">
      <div className="topbar" style={{ padding: "8px 0 16px" }}>
        <a href="/" className="brand" style={{ textDecoration: "none", color: "inherit" }}>
          Xiphor<span>Images</span>
        </a>
      </div>
      <section className="card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="viewer-image" src={`/d/${image.id}`} alt={image.originalName} />
        <h1 style={{ fontSize: 22, margin: "18px 0 4px", wordBreak: "break-word" }}>{image.originalName}</h1>
        <div className="facts">
          <div className="stat">
            <div className="stat-label">Формат</div>
            <div className="stat-value" style={{ fontSize: 20 }}>{image.extension.toUpperCase()}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Размер</div>
            <div className="stat-value" style={{ fontSize: 20 }}>{formatBytes(image.sizeBytes)}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Загружено</div>
            <div className="stat-value" style={{ fontSize: 16 }}>{formatDate(image.uploadedAt)}</div>
          </div>
        </div>
        <a className="btn btn-primary" href={`/d/${image.id}`} target="_blank" rel="noopener noreferrer">
          Открыть прямую ссылку
        </a>
      </section>
    </main>
  );
}
