-- Xiphor Images: схема PostgreSQL (Neon). Идемпотентна.

CREATE TABLE IF NOT EXISTS users (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname            varchar(24) NOT NULL,
  -- Нормализованный ник (lower-case) для уникальности без учёта регистра.
  nickname_normalized varchar(24) NOT NULL UNIQUE,
  password_hash       text NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_nickname_length CHECK (char_length(nickname) BETWEEN 3 AND 24),
  CONSTRAINT users_nickname_format CHECK (nickname ~ '^[A-Za-z0-9_-]{3,24}$')
);

-- Сессии хранятся только как SHA-256 от случайного токена.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash  char(64) PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_idx    ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS images (
  id                 varchar(16) PRIMARY KEY,
  -- NULL для анонимных загрузок.
  owner_id           uuid REFERENCES users(id) ON DELETE CASCADE,
  -- Путь в приватном Vercel Blob (генерируется сервером, не из имени файла).
  blob_pathname      text NOT NULL UNIQUE,
  -- Оригинальное имя только для отображения; в пути и заголовках не используется.
  original_name      varchar(255) NOT NULL,
  mime_type          varchar(32) NOT NULL,
  extension          varchar(8) NOT NULL,
  size_bytes         integer NOT NULL,
  -- Хеш токена удаления для анонимных загрузок (SHA-256), NULL для аккаунтов.
  delete_token_hash  char(64),
  uploaded_at        timestamptz NOT NULL DEFAULT now(),
  -- 90 дней для анонимов, 180 дней для аккаунтов (проставляет приложение).
  expires_at         timestamptz NOT NULL,
  CONSTRAINT images_size_limit CHECK (size_bytes > 0 AND size_bytes <= 4194304),
  CONSTRAINT images_mime_allowed CHECK (mime_type IN ('image/png','image/jpeg','image/gif','image/webp')),
  CONSTRAINT images_anon_token CHECK (owner_id IS NOT NULL OR delete_token_hash IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS images_owner_idx   ON images (owner_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS images_expires_idx ON images (expires_at);

-- Счётчики лимитов: загрузки/час и объём/сутки для IP, попытки входа.
-- bucket_key — SHA-256 от логического ключа (IP с солью, ник и т.п.), без сырых данных.
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket_key   char(64) PRIMARY KEY,
  hits         bigint NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now()
);
