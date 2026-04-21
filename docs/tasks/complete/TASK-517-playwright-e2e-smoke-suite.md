# TASK-517 — Playwright E2E smoke suite

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto` (confidence en flujos críticos pre-deploy)
- Effort: `Medio`
- Type: `testing` + `platform`
- Status real: `Backlog — Ola 2 stack modernization`
- Rank: `Post-TASK-511`
- Domain: `platform` + `qa`
- Blocked by: `none`
- Branch: `task/TASK-517-playwright-e2e-smoke`

## Summary

Instalar Playwright + escribir 5-10 smoke tests E2E de los flujos críticos del portal. Hoy tenemos Vitest (unit + component) pero no E2E. Enterprise standard convention.

Parent: TASK-511 (Stack Modernization Roadmap) · Ola 2.

## Why This Task Exists

Unit tests no atrapan regresiones cross-component (ej. TASK-500/501/502 eran bugs de integración que Vitest no detectó). E2E con Playwright cubre:
- Auth end-to-end (login → session → protected route).
- Flujos críticos de negocio (quote creation, payroll close, people 360).
- Visual regression opcional (screenshots).

Playwright es el estándar 2024-2026 (Linear, Vercel, Stripe, GitHub). Superó a Cypress en performance + multi-browser + DX.

## Goal

1. Instalar `@playwright/test`.
2. Setup de Playwright con `playwright.config.ts` + autenticación headless via `agent-auth` flow.
3. Escribir 5-10 smoke tests priorizados:
   - Login + session persistence.
   - Quote creation happy path (org + line + save).
   - Quote edit + save.
   - Payroll period lookup.
   - Person 360 detail load.
   - Admin navigation (si aplica rol).
4. Integrar en CI (run en PR contra staging).
5. Docs: `docs/operations/PLAYWRIGHT_E2E.md` con convenciones + how-to-run.

## Acceptance Criteria

- [x] `@playwright/test` instalado (v1.59.1).
- [x] `playwright.config.ts` configura Chromium project, `PLAYWRIGHT_BASE_URL`, storageState `.auth/storageState.json`, Vercel bypass header inyectado automáticamente si hay `VERCEL_AUTOMATION_BYPASS_SECRET`.
- [x] `scripts/playwright-auth-setup.mjs` reutilizado desde `tests/e2e/global-setup.ts` (regenera storageState si pasa de 20 min o no existe).
- [x] 6 smoke specs / 10 tests creados (login-session × 2, home × 2, finance-quotes × 2, hr-payroll × 2, people-360 × 1, admin-nav × 1). `pnpm exec playwright test --list` parsea correctamente.
- [x] Scripts: `pnpm test:e2e`, `pnpm test:e2e:ui`, `pnpm test:e2e:setup`.
- [x] Docs ops en `docs/operations/PLAYWRIGHT_E2E.md` (stack, env, how-to local + staging + CI, troubleshooting, convenciones para nuevos tests).
- [x] Gates tsc/lint/test/build verdes (solo warning pre-existente en `BulkEditDrawer.tsx`).
- [ ] Green run real contra localhost/staging queda pendiente de validación runtime — requiere `AGENT_AUTH_SECRET` configurado en `.env.local` y dev server corriendo, o GitHub Secrets configurados para el workflow.

## Implementation Notes — 2026-04-21 (Claude Opus 4.7)

**Archivos creados:**

- `playwright.config.ts` — Chromium project, baseURL resolution (PLAYWRIGHT_BASE_URL → AGENT_AUTH_BASE_URL → NEXT_PUBLIC_APP_URL → localhost:3000), storageState autocargado, `webServer` opcional detrás de flag `PLAYWRIGHT_START_WEB_SERVER`.
- `tests/e2e/global-setup.ts` — ejecuta `scripts/playwright-auth-setup.mjs` cuando el storageState no existe o tiene > 20 min; flag `PLAYWRIGHT_SKIP_AUTH_SETUP=true` para bypass.
- `tests/e2e/fixtures/auth.ts` — re-exporta `test`/`expect` de Playwright + helpers `expectAuthenticated` y `gotoAuthenticated(page, path)` que aborta si la navegación cae a `/login`.
- `tests/e2e/smoke/login-session.spec.ts` — 2 tests: cookie de NextAuth presente + session persiste en 2ª navegación.
- `tests/e2e/smoke/home.spec.ts` — 2 tests: `/home` renderiza sin error text + `/` redirige a `portalHomePath` (no cae a `/login` ni queda en `/`).
- `tests/e2e/smoke/finance-quotes.spec.ts` — 2 tests: `/finance/quotes` list + `/finance/quotes/new` builder entrypoint.
- `tests/e2e/smoke/hr-payroll.spec.ts` — 2 tests: `/hr/payroll` admin + `/my/payroll` collaborator.
- `tests/e2e/smoke/people-360.spec.ts` — 1 test: `/people` directory.
- `tests/e2e/smoke/admin-nav.spec.ts` — 1 test: `/admin` dashboard (requiere `efeonce_admin`).
- `.github/workflows/playwright.yml` — dispara en `workflow_dispatch` (con input opcional `base_url`) y en `push` a `develop`. Guard inicial que falla fast si faltan `PLAYWRIGHT_BASE_URL` o `AGENT_AUTH_SECRET`. Sube HTML report + JSON + traces como artifacts 14 días.
- `docs/operations/PLAYWRIGHT_E2E.md` — operacional V1 (stack, env vars, local, staging, CI, convenciones, troubleshooting, follow-ups).

**Archivos modificados:**

- `package.json` — scripts `test:e2e`, `test:e2e:ui`, `test:e2e:setup`; dep dev `@playwright/test ^1.59.1`.
- `.env.example` — `PLAYWRIGHT_BASE_URL`, `PLAYWRIGHT_SKIP_AUTH_SETUP`, `PLAYWRIGHT_START_WEB_SERVER` documentados bajo el bloque de Agent auth.
- `.gitignore` — agrega `/test-results/`, `/playwright-report/`, `/blob-report/`, `/playwright/.cache/`.

**Diseño de los asserts:**

Smoke tests priorizan resilience sobre especificidad. Asserts mínimos:
1. `response.status() < 400`.
2. `<body>` visible.
3. No text matching `application error|500 — internal|unauthorized`.
4. Pathname no en `{/login, /signin, /auth/signin, /auth/access-denied}`.

No se asserta copy ni estructura visual — eso pertenece a integration/visual regression tests (out of scope V1 per spec).

**Sinergia con el ecosistema:**

- Reusa el endpoint `/api/auth/agent-session` (TASK-Identity V2) sin modificarlo.
- Reusa `scripts/playwright-auth-setup.mjs` como `globalSetup` — no duplica la generación de cookies.
- Reusa el patrón de bypass header `x-vercel-protection-bypass` de `scripts/staging-request.mjs`.
- No emite eventos outbox, no toca DDL, no calcula métricas. Es cross-cutting de QA.

**Impacto cruzado (otras tasks):**

- **TASK-516 (NextAuth v4 → Auth.js v5):** después de la migración, el cookie name cambia de `next-auth.session-token` a `authjs.session-token`. El test `login-session.spec.ts:agent storageState produces an authenticated session` ya lista ambos nombres (v4 + v5) en el `find`, así que sobrevive el swap. `storageState.json` se regenera automáticamente en cada run.
- **TASK-511 (Stack Modernization Roadmap):** primera task de Ola 2 completada. Desbloquea E2E coverage para el resto del roadmap (toastify→sonner, react-query, eslint-9, authjs-v5, etc.).

**Out of scope respetado:**

- No visual regression (Chromatic/Percy).
- No multi-browser (Firefox/WebKit).
- No integration tests de mutación (creación de quote, payroll close).
- No run en cada PR (decisión costo/beneficio: push-to-develop + workflow_dispatch es suficiente para V1; Preview deployment hook es follow-up).

## Scope

- `playwright.config.ts` con projects para Chromium (Firefox/WebKit como follow-up).
- `tests/e2e/` folder con 5-10 spec files.
- `.github/workflows/playwright.yml` para CI si aplica.
- Reutilizar agent-auth helper para skip el login interactivo.

## Out of Scope

- Visual regression testing (Chromatic / Percy) — TASK futura.
- Tests E2E de payroll close completo (workflow largo) — TASK separada.
- Multi-browser matrix (Firefox + WebKit) — agregar después del smoke.

## Follow-ups

- Integrar con Vercel Preview deployments (run E2E on each PR).
- Visual snapshots para enterprise polish screens (Quote Builder, Payroll tabs).
