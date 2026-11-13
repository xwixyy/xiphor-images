"use client";

import { useState } from "react";
import type { ImageRecord } from "@/types";
import { formatBytes, formatDate } from "@/lib/format";

interface Props {
  images: ImageRecord[];
  onDeleted: (id: string) => void;
  onNotify: (message: string) => void;
}

export function Gallery({ images, onDeleted, onNotify }: Props) {
  if (images.length === 0) {
    return (
      <div className="empty">
        <p style={{ fontSize: 18, margin: "0 0 6px", color: "var(--text)" }}>Пока здесь пусто</p>
        <p style={{ margin: 0 }}>Загруженные изображения появятся в этой галерее.</p>
      </div>
    );
  }
  return (
    <div className="gallery">
      {images.map((image) => (
        <Tile key={image.id} image={image} onDeleted={onDeleted} onNotify={onNotify} />
      ))}
    </div>
  );
}

function Tile({
  image,
  onDeleted,
  onNotify,
}: {
  image: ImageRecord;
  onDeleted: (id: string) => void;
  onNotify: (message: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const direct = `${origin}/d/${image.id}`;
  const simple = `${origin}/i/${image.id}`;

  async function remove() {
    setBusy(true);
    try {
      const response = await fetch(`/api/images/${image.id}`, { method: "DELETE" });
      if (!response.ok && response.status !== 204) {
        onNotify("Не удалось удалить изображение");
        return;
      }
      onDeleted(image.id);
      onNotify("Изображение удалено");
    } catch {
      onNotify("Нет соединения с сервером");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    onNotify(`${label} скопирована`);
  }

  return (
    <article className="tile">
      <div className="tile-thumb">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/d/${image.id}`} alt={image.originalName} loading="lazy" />
      </div>
      <div className="tile-body">
        <div className="tile-name" title={image.originalName}>{image.originalName}</div>
        <div className="tile-meta">{formatDate(image.uploadedAt)} · {formatBytes(image.sizeBytes)}</div>
        <div className="tile-meta">Удалится: {formatDate(image.expiresAt)}</div>
      </div>
      <div className="tile-actions">
        <button className="btn btn-small" onClick={() => copy(direct, "Прямая ссылка")}>Direct</button>
        <button className="btn btn-small" onClick={() => copy(simple, "Ссылка")}>Simple</button>
        {confirming ? (
          <>
            <button className="btn btn-small btn-danger" onClick={remove} disabled={busy}>
              {busy ? "Удаляем…" : "Точно удалить"}
            </button>
            <button className="btn btn-small" onClick={() => setConfirming(false)} disabled={busy}>Отмена</button>
          </>
        ) : (
          <button className="btn btn-small btn-danger" onClick={() => setConfirming(true)}>Удалить</button>
        )}
      </div>
    </article>
  );
}
