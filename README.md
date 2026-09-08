# 🛂 Портал аккредитации

**Полнофункциональный портал электронной аккредитации** — регистрация заявителей, подача
групповых заявок, проверка документов, чат с администрацией, генерация именной
аккредитационной карты с QR-кодом и её верификация на пунктах пропуска.

[![CI](https://img.shields.io/badge/CI-GitHub%20Actions-2ea44f?logo=githubactions&logoColor=white)](.github/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-informational)

> 📄 Подробный технический статус (что реализовано, что нет, схема БД, API) — [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md).
> 🚀 Гайд по развёртыванию на VPS с HTTPS — [`docs/DEPLOY.md`](docs/DEPLOY.md).
> Этот README — обзор и быстрый старт.

## Содержание

- [Возможности](#возможности)
- [Стек](#стек)
- [Структура репозитория](#структура-репозитория)
- [Запуск на своём сервере](#запуск-на-своём-сервере-с-нуля)
- [Реализованные модули](#реализованные-модули)
- [Лицензия](#лицензия)

## Возможности

- 📝 Личный кабинет заявителя: регистрация, подтверждение почты, групповые заявки с несколькими участниками
- 📎 Загрузка документов (паспорт, виза, приглашение и т.д.) в S3-совместимое хранилище
- 💬 Чат заявитель ↔ администрация внутри заявки (REST + WebSocket)
- ✅ Рассмотрение заявок сотрудниками: смена статуса, обязательный комментарий при отказе, история решений
- 🪪 Именная аккредитационная карта с QR-кодом (PDF, генерация через Puppeteer)
- 📷 Верификация QR на пунктах пропуска / таможне — отдельный сканер с логом сканирований
- 🎒 Декларирование группового оборудования с отдельным техническим QR
- 📊 Аналитика: количество аккредитованных, разбивка по типам организаций, материалы по месяцам
- 🔐 Раздельная аутентификация заявителей и сотрудников (роли: администратор/КПП/таможня/сотрудник по аккредитации)

## Стек

- Backend: NestJS + Prisma + PostgreSQL
- Очереди/уведомления: Redis + BullMQ
- Файлы: MinIO (S3-совместимое хранилище)
- Frontend: Next.js
- Reverse proxy: Nginx

## Структура репозитория

```
accreditation-portal/
├── backend/          # NestJS API
│   ├── prisma/schema.prisma   # схема БД (см. docs/schema.mermaid)
│   └── src/modules/           # по одному модулю на сущность из ТЗ
├── frontend/         # Next.js (публичная часть + ЛК + админка)
├── nginx/            # reverse proxy конфиг
├── docs/schema.mermaid        # ER-диаграмма
└── docker-compose.yml
```

## Запуск на своём сервере (с нуля)

Предполагается Ubuntu Server 22.04+ с установленным Docker и Docker Compose.

### 1. Клонировать репозиторий и настроить переменные окружения

```bash
git clone <ваш-репозиторий> accreditation-portal
cd accreditation-portal

cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

Откройте `backend/.env` и **обязательно замените**:
- `change_me_in_env` — пароли Postgres/MinIO
- `JWT_SECRET`, `QR_SIGNING_SECRET` — сгенерируйте случайные строки:
  ```bash
  openssl rand -hex 32
  ```
- SMTP-реквизиты вашего почтового сервера

Синхронизируйте пароли Postgres/MinIO между `docker-compose.yml` и `backend/.env` (в проде вынесите их тоже в `.env` через `env_file` в compose).

### 2. Установить зависимости (нужен интернет на сервере)

```bash
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### 3. Поднять инфраструктуру

```bash
docker compose up -d postgres redis minio
```

### 4. Накатить схему БД

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
cd ..
```

### 5. Создать бакет в MinIO

Зайдите на `http://<сервер>:9001` (логин/пароль из `.env`), создайте бакет `accreditation-files` — или через `mc` CLI.

### 6. Запустить всё вместе

```bash
docker compose up -d --build
```

Проверка:
- Frontend: `http://<сервер>` (через nginx) или `http://<сервер>:3000` напрямую
- Backend Swagger-документация API: `http://<сервер>:3001/api/docs`
- MinIO консоль: `http://<сервер>:9001`

### 7. Разработка (hot-reload)

```bash
cd backend && npm run start:dev
cd frontend && npm run dev
```

## Реализованные модули

Полный статус по каждому модулю, схема БД и список эндпоинтов — [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md).
Коротко, backend разбит на модули по одному на сущность (`src/modules/*`), все — реализованы:

| Модуль | Что делает |
|---|---|
| `auth` / `staff` | регистрация → письмо с подтверждением → активация ЛК; раздельный вход заявителя и сотрудника по JWT |
| `applications` / `applicants` | групповая заявка, анкета на каждого участника, проверка обязательных полей и сроков документов |
| `documents` | загрузка файлов в MinIO, привязка типа документа к анкете |
| `status` | смена статуса анкеты/заявки, обязательный внутренний комментарий при отказе, агрегированный статус заявки, официальное письмо об отказе |
| `chat` | чат заявитель ↔ администрация внутри заявки, REST + WebSocket |
| `cards` | генерация именной аккредитационной карты с QR (PDF, Puppeteer) при статусе «Одобрено» |
| `equipment` | список техники группы + групповой технический QR |
| `materials` | прикрепление ссылок/PDF с материалами после поездки |
| `qr` | верификация QR на КПП/таможне (зелёный/красный экран), лог сканирований |
| `analytics` | сводка по аккредитованным, разбивка по типам организаций, материалы по месяцам |
| `reference` | справочники стран и организаций (с автодобавлением из формы) |
| `notifications` / `notifications-inbox` | асинхронная отправка писем через очередь (BullMQ) + уведомления в личном кабинете |

## Лицензия

Проект распространяется под лицензией [MIT](LICENSE).

## Контрибьютинг

Правила по работе с репозиторием, соглашения по коммитам и структуре кода — см. [`CONTRIBUTING.md`](CONTRIBUTING.md).
