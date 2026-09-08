# PROJECT_STATUS.md — Портал аккредитации

> Документ актуален на: 06.08.2026 (обновлён: Фаза 4 завершена целиком — модуль `analytics` с 3 отчётами по ТЗ, мини-страница `/admin/media-organizations`)  
> Назначение: передача контекста другому агенту/разработчику для продолжения работы.  
> Этот файл описывает текущее состояние кода — что реализовано, что нет, и порядок продолжения.

---

## Стек

| Слой | Технология |
|------|-----------|
| Backend | NestJS 10 + TypeScript |
| ORM | Prisma 5 + PostgreSQL 16 |
| Файловое хранилище | MinIO (S3-совместимое, self-hosted) |
| Очереди / email | Redis + BullMQ (пакет `@nestjs/bull`) + Nodemailer |
| QR | `qrcode` (генерация PNG data URL) + HMAC-SHA256 подпись токенов |
| PDF-бейдж | Puppeteer (headless Chromium) |
| WebSocket | Socket.io (`@nestjs/platform-socket.io`) |
| Frontend | Next.js 14 App Router + TypeScript |
| UI | Tailwind CSS 3 + кастомные токены (бежевый/сургучный/navy) |
| Состояние | Zustand + persist |
| Формы | react-hook-form |
| HTTP-клиент | Axios |
| Инфраструктура | Docker Compose, Nginx |

---

## Переменные окружения

### backend/.env (минимальный набор)

```env
DATABASE_URL="postgresql://portal_admin:<ПАРОЛЬ>@localhost:5432/accreditation?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
S3_ENDPOINT=localhost
S3_PORT=9000
S3_USE_SSL=false
S3_ACCESS_KEY=portal_minio_admin
S3_SECRET_KEY=<ПАРОЛЬ>
S3_BUCKET=accreditation-files
# КРИТИЧНО: без этой переменной скачиваемые ссылки ведут на localhost вместо реального IP
S3_PUBLIC_ENDPOINT=<ВНЕШНИЙ_IP_СЕРВЕРА>
S3_PUBLIC_PORT=9000
JWT_SECRET=<hex 64 символа>
JWT_EXPIRES_IN=7d
QR_SIGNING_SECRET=<hex 64 символа>
SMTP_HOST=localhost
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM="Портал аккредитации <noreply@example.com>"
APP_PORT=3001
APP_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

**Заметка**: когда backend запускается не в Docker-контейнере (разработка через `npm run start:dev`), хосты должны быть `localhost`. При полном `docker-compose up --build` — имена сервисов (`postgres`, `redis`, `minio`), кроме `S3_PUBLIC_ENDPOINT` — он всегда внешний IP.

### frontend/.env.local

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Запуск на сервере (быстрый старт)

```bash
# 1. Инфраструктура
cd /home/mid/project
docker compose up -d postgres redis minio

# 2. Backend
cd backend
npm install
npx prisma migrate dev --name init   # только первый раз
npx prisma generate
npx prisma db seed                    # создаёт страны + admin@mfa.gov
npm run start:dev

# 3. Frontend (отдельный терминал)
cd ../frontend
npm install
npm run dev
```

**Доступ:**
- Личный кабинет заявителя: `http://<IP>:3000`
- Панель администрации: `http://<IP>:3000/admin/login`
- Swagger API: `http://<IP>:3001/api/docs`
- MinIO консоль: `http://<IP>:9001`

**Дефолтный аккаунт сотрудника** (после сида): `admin@mfa.gov` / `ChangeMe123!`

**Dev-подсказка**: при регистрации заявителя ссылка подтверждения email печатается прямо в консоли backend (если `NODE_ENV != production`).

---

## Структура файлов проекта

