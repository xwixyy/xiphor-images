"use client";

import { useState, type FormEvent } from "react";
import type { SessionUser } from "@/types";

interface Props {
  onAuthed: (user: SessionUser, created: boolean) => void;
}

export function AuthForm({ onAuthed }: Props) {
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, password }),
      });
      const data = (await response.json()) as { user?: SessionUser; created?: boolean; error?: string };
      if (!response.ok || !data.user) {
        setError(data.error ?? "Не удалось войти");
        return;
      }
      onAuthed(data.user, Boolean(data.created));
    } catch {
      setError("Нет соединения с сервером");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="card">
        <h1 className="auth-title">Войти или создать аккаунт</h1>
        <p className="muted" style={{ marginTop: 0, marginBottom: 20 }}>
          Если ника ещё нет, аккаунт создастся автоматически. Загружать картинки можно и без входа.
        </p>
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="nickname">Никнейм</label>
            <input
              id="nickname"
              className="input"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              autoComplete="username"
              minLength={3}
              maxLength={24}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Пароль</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              minLength={10}
              maxLength={256}
              required
            />
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: "100%", marginTop: 8 }}>
            {busy ? "Входим…" : "Продолжить"}
          </button>
        </form>
      </div>
    </div>
  );
}
