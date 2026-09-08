# Contributing / Разработка

## Быстрый старт

См. [README.md](README.md) для локального запуска и [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md)
для полного технического статуса проекта, а [docs/DEPLOY.md](docs/DEPLOY.md) — для развёртывания на VPS.

## Соглашения

- **Ветки**: `feature/<короткое-имя>`, `fix/<короткое-имя>`, `chore/<короткое-имя>`.
- **Коммиты**: желательно в духе [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat: ...`, `fix: ...`, `chore: ...`, `docs: ...`) — упрощает чтение истории и генерацию changelog.
- **Backend**: модуль = `module/*.controller.ts` + `*.service.ts` + `*.module.ts` (+ `dto/` при необходимости),
  по образцу уже готовых модулей `applications`, `applicants`, `status`, `cards`.
- **Frontend**: страницы — App Router (`src/app/**/page.tsx`), общие компоненты — `src/components/`,
  запросы к API — через `src/lib/api.ts`, не напрямую `fetch` из компонентов.
- **Роли/доступ**: любой защищённый эндпоинт сотрудника — `@UseGuards(JwtStaffAuthGuard)` (+ проверка роли
  внутри сервиса при необходимости); эндпоинты, доступные и заявителю, и сотруднику — `JwtEitherAuthGuard`.

## Перед PR

```bash
# backend
cd backend && npm run lint && npm run build

# frontend
cd frontend && npm run lint && npm run build
```

## Секреты

`backend/.env`, `frontend/.env.local`, корневой `.env` и `nginx/certs/` — никогда не коммитятся
(см. `.gitignore`). Используйте `*.env.example` как шаблон.

## Roadmap

Актуальный список того, что реализовано полностью, что частично, и что нет —
[`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md), раздел «Что осталось».