```
accreditation-portal/
├── docker-compose.yml               # Postgres, Redis, MinIO, backend, frontend, Nginx
├── nginx/
│   └── nginx.conf                   # reverse proxy: / → frontend:3000, /api/ → backend:3001
├── docs/
│   └── schema.mermaid               # ER-диаграмма БД (Mermaid, открывается в VS Code/GitHub)
│
├── backend/
│   ├── .env.example                 # шаблон переменных окружения
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma            # вся схема БД
│   │   └── seed.ts                  # сид: 20 стран + первый admin-пользователь
│   └── src/
│       ├── main.ts                  # точка входа, BigInt.toJSON патч, Swagger, CORS
│       ├── app.module.ts            # подключение всех модулей
│       ├── prisma/
│       │   ├── prisma.service.ts
│       │   └── prisma.module.ts     # @Global()
│       ├── common/
│       │   ├── decorators/
│       │   │   ├── current-user.decorator.ts   # @CurrentUser() → req.user
│       │   │   └── roles.decorator.ts          # @Roles('admin', 'mfa_officer')
│       │   ├── guards/
│       │   │   ├── jwt-auth.guard.ts           # проверяет токен заявителя
│       │   │   ├── jwt-staff-auth.guard.ts     # проверяет токен сотрудника
│       │   │   ├── jwt-either-auth.guard.ts    # принимает любой из двух токенов
│       │   │   └── roles.guard.ts              # проверяет роль из @Roles()
│       │   ├── strategies/
│       │   │   ├── jwt.strategy.ts             # passport-jwt для заявителей
│       │   │   └── jwt-staff.strategy.ts       # passport-jwt для сотрудников (type:'staff')
│       │   ├── storage/
│       │   │   ├── storage.service.ts          # MinIO: upload, getSignedUrl, delete
│       │   │   └── storage.module.ts           # @Global()
│       │   └── qr/
│       │       ├── qr-signer.service.ts        # HMAC-SHA256 подпись/проверка QR-токенов
│       │       └── qr-signer.module.ts         # @Global()
│       └── modules/
│           ├── auth/                # регистрация заявителя, verify-email, login → JWT
│           ├── staff/               # login сотрудника → JWT со staff-ролью
│           ├── applications/        # CRUD заявок, submit с валидацией, staff/all
│           ├── applicants/          # CRUD анкет, мягкая идентификация по Person
│           ├── documents/           # upload → MinIO, список (staff+user), delete
│           ├── status/              # смена статуса анкеты, история, пересчёт заявки
│           ├── cards/               # генерация аккред. карты + PDF-бейдж при approved
│           ├── chat/                # REST + WebSocket-gateway (/chat namespace)
│           ├── equipment/           # список техники, групповой QR
│           ├── qr/                  # сканирование карт и техники, лог QrScan
│           ├── notifications/       # Bull-очередь → Nodemailer → лог Notification
│           ├── reference/           # GET /countries, GET/POST /media-organizations
│           ├── materials/           # ✅ реализован — ссылки + PDF по итогам поездки
│           ├── analytics/           # ✅ реализован — 3 отчёта по ТЗ п.6
│           └── print-pack/          # merge документов+бейджей заявки в один PDF (pdf-lib)
│
│       # staff/ дополнительно содержит staff-users.controller.ts + staff-users.service.ts —
│       # CRUD сотрудников (роль admin), отдельно от staff-auth.*
└── frontend/
    ├── package.json
    ├── next.config.js
    ├── tsconfig.json                # алиас @/* → ./src/*
    ├── tailwind.config.js           # кастомные токены с RGB-переменными (paper, seal, primary…)
    ├── postcss.config.js
    └── src/
        ├── app/
        │   ├── layout.tsx           # шрифты (Inter, Source Serif 4, IBM Plex Mono), globals
        │   ├── globals.css          # CSS-переменные --*-rgb, .stamp, .paper-card
        │   ├── page.tsx             # редирект /login или /dashboard
        │   ├── login/page.tsx       # вход заявителя
        │   ├── register/page.tsx    # регистрация заявителя
        │   ├── verify-email/page.tsx# подтверждение email по ссылке → JWT → /dashboard
        │   ├── dashboard/
        │   │   ├── page.tsx         # список заявок заявителя
        │   │   └── [id]/
        │   │       ├── page.tsx     # заявка: участники, техника, чат, submit
        │   │       └── applicants/[applicantId]/page.tsx  # анкета + документы + карта
        │   └── admin/
        │       ├── login/page.tsx   # вход сотрудника администрации
        │       ├── applications/
        │       │   ├── page.tsx     # список заявок: 4 вкладки (Новая/Проверка/Одобрено/Отказ)
        │       │   └── [id]/page.tsx# карточка заявки: анкеты + техника + чат + печать пакета
        │       ├── staff/page.tsx   # CRUD сотрудников (только роль admin)
        │       └── scan/page.tsx    # ⚠️ сканер QR камерой (требует HTTPS для камеры на телефоне)
        ├── store/
        │   ├── auth.ts              # zustand + persist: токен заявителя
        │   └── staffAuth.ts         # zustand + persist: токен сотрудника, role, hasRole()
        ├── lib/
        │   ├── api.ts               # axios с токеном заявителя, apiErrorMessage()
        │   ├── staffApi.ts          # axios с токеном сотрудника
        │   ├── types.ts             # все TypeScript-типы + лейблы + STAFF_APPLICATION_TABS
        │   ├── useRequireAuth.ts    # guard для страниц заявителя
        │   └── useRequireStaffAuth.ts # guard для страниц сотрудника (с проверкой ролей)
        └── components/
            ├── ui.tsx               # Card, Button, Field, Input, Textarea, Select, Checkbox, Alert
            ├── DashboardShell.tsx   # layout для заявителя (бежевый, сургучный акцент)
            ├── AdminShell.tsx       # layout для сотрудника (navy шапка, nav: Заявки / Сканер QR)
            ├── StatusStamp.tsx      # круглая «печать» со статусом (-3deg поворот)
            ├── ApplicantForm.tsx    # все поля анкеты (RHF + Controller для select'ов), live-валидация дат
            ├── PhotoUpload.tsx      # загрузка фото журналиста (используется в ApplicantForm)
            ├── DocumentsPanel.tsx   # загрузка/список/удаление/просмотр документов (заявитель)
            ├── DocumentPreviewModal.tsx # inline-просмотр документа (img/iframe) поверх страницы
            ├── QrCodeImage.tsx      # рендер QR из токена/URL (qrcode.react)
            ├── EquipmentPanel.tsx   # таблица техники + кнопка «Сгенерировать QR» + QrCodeImage
            ├── ChatPanel.tsx        # чат заявителя (REST + Socket.io)
            ├── MediaOrgSelect.tsx   # выбор организации с кнопкой «+ Новая организация»
            ├── CountrySelect.tsx    # выбор страны из справочника
            ├── ApplicantReviewPanel.tsx # данные анкеты + документы + история журналиста + история рассмотрения + кнопки решения
            ├── RejectModal.tsx      # модалка с обязательным internalComment при отказе
            ├── StaffDocumentsList.tsx   # read-only список документов (сотрудник) + просмотр
            └── StaffChatPanel.tsx   # чат сотрудника (REST + Socket.io, staff-токен)
```

