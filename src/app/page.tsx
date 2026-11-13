"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthForm } from "@/components/AuthForm";
import { Gallery } from "@/components/Gallery";
import { Uploader, type UploadResultItem } from "@/components/Uploader";
import { formatBytes } from "@/lib/format";
import type { ImageRecord, SessionUser } from "@/types";

export default function HomePage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast((current) => (current === message ? null : current)), 2800);
  }, []);

  const loadGallery = useCallback(async () => {
    const response = await fetch("/api/images", { cache: "no-store" });
    if (response.ok) {
      const data = (await response.json()) as { images: ImageRecord[] };
      setImages(data.images);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const data = (await response.json()) as { user: SessionUser | null };
      setUser(data.user);
      if (data.user) await loadGallery();
      setReady(true);
    })();
  }, [loadGallery]);

  async function handleAuthed(next: SessionUser, created: boolean) {
    setUser(next);
    notify(created ? `Аккаунт «${next.nickname}» создан` : `Добро пожаловать, ${next.nickname}`);
    await loadGallery();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setImages([]);
    notify("Вы вышли из аккаунта");
  }

  function handleUploaded(items: UploadResultItem[]) {
    if (user) {
      setImages((prev) => [...items.map((i) => i.image), ...prev]);
    }
  }

  if (!ready) {
    return <div className="page"><p className="muted">Загрузка…</p></div>;
  }

  const totalBytes = images.reduce((sum, image) => sum + image.sizeBytes, 0);

  return (
    <main className="page">
      <header className="topbar">
        <div className="brand">Xiphor<span>Images</span></div>
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="muted">{user.nickname}</span>
            <button className="btn btn-small" onClick={logout}>Выйти</button>
          </div>
        )}
      </header>

      {!user && (
        <>
          <section className="card" style={{ marginBottom: 20 }}>
            <h1 className="auth-title" style={{ marginBottom: 6 }}>Загрузите изображение</h1>
            <p className="muted" style={{ marginTop: 0 }}>Вход не нужен. Анонимные файлы хранятся 90 дней.</p>
            <Uploader onUploaded={handleUploaded} onNotify={notify} />
          </section>
          <AuthForm onAuthed={handleAuthed} />
        </>
      )}

      {user && (
        <>
          <div className="stats">
            <div className="stat">
              <div className="stat-value">{images.length}</div>
              <div className="stat-label">Изображений</div>
            </div>
            <div className="stat">
              <div className="stat-value">{formatBytes(totalBytes)}</div>
              <div className="stat-label">Общий объём</div>
            </div>
          </div>

          <section className="card" style={{ marginBottom: 20 }}>
            <h2 style={{ margin: "0 0 14px", fontSize: 20 }}>Загрузка</h2>
            <Uploader onUploaded={handleUploaded} onNotify={notify} />
          </section>

          <section>
            <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>Галерея</h2>
            <Gallery
              images={images}
              onDeleted={(id) => setImages((prev) => prev.filter((i) => i.id !== id))}
              onNotify={notify}
            />
          </section>
        </>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
