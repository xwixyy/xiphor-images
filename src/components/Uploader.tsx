"use client";

import { useMemo, useRef, useState, type DragEvent } from "react";
import type { ImageRecord } from "@/types";
import { formatBytes } from "@/lib/format";

export interface UploadResultItem {
  image: ImageRecord;
  deleteToken?: string;
}

interface Props {
  onUploaded: (items: UploadResultItem[]) => void;
  onNotify: (message: string) => void;
}

const ACCEPT = "image/png,image/jpeg,image/gif,image/webp";
const MAX_BYTES = 4 * 1024 * 1024;

export function Uploader({ onUploaded, onNotify }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<UploadResultItem[]>([]);

  const previews = useMemo(() => files.map((f) => ({ file: f, url: URL.createObjectURL(f) })), [files]);

  function addFiles(list: FileList | File[]) {
    setError(null);
    const accepted: File[] = [];
    for (const file of Array.from(list)) {
      if (!ACCEPT.split(",").includes(file.type)) {
        setError(`«${file.name}»: формат не поддерживается`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        setError(`«${file.name}»: больше 4 МБ`);
        continue;
      }
      accepted.push(file);
    }
    setFiles((prev) => [...prev, ...accepted].slice(0, 10));
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  }

  function upload() {
    if (files.length === 0) return;
    setError(null);
    setProgress(0);

    const body = new FormData();
    for (const file of files) body.append("files", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/images");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      setProgress(null);
      let data: { uploaded?: UploadResultItem[]; errors?: { name: string; error: string }[]; error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = {};
      }
      const uploaded = data.uploaded ?? [];
      if (uploaded.length > 0) {
        setResults((prev) => [...uploaded, ...prev]);
        onUploaded(uploaded);
        onNotify(uploaded.length === 1 ? "Изображение загружено" : `Загружено: ${uploaded.length}`);
        setFiles([]);
      }
      const problems = data.errors?.map((e) => `«${e.name}»: ${e.error}`) ?? [];
      if (xhr.status >= 400 && problems.length === 0) problems.push(data.error ?? "Ошибка загрузки");
      if (problems.length > 0) setError(problems.join("; "));
    };
    xhr.onerror = () => {
      setProgress(null);
      setError("Нет соединения с сервером");
    };
    xhr.send(body);
  }

  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    onNotify(`${label} скопирована`);
  }

  return (
    <div>
      <div
        className={`dropzone${dragging ? " active" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
        <p className="dropzone-title">Перетащите изображения сюда</p>
        <p className="muted" style={{ margin: 0 }}>или выберите файлы · PNG, JPG, GIF, WebP · до 4 МБ</p>
      </div>

      {previews.length > 0 && (
        <>
          <div className="previews">
            {previews.map(({ file, url }) => (
              <div className="preview" key={`${file.name}-${file.size}-${url}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={file.name} />
              </div>
            ))}
          </div>
          <button className="btn btn-primary" onClick={upload} disabled={progress !== null}>
            {progress !== null ? `Загрузка ${progress}%` : `Загрузить (${files.length})`}
          </button>
          {progress !== null && (
            <div className="progress" aria-hidden="true"><div style={{ width: `${progress}%` }} /></div>
          )}
        </>
      )}

      {error && <p className="error" role="alert">{error}</p>}

      {results.length > 0 && (
        <div className="results">
          {results.map(({ image, deleteToken }) => (
            <ResultCard key={image.id} item={{ image, deleteToken }} onCopy={copy} />
          ))}
        </div>
      )}
    </div>
  );
}

function ResultCard({
  item,
  onCopy,
}: {
  item: UploadResultItem;
  onCopy: (text: string, label: string) => void;
}) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const direct = `${origin}/d/${item.image.id}`;
  const simple = `${origin}/i/${item.image.id}`;
  return (
    <div className="result">
      <strong>{item.image.originalName}</strong>
      <div className="muted">{formatBytes(item.image.sizeBytes)}</div>
      <div className="link-row">
        <code title={direct}>{direct}</code>
        <button className="btn btn-small" onClick={() => onCopy(direct, "Прямая ссылка")}>Direct</button>
      </div>
      <div className="link-row">
        <code title={simple}>{simple}</code>
        <button className="btn btn-small" onClick={() => onCopy(simple, "Ссылка")}>Simple</button>
      </div>
      {item.deleteToken && (
        <div className="link-row">
          <code title="Токен удаления">Токен удаления: {item.deleteToken}</code>
          <button className="btn btn-small" onClick={() => onCopy(item.deleteToken ?? "", "Токен")}>Копировать</button>
        </div>
      )}
      {item.deleteToken && (
        <p className="muted" style={{ marginBottom: 0 }}>
          Сохраните токен: он показывается один раз и нужен для удаления анонимной загрузки.
        </p>
      )}
    </div>
  );
}