---

## Реализованные API эндпоинты

### Заявитель
| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/auth/register` | Регистрация → письмо с подтверждением |
| POST | `/auth/verify-email?token=` | Подтверждение → JWT |
| POST | `/auth/login` | Вход → JWT |
| POST | `/applications` | Создать черновик заявки |
| GET | `/applications` | Список своих заявок |
| GET | `/applications/:id` | Заявка с анкетами (JwtEitherAuthGuard) |
| POST | `/applications/:id/submit` | Отправить на рассмотрение (валидация полей+дат) |
| POST | `/applications/:id/applicants` | Добавить анкету |
| GET | `/applications/:id/applicants` | Список анкет |
| PATCH | `/applicants/:id` | Обновить анкету |
| DELETE | `/applicants/:id` | Удалить анкету (только черновик) |
| POST | `/applicants/:id/documents` | Загрузить документ в MinIO |
| GET | `/applicants/:id/documents` | Список документов (JwtEitherAuthGuard) |
| DELETE | `/documents/:id` | Удалить документ (только черновик) |
| GET | `/applicants/:id/card` | Получить карту + downloadUrl (JwtEitherAuthGuard) |
| POST | `/applications/:id/equipment` | Добавить технику (массивом) |
| GET | `/applications/:id/equipment` | Список техники |
| POST | `/applications/:id/equipment/qr` | Сгенерировать QR для техники |
| DELETE | `/equipment-items/:id` | Удалить позицию техники |
| GET | `/applications/:id/chat` | История чата |
| POST | `/applications/:id/chat` | Отправить сообщение |
| GET | `/countries` | Справочник стран (публичный) |
| GET | `/media-organizations?search=` | Справочник организаций (публичный) |
| POST | `/media-organizations` | Добавить организацию (авторизованный заявитель) |
| GET | `/qr/verify?token=` | **Публичная** проверка QR — без авторизации, для сканирования сторонней камерой |

### Сотрудник администрации
| Метод | Путь | Роли |
|-------|------|------|
| POST | `/auth/staff/login` | — |
| GET | `/applications/staff/all?status=` | все |
| PATCH | `/applicants/:id/status` | mfa_officer, admin |
| GET | `/applicants/:id/status-history` | mfa_officer, admin |
| POST | `/applicants/:id/card` | mfa_officer, admin (перегенерация) |
| POST | `/qr/scan` | checkpoint, customs, admin |
| GET | `/qr/history` | checkpoint, customs, admin, mfa_officer |
| GET | `/applicants/:id/person-history` | mfa_officer, admin |
| POST | `/applications/:id/print-pack` | mfa_officer, admin |
| GET | `/staff` | admin |
| POST | `/staff` | admin |
| PATCH | `/staff/:id` | admin |

---

## Схема БД (сущности)

| Таблица | Назначение |
|---------|-----------|
| `users` | Заявители (регистрация через email) |
| `staff_users` | Сотрудники администрации (roles: mfa_officer/checkpoint/customs/admin) |
| `persons` | «Мягкая» идентичность журналиста для распознавания повторных заявок |
| `countries` | Справочник стран (заполняется сидом) |
| `media_organizations` | Справочник организаций (+ `media_type`: television/print/radio/other — миграция `20260806103000_add_media_type`, nullable, для старых записей не заполнен) |
| `applications` | Групповая заявка (1 заявитель → много участников) |
| `applicants` | Анкета участника со всеми полями из ТЗ |
| `documents` | Документы анкеты (путь в MinIO) |
| `status_history` | Лог смен статуса анкеты (кто, когда, комментарий) |
| `accreditation_cards` | Карта аккредитации (QR-токен, PDF в MinIO) |
| `equipment_lists` | Список техники группы (один на заявку) |
| `equipment_items` | Позиции техники |
| `chat_messages` | Переписка заявителя и администрации внутри заявки |
| `qr_scans` | Лог сканирований QR на КПП/таможне |
| `materials` | Материалы после поездки (✅ модуль реализован) |
| `notifications` | Лог отправленных писем + статус (queued/sent/failed) |
| `audit_logs` | Журнал действий сотрудников (❌ таблица есть, не используется) |

---

## Статус реализации

### ✅ Полностью готово

**Backend:**
- Регистрация, подтверждение email, вход заявителя (JWT)
- Вход сотрудника администрации (JWT со staff-ролью, `type: 'staff'` в payload)
- Создание групповых заявок, добавление/удаление анкет
- Все поля анкеты из ТЗ (паспорт, виза, пресс-карта, даты поездки, организация, гражданство…)
- Валидация просрочки документов при `/submit` с перечнем конкретных ошибок
- Блокировка редактирования после submit
- Загрузка документов в MinIO (PDF/JPG/PNG, до 15 МБ)
- Раздельный доступ: загрузка/удаление — только заявитель, просмотр — и сотрудник тоже
- Смена статуса анкеты сотрудником, обязательный `internalComment` при отказе
- Автоматический пересчёт агрегированного статуса заявки от статусов анкет (атомарная транзакция)
- Генерация аккредитационной карты при переводе анкеты в `approved`:
  - уникальный номер `ACC-YYYY-NNNN`
  - подписанный HMAC-QR-токен со сроком действия = tripEnd
  - PDF-бейдж через Puppeteer (ФИО, организация, номер, даты, QR)
  - сохранение в MinIO
- Проверка QR на КПП/таможне: valid/expired/not_approved + лог QrScan
- Поддержка QR для списка техники группы (EquipmentList)
- Чат заявитель↔администрация: REST + WebSocket (Socket.io, namespace `/chat`)
- Email-уведомления при регистрации, submit, смене статуса (асинхронная очередь Bull)
- Справочники: `/countries` (20 стран в сиде), `/media-organizations` с поиском и созданием
- «Мягкая» идентификация журналиста по Person (ФИО+паспорт) при повторных заявках
- Публичные `downloadUrl` для MinIO с правильным хостом (S3_PUBLIC_ENDPOINT)
- Корректный `Content-Type` при загрузке в MinIO (`putObject` с `mimetype`) — документы/фото/бейджи открываются inline (img/iframe), а не только скачиваются
- Загрузка фото журналиста: `POST /applicants/:id/photo`, используется в `CardsService.renderBadgePdf`
- Публичная верификация QR: `GET /qr/verify?token=` (без авторизации, для сторонних камер) + карта кодирует URL вида `.../verify?token=...`, а не голый токен
- История журналиста: `GET /applicants/:id/person-history` (staff, `mfa_officer`/`admin`) — прошлые анкеты того же `Person`, статус и последний комментарий к отказу
- Print-pack: `POST /applications/:id/print-pack` — склеивает документы+бейджи всех анкет заявки в один PDF через `pdf-lib`, возвращает подписанную ссылку на час
- CRUD сотрудников: `GET/POST /staff`, `PATCH /staff/:id` (роль `admin`); раньше сотрудника можно было завести только через `prisma db seed`
- Уведомление заявителю в чате при новом сообщении от staff (`ChatService` → `NotificationsService`)
- Пересчёт статуса заявки на `in_review` при первом решении по любой анкете — покрыто общей логикой `recomputeApplicationStatus`, отдельный код не понадобился

**Frontend:**
- Дизайн-система: бежевый фон (#F7F5F0), сургучный акцент (#B23A2F), navy для админки (#1B3A5C), шрифты Source Serif 4 + Inter + IBM Plex Mono, фирменная «печать» статуса
- Все Tailwind-токены корректно настроены с RGB-переменными (поддержка /5, /40 прозрачности)
- Страницы заявителя: `/login`, `/register`, `/verify-email`, `/dashboard`, `/dashboard/[id]`, `/dashboard/[id]/applicants/[id]`
- Форма анкеты: все поля, условные блоки (виза/безвиз, пресс-карта), санитайзинг пустых строк
- Загрузка документов с выбором типа
- Добавление техники + генерация QR
- Чат с реалтаймом через Socket.io
- Страницы сотрудника: `/admin/login`, `/admin/applications` (4 вкладки), `/admin/applications/[id]`, `/admin/analytics`, `/admin/media-organizations`
- Рассмотрение анкеты: данные, предупреждения о просрочке, документы, история, кнопки
- Модалка отказа с обязательным комментарием
- Страница сканирования QR: камера + ручной ввод, зелёный/красный экран
- Раздельные store/api-клиенты для заявителя и сотрудника
- Landing-страница `/` с текстом ТЗ и кнопками «Подать заявку» / «Войти»
- Памятка журналиста `/dashboard/info` (контакты пока плейсхолдеры — см. ограничения ниже)
- `PhotoUpload.tsx` — загрузка фото в `ApplicantForm`
- `QrCodeImage.tsx` (`qrcode.react`) — QR техники в `EquipmentPanel`, а не голый токен
- `DocumentPreviewModal.tsx` — inline-просмотр документов в `DocumentsPanel`/`StaffDocumentsList` (img/iframe); работает после фикса `Content-Type` в `StorageService`
- Live-валидация просрочки дат в `ApplicantForm` (красная рамка + текст под полем)
- Страница `/verify/[token]` — публичный результат сканирования QR
- `/admin/staff` — список сотрудников, создание, смена роли, деактивация (только для роли `admin`, пункт «Сотрудники» в меню виден только ей)
- Блок «История журналиста» в `ApplicantReviewPanel` — прошлые обращения того же человека
- Кнопка «Отправить всё на печать» на `/admin/applications/[id]` — открывает готовый PDF
- `MaterialsPanel.tsx` — вкладка «Материалы по итогам поездки» на странице анкеты заявителя, видна только когда `applicant.status === 'approved'`: форма добавления ссылки, загрузка PDF, список с удалением, предупреждающий текст из ТЗ (п.5)

**MediaType (Фаза 4, часть 2):**
- Миграция `20260806103000_add_media_type`: enum `MediaType` (`television`/`print`/`radio`/`other`) + nullable-колонка `media_type` в `media_organizations`. Backfill не делался — у организаций, добавленных до миграции, поле пустое.
- `POST /media-organizations` теперь принимает необязательный `mediaType`; если организация с таким названием уже существует и у неё `mediaType` не задан — дозаполняется тем значением, что пришло в запросе (без дублей)
- Новый эндпоинт `PATCH /media-organizations/:id` `{ mediaType }` — для сотрудника администрации (любая роль, `JwtStaffAuthGuard`), чтобы проставить/поменять тип организации вручную; UI теперь есть — `/admin/media-organizations`
- Фронт: `MediaOrgSelect.tsx` — при создании новой организации заявитель теперь выбирает тип из выпадающего списка (по умолчанию «Другое»); `MediaType`/`MEDIA_TYPE_LABELS` в `lib/types.ts`

**Analytics (Фаза 4, часть 3):**
- Backend-модуль `analytics` реализован полностью (был заглушкой): `AnalyticsService`, `AnalyticsController`, доступ — любой авторизованный сотрудник администрации (`JwtStaffAuthGuard`, без ограничения по роли)
- `GET /analytics/currently-in-country` — одобренные анкеты, у которых `tripStart <= now <= tripEnd`. Анкеты без дат поездки в отчёт не попадают (иначе непонятно, в стране человек или нет)
- `GET /analytics/media-type-breakdown` — count + процент по `television`/`print`/`radio`/`other` среди одобренных анкет, считается по `applicant.media.mediaType`; отдельный бакет `unspecified` для анкет без организации или с организацией без проставленного типа — сделано намеренно, чтобы не искажать проценты по трём ТЗ-категориям молча
- `GET /analytics/materials-by-month` — материалы, сгруппированные по `YYYY-MM` месяца загрузки (последние месяцы первыми); для `type=url` ссылка — сам url, для `type=pdf` — подписанная ссылка на час через `StorageService.getSignedUrl` (дольше, чем стандартные 15 минут у документов — отчёт может быть открыт подолгу)
- Фронт: `/admin/analytics` — три карточки (список в стране, полоски-прогресс-бары по типам организаций, список материалов по месяцам со ссылкой «открыть»)
- Пункты «Аналитика» и «Организации» добавлены в навигацию `AdminShell.tsx`, видны всем ролям сотрудников

**Media Organizations UI:**
- `/admin/media-organizations` — список организаций с поиском по названию (использует существующий `GET /media-organizations?search=`, лимит 50 без пагинации — при большом справочнике стоит добавить pagination) и выпадающим списком для проставления `mediaType` через `PATCH /media-organizations/:id`

**Materials (Фаза 4, часть 1):**
- Backend-модуль `materials` реализован полностью (был заглушкой): `MaterialsService`, `MaterialsController`, `dto/create-material.dto.ts`
- `POST /applicants/:applicantId/materials` `{ url }` — добавить ссылку на опубликованный материал
- `POST /applicants/:applicantId/materials/upload` (multipart, поле `file`) — загрузить PDF-отчёт, до 15 МБ, только `application/pdf`
- `GET /applicants/:applicantId/materials` — список материалов анкеты (заявитель — свои, любой сотрудник администрации — любые, через `JwtEitherAuthGuard`)
- `DELETE /materials/:id` — удаление, только сам заявитель
- Загрузка/добавление разрешены только когда `applicant.status === 'approved'` (проверяется на бэке в `assertOwnershipAndEligibility`, не только на фронте) — материалы осмысленны только после того, как поездка состоялась
- PDF хранится в MinIO по тому же паттерну, что и документы анкеты (`StorageService.upload` с `mimetype`, путь `materials/{applicantId}/...`), ссылка отдаётся через `getSignedUrl`
- Фронт: `Material`/`MaterialType` в `lib/types.ts`, `MaterialsPanel.tsx`, подключена в `app/dashboard/[id]/applicants/[applicantId]/page.tsx`

---

### ⚠️ Частично готово / требует доработки

| Что | Статус | Что нужно сделать |
|-----|--------|-------------------|
| Тексты писем | Есть, но не дословно по ТЗ | Создать `notification-templates.ts` с текстами из ТЗ вместо построения строк inline в `status.service.ts`/`applications.service.ts` |
| Авто-QR техники при одобрении | Нет | В `StatusService.changeApplicantStatus` при approved вызвать `EquipmentService.generateQr`, если все анкеты одобрены |
| Сканер QR на телефоне | Требует HTTPS | Настроить Nginx + Let's Encrypt (конфиг Nginx уже есть в `nginx/`, папка `nginx/certs/` пустая) |
| Памятка журналиста | Страница есть, контакты — плейсхолдеры | Заменить `MFA_PHONE`/`MFA_EMAIL` в `frontend/src/app/dashboard/info/page.tsx` на реальные перед прод-релизом |

---

### ❌ Не реализовано

| Что | Где сделать | Примечания |
|-----|------------|-----------|
| Audit log | Schema `AuditLog` есть в БД, в коде нигде не используется (проверено — ни один модуль его не пишет) | Добавить вызовы в `StatusService`, `DocumentsService`, `StaffUsersService` при важных действиях staff |
| HTTPS / Nginx для prod | `nginx/nginx.conf` заготовлен, `nginx/certs/` пустая | Нужен TLS-сертификат (Let's Encrypt / свой CA) для работы камеры на телефоне на КПП |
| E2E тесты | Нет вообще | Cypress или Playwright; критические сценарии: регистрация → submit → одобрение → QR scan |

---

## Важные технические детали для нового агента

### JWT-токены: заявитель vs сотрудник

Оба типа используют один `JWT_SECRET`, но различаются payload:
- Заявитель: `{ sub: userId, email }` — обрабатывается стратегией `jwt`
- Сотрудник: `{ sub: staffId, email, role, type: 'staff' }` — стратегия `jwt-staff` проверяет наличие `type === 'staff'`

Это важно: обе стратегии при провале возвращают `null` (не `throw`), чтобы `JwtEitherAuthGuard` мог перебрать обе. Если вернуть `throw` — цепочка стратегий ломается.

### QR-подпись

Токены в `qrToken` — HMAC-SHA256, формат `base64url(payload).base64url(signature)`. Используется `timingSafeEqual` для защиты от timing-атак. Payload содержит `{ entity, id, exp }`. Никогда не раскрывать детали ошибки при неверном токене.

### BigInt в JSON

`document.fileSize` хранится как Prisma `BigInt`. Глобальный патч в `main.ts` (`BigInt.prototype.toJSON = function() { return this.toString() }`) решает проблему сериализации. Везде, где читаете `fileSize` на фронте — он придёт как строка.

### StorageService: два MinIO-клиента

- `client` — для upload/delete, обращается по `S3_ENDPOINT` (может быть `localhost` или `minio`)
- `publicClient` — только для `getSignedUrl`, использует `S3_PUBLIC_ENDPOINT` (внешний IP, чтобы браузер пользователя смог открыть ссылку)

### Tailwind кастомные токены

Все кастомные цвета определены через `rgb(var(--*-rgb) / <alpha-value>)` — это единственный способ, при котором работают модификаторы прозрачности (`bg-seal/10`, `ring-primary/40` и т.д.). CSS-переменные `--*-rgb` объявлены в `globals.css` как RGB-триплеты без `rgb()`.

### Prisma seed

При первом запуске и при повторных `npx prisma db seed`:
1. Наполняет таблицу `countries` (20 записей, upsert → идемпотентен)
2. Создаёт `admin@mfa.gov` / `ChangeMe123!` (пропускает, если уже существует)

### Camera и HTTPS

`html5-qrcode` использует `getUserMedia`. Браузеры разрешают доступ к камере только на `https://` или `localhost`. Для `/admin/scan` с телефона на КПП нужен HTTPS — настроить через Nginx + Certbot. Конфиг Nginx уже есть в `nginx/nginx.conf`, папка `nginx/certs/` для сертификатов существует.

