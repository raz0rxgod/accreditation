# Деплой на прод — пошагово

Рассчитано на чистую Ubuntu-виртуалку с Docker и Docker Compose, домен уже
указывает на её IP (A-запись). Если домена ещё нет — сначала настройте его,
без него не получить TLS-сертификат Let's Encrypt.

## 0. Что изменилось в конфигах перед этим шагом (важно понимать)

Раньше `docker-compose.yml` монтировал исходники (`./backend:/app`,
`./frontend:/app`) поверх собранного образа — на проде это ломает контейнер
(в примонтированной папке нет собранного `dist/`, а именно его запускает
`CMD` из Dockerfile). Я убрал эти volume'ы. Для разработки с hot-reload
по-прежнему запускайте `npm run start:dev` / `npm run dev` на хосте, как вы
и делали — Docker теперь только для прод-сборки.

Второе: раз сайт будет на HTTPS, браузер **заблокирует** запросы к API и
предпросмотр файлов, если они идут по обычному HTTP (mixed content) — это
не только про камеру QR-сканера. Поэтому backend и MinIO тоже пущены через
nginx с тем же сертификатом, каждый на своём порту:

| Порт | Что | Наружу |
|---|---|---|
| 443 | сайт (frontend) | да |
| 8443 | backend REST + WebSocket-чат | да |
| 9443 | MinIO (файлы, фото, бейджи) | да |
| 80 | редирект на https + ACME-challenge | да |
| 5432, 6379, 9001 | Postgres, Redis, MinIO-консоль | только с самого сервера (127.0.0.1) |

## 1. Установить Docker (если ещё нет)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker
```

## 2. Скопировать проект на сервер и открыть порты

```bash
# на сервере, после переноса архива проекта
cd accreditation-portal
sudo ufw allow 22,80,443,8443,9443/tcp
sudo ufw enable
```

## 3. Получить TLS-сертификат (Let's Encrypt, standalone)

Порт 80 должен быть свободен на момент выпуска (nginx ещё не запущен —
это нормально, запустим его позже).

```bash
sudo docker run --rm -p 80:80 \
  -v $(pwd)/nginx/certs:/etc/letsencrypt \
  certbot/certbot certonly --standalone \
  -d ваш-домен.ru \
  --email ваш-email@example.com --agree-tos -n
```

Сертификат окажется в `nginx/certs/live/ваш-домен.ru/{fullchain.pem,privkey.pem}` —
ровно туда, куда смотрит `nginx/nginx.conf`.

**Продление** (сертификат живёт 90 дней) — добавьте в cron на сервере:
```bash
# crontab -e
0 3 * * 1 cd /путь/к/accreditation-portal && docker compose stop nginx && \
  docker run --rm -p 80:80 -v $(pwd)/nginx/certs:/etc/letsencrypt certbot/certbot renew && \
  docker compose start nginx
```

## 4. Подставить домен в nginx.conf

```bash
sed -i 's/DOMAIN/ваш-домен.ru/g' nginx/nginx.conf
```

## 5. Заполнить переменные окружения

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

**`.env`** (корень, для Postgres/MinIO паролей и сборки фронтенда):
```
POSTGRES_PASSWORD=<openssl rand -hex 24>
MINIO_ROOT_PASSWORD=<openssl rand -hex 24>
NEXT_PUBLIC_API_URL=https://ваш-домен.ru:8443
```

**`backend/.env`** — заполните, синхронизировав пароли с `.env` выше:
- `DATABASE_URL` — подставьте туда же `POSTGRES_PASSWORD` из `.env`
- `S3_SECRET_KEY` — подставьте туда же `MINIO_ROOT_PASSWORD` из `.env`
- `JWT_SECRET`, `QR_SIGNING_SECRET` — сгенерируйте: `openssl rand -hex 32` (каждому своё значение)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` — из вашей
  почты на хостинге. Если хостинг выдал порт 465 — поставьте ещё `SMTP_SECURE=true`
  (для 587, самого частого случая, оставьте `SMTP_SECURE=false`)
- `APP_URL=https://ваш-домен.ru:8443`
- `FRONTEND_URL=https://ваш-домен.ru`
- `S3_PUBLIC_ENDPOINT=ваш-домен.ru`, `S3_PUBLIC_PORT=9443`, `S3_PUBLIC_USE_SSL=true`

**`frontend/.env.local`**:
```
NEXT_PUBLIC_API_URL=https://ваш-домен.ru:8443
```

## 6. Собрать и поднять

```bash
docker compose up -d --build
```

Backend сам применит миграции при старте (`prisma migrate deploy` встроен в
Dockerfile `CMD`) — ничего вручную катить не нужно.

## 7. Создать бакет в MinIO

```bash
docker exec -it portal_minio sh -c \
  "mc alias set local http://localhost:9000 portal_minio_admin '<ваш MINIO_ROOT_PASSWORD>' && \
   mc mb local/accreditation-files"
```
(`mc` уже есть внутри образа `minio/minio`.)

## 8. Завести первого администратора

```bash
docker compose exec backend sh -c \
  "SEED_ADMIN_EMAIL=admin@your-domain.example SEED_ADMIN_PASSWORD='change_me' npm run seed"
```
Сразу войдите под ним в `/staff-login` и при желании смените пароль — CRUD
сотрудников пока не реализован, второго сотрудника тем же способом заведёт
только повторный запуск `seed` с другим `SEED_ADMIN_EMAIL` (staff-роль
`admin` можно менять в БД руками через `docker compose exec postgres psql`,
до появления `/admin/staff`).

## 9. Проверка

- `https://ваш-домен.ru` — сайт открывается, лендинг виден
- `https://ваш-домен.ru:8443/api/docs` — Swagger backend'а
- Вход под сотрудником → `/admin` → карточка заявки → фото/документы должны
  открываться (это как раз проверяет, что порт 9443/MinIO настроен верно)
- `/admin/scan` с телефона — браузер должен запросить доступ к камере (просит
  доступ только на https — если молчит и сразу падает, проверьте, что зашли
  именно на https, не http)
- Регистрация нового аккаунта → должно прийти письмо (проверяет SMTP)

## Если что-то не завелось

- **Файлы/фото не грузятся, в консоли браузера 403 на domain:9443** — почти
  всегда рассинхрон `S3_PUBLIC_PORT`/`S3_PUBLIC_USE_SSL` в `backend/.env` с
  реальным портом nginx (9443, `true`). Проверьте оба и `docker compose
  restart backend`.
- **API вообще не отвечает, в консоли браузера CORS-ошибка** — проверьте, что
  `FRONTEND_URL` в `backend/.env` — это именно `https://ваш-домен.ru` без
  порта и без слэша на конце.
- **Чат не подключается по WebSocket** — проверьте в консоли браузера, на
  какой URL идёт запрос `socket.io`; должен быть `wss://ваш-домен.ru:8443/chat`.

## Дальше по плану проекта
Print-pack и CRUD сотрудников — см. `PROJECT_STATUS.md`, раздел «Что осталось».
