# Xiphor Images

Хостинг изображений: Next.js (App Router), TypeScript, PostgreSQL (Neon), Vercel Blob.
Домен: `img.xiphor.cc.cd`.

## 1. Локальный запуск

```bash
npm install
cp .env.example .env.local     # заполните значения
psql "$DATABASE_URL" -f db/schema.sql   # или выполните schema.sql в SQL Editor Neon
npm run dev
```

Проверки перед деплоем:

```bash
npm run typecheck
npm run lint
npm run build
```

## 2. Загрузка кода на GitHub

```bash
cd xiphor-images
git init -b main
git add .
git commit -m "Initial commit: Xiphor Images"
git remote add origin https://github.com/<ваш-логин>/xiphor-images.git
git push -u origin main
```

Перед первым `git add` убедитесь, что файла `.env.local` нет в репозитории: он указан в `.gitignore`.
Создайте пустой приватный репозиторий на github.com (без README и .gitignore, чтобы не было конфликта).

## 3. База данных: Neon

1. Зайдите на neon.tech (или через Vercel Marketplace → Neon) и создайте проект, например `xiphor-images`.
2. Регион выберите ближайший к основным пользователям.
3. В карточке проекта нажмите **Connect** и скопируйте строку подключения. Берите вариант **Pooled connection**.
4. Откройте **SQL Editor**, вставьте содержимое `db/schema.sql` и выполните. Скрипт идемпотентен, его можно запускать повторно.
5. Строка подключения пойдёт в переменную `DATABASE_URL`.

## 4. Хранилище файлов: Vercel Blob

1. В Vercel откройте проект после импорта (шаг 5) → вкладка **Storage** → **Create** → **Blob**.
2. Создайте хранилище. Если Vercel предлагает выбрать доступ, выберите **Private**: файлы не должны быть доступны напрямую по публичным URL.
3. Подключите хранилище к проекту. Vercel сам добавит переменную `BLOB_READ_WRITE_TOKEN` для всех окружений.

Токен не должен попадать в браузер: все операции с Blob выполняются только на сервере.

## 5. Деплой на Vercel из GitHub

1. Зайдите на vercel.com → **Add New… → Project**.
2. Выберите **Import Git Repository** и репозиторий `xiphor-images`. Если Vercel не видит его, подключите GitHub-аккаунт и дайте доступ к репозиторию.
3. Framework Preset определится как **Next.js**. Остальные настройки оставьте по умолчанию.
4. Перед нажатием **Deploy** откройте **Environment Variables** и добавьте:
   - `DATABASE_URL`: строка Neon из шага 3.
   - `IP_HASH_SECRET`: `openssl rand -base64 32`.
   - `CRON_SECRET`: `openssl rand -base64 32`.
   - `NEXT_PUBLIC_BASE_URL`: `https://img.xiphor.cc.cd`.
5. Нажмите **Deploy**. После сборки проект будет доступен по адресу `*.vercel.app`.
6. `BLOB_READ_WRITE_TOKEN` добавится автоматически, когда подключите Blob (шаг 4). Если подключали после деплоя, сделайте **Redeploy**.

Дальнейшие изменения: каждый `git push` в `main` запускает новый деплой автоматически. Пуш в другую ветку создаёт Preview-деплой с отдельным адресом.

## 6. Подключение своего домена img.xiphor.cc.cd

Схема: домен `xiphor.cc.cd` уже у вас у регистратора. Нужна одна DNS-запись для поддомена `img`.

1. В Vercel откройте проект → **Settings → Domains**.
2. Введите `img.xiphor.cc.cd` и нажмите **Add**.
3. Vercel покажет, какую запись создать. Для поддомена обычно это:
   - Type: `CNAME`
   - Name: `img`
   - Value: `cname.vercel-dns.com`
   Точное значение показывает Vercel на экране. Используйте его, если оно отличается.
4. Зайдите в панель DNS вашего регистратора (или Cloudflare, если DNS там) и создайте эту запись. Для Cloudflare отключите оранжевое облако (proxy), иначе Vercel не сможет выпустить сертификат.
5. Вернитесь в Vercel. Статус станет **Valid Configuration** через несколько минут, иногда до часа из-за обновления DNS. SSL-сертификат выпускается автоматически.
6. Проверка: `nslookup img.xiphor.cc.cd` должен показать `cname.vercel-dns.com`.

Если хотите сделать основным адресом `xiphor.cc.cd` без поддомена, Vercel попросит A-запись. Значение тоже будет показано в интерфейсе.

## 7. Переменные окружения: сводка

| Переменная | Где взять | Зачем |
|---|---|---|
| `DATABASE_URL` | Neon → Connect (pooled) | Подключение к PostgreSQL |
| `BLOB_READ_WRITE_TOKEN` | Vercel → Storage → Blob | Загрузка и чтение файлов (только сервер) |
| `IP_HASH_SECRET` | `openssl rand -base64 32` | Соль для хешей IP в лимитах |
| `CRON_SECRET` | `openssl rand -base64 32` | Защита маршрута очистки от посторонних вызовов |
| `NEXT_PUBLIC_BASE_URL` | Ваш домен | Формирование ссылок в интерфейсе |

Все переменные задаются в Vercel → Settings → Environment Variables. Для изменений после деплоя нужен Redeploy. Не добавляйте секреты в код и не выносите их в `NEXT_PUBLIC_*`, кроме базового URL.

## 8. Очистка истёкших файлов

Vercel Cron будет вызывать маршрут очистки раз в сутки. Он удаляет файлы и записи с истёкшим `expires_at` (90 дней для анонимов, 180 для аккаунтов). Маршрут защищён `CRON_SECRET`. Расписание задаётся в `vercel.json`, он будет добавлен вместе с этим маршрутом.

## 9. Проверка после деплоя

- `https://img.xiphor.cc.cd` открывается с действующим сертификатом.
- Загрузка картинки работает, ссылка `/d/<id>` отдаёт файл с правильным `Content-Type` без перенаправлений.
- Ссылка `/i/<id>` открывает страницу просмотра.
- Истёкшие и чужие изображения возвращают 404.