### Content-Type в MinIO

`StorageService.upload()` принимает `mimetype` третьим/четвёртым аргументом обязательным параметром и передаёт его в `putObject` как `Content-Type`. Без этого MinIO хранит объект как `application/octet-stream`, и presigned-ссылка отдаёт браузеру этот же заголовок — тогда `<iframe>`/`<img>` не показывают файл inline, а всегда предлагают скачать (сам `getSignedUrl`/скачивание при этом продолжает работать, поэтому баг долго не бросался в глаза). Все три вызывающих места (`documents.service.ts`, `applicants.service.ts` для фото, `cards.service.ts` для бейджа) прокидывают mimetype. **Важно:** фикс чинит только новые загрузки — объекты, залитые в MinIO до фикса, остались с `application/octet-stream`; для их массового исправления нужен отдельный скрипт (`stat` + `copyObject` с новым `Content-Type` по каждому объекту), в проекте его пока нет.

### Print-pack

Новый модуль `modules/print-pack`. `PrintPackService.generate()` проходит по всем анкетам заявки в порядке добавления, для каждой скачивает через `StorageService.download()` все документы + бейдж (если есть) и склеивает их в один `PDFDocument` (`pdf-lib`): PDF-страницы копируются как есть (`copyPages`), JPG/PNG вписываются в лист A4 по центру с сохранением пропорций (`embedJpg`/`embedPng` + `drawImage`). Файлы, которые не удалось скачать или распознать, пропускаются без падения всего пакета (лог в консоль). Итоговый PDF заливается в `print-packs/{applicationId}/` и отдаётся подписанной ссылкой на час (обычные документы — на 15 минут, тут дольше, чтобы сотрудник успел открыть/распечатать).

### CRUD сотрудников

`StaffUsersController`/`StaffUsersService` в модуле `staff` (рядом с `StaffAuthController`, но отдельный контроллер). Все три эндпоинта закрыты `@Roles('admin')`. При создании пароль хешируется `bcrypt` (10 раундов, как в `staff-auth.service.ts`). `PATCH /staff/:id` не даёт администратору деактивировать самого себя (`id === currentStaffId && dto.active === false` → 400) — иначе можно случайно потерять доступ к управлению сотрудниками из своего же аккаунта.

---

## Порядок следующих задач (рекомендуемый)

### ✅ Фаза 1 — ЛК заявителя — завершена
### ✅ Фаза 2 — Админка — завершена
### ✅ Фаза 3 — QR и карты — завершена (кроме HTTPS, см. ниже)

### ✅ Фаза 4 — Аналитика и материалы — завершена
1. ✅ Модуль `materials`: загрузка ссылок/PDF после поездки
2. ✅ `mediaType` enum в схеме Prisma + миграция
3. ✅ Модуль `analytics`: 3 отчёта из ТЗ
4. ✅ Мини-страница `/admin/media-organizations` для проставления типа организации вручную

### Фаза 5 — Хвосты перед продом
4. HTTPS через Nginx + Let's Encrypt → камера на телефоне на КПП заработает
5. Тексты писем — перенести в `notification-templates.ts` дословно по ТЗ
6. Авто-QR техники при одобрении — в `StatusService.changeApplicantStatus` вызвать `EquipmentService.generateQr`, если все анкеты одобрены
7. Реальные контакты в памятке журналиста (`dashboard/info/page.tsx`)
8. Аудит-лог: писать в `audit_logs` при важных действиях staff
9. E2E тесты (Cypress/Playwright): регистрация → submit → одобрение → QR scan
10. (опционально) скрипт для проставления правильного `Content-Type` на уже загруженных в MinIO файлах — фикс из Фазы 3 чинит только новые загрузки

---

## Текущие известные ограничения

1. **SMTP не настроен** — письма ставятся в очередь Bull, пытаются отправиться и ложатся в `notifications` со статусом `failed`. Dev-режим: ссылка подтверждения печатается в консоль backend.
2. **Сканер QR работает только через HTTPS** — для разработки используйте поле ручного ввода на `/admin/scan`.
3. **Backend запущен на хосте, не в Docker** — при переходе на полный `docker-compose up --build` нужно переключить хосты в `.env` с `localhost` на имена сервисов (`postgres`, `redis`, `minio`), кроме `S3_PUBLIC_ENDPOINT`.
4. **Puppeteer требует системных библиотек Chromium** — при свежей установке нужен `apt install libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64 libgbm1 libnss3 libxss1 libpangocairo-1.0-0 libasound2t64`.
5. **Файлы, загруженные в MinIO до фикса Content-Type, останутся некликабельными inline** — только скачивание. Новые загрузки уже открываются в превью корректно.
6. **В системе должен быть хотя бы один активный `admin`** — `PATCH /staff/:id` не даёт администратору деактивировать самого себя, но если единственный admin-аккаунт будет удалён напрямую из БД, CRUD сотрудников станет недоступен (нужен доступ к БД, чтобы восстановить).
7. **Нужен `npm install` в backend после этого обновления** — добавлена зависимость `pdf-lib` (для print-pack).
8. **Миграция `20260806103000_add_media_type` написана вручную, а не через `prisma migrate dev`** (в этом окружении нет доступа к БД) — SQL проверен по образцу существующих миграций, но перед деплоем нужно прогнать `npx prisma migrate deploy` (или `migrate dev`, если это ещё локальная разработка) и обязательно `npx prisma generate`, иначе `PrismaClient` не будет знать про новое поле `mediaType`, и код из этого обновления не скомпилируется.
