# TASK-522 — Install MSW (Mock Service Worker) for tests

## Status

- Lifecycle: `complete`
- Priority: `P3`
- Impact: `Medio` (tests más confiables + desarrollo offline)
- Effort: `Medio`
- Type: `testing` + `platform`
- Status real: `Backlog — Ola 4 stack modernization`
- Rank: `Post-TASK-511`
- Domain: `qa` + `platform`
- Blocked by: `none`
- Branch: `task/TASK-522-msw-mock-layer`

## Summary

Instalar `msw` (Mock Service Worker) como layer canónico para mockear requests HTTP en tests (Vitest + Playwright). Hoy los mocks son ad-hoc en cada test (`vi.mock` / `fetch` spies). MSW intercepta a nivel red — mismos handlers para Vitest, Playwright y development mode.

Parent: TASK-511 (Stack Modernization Roadmap) · Ola 4.

## Why This Task Exists

Sin MSW:
- Cada test file re-mocka fetch a su manera → mocks drift con el backend real.
- Playwright E2E (TASK-517) no puede fácilmente stubear respuestas externas.
- Dev mode offline (sin backend corriendo) no tiene path.

Con MSW:
- Un único set de handlers (`src/mocks/handlers.ts`) que vive cerca del contract.
- Use en Vitest (`msw/node`) + Playwright (`msw/browser`) + dev mode (Service Worker).
- Testing Library recomienda MSW como mock layer by default.
- Kent C. Dodds, Testing Trophy pattern.

## Goal

1. Instalar `msw`.
2. Setup: `src/mocks/handlers.ts` (rest handlers para /api/** priorizados).
3. `src/mocks/node.ts` (Vitest setup) + `src/mocks/browser.ts` (Playwright + dev).
4. Hook up en `vitest.config` (setupFiles).
5. Migrar 2-3 tests ejemplares de mocks ad-hoc a MSW handlers.
6. Docs: `docs/operations/TESTING_WITH_MSW.md`.

## Acceptance Criteria

- [x] `msw` 2.x instalado (`^2.13.4`).
- [x] Handlers canónicos en `src/mocks/handlers.ts` (domain split: `finance`, `hr`, `people`).
- [x] Vitest + setup file importa MSW node server (`src/test/setup.ts` orquesta `listen`/`resetHandlers`/`close`).
- [x] 3 tests migrados como proof of concept (slack-notify, cloud/observability, PersonActivityTab).
- [x] Docs ops con how-to-add-handler y how-to-run (`docs/operations/TESTING_WITH_MSW.md`).
- [x] Gates lint/test/build verdes sobre los archivos tocados.

## Entregado (2026-04-21)

- `msw@^2.13.4` agregado a devDependencies.
- `public/mockServiceWorker.js` commiteado (worker script para browser/Playwright).
- Scaffolding en `src/mocks/`:
  - `handlers.ts` + `handlers/{finance,hr,people}.ts` — defaults estructurales minimal.
  - `node.ts` — `setupServer()` para Vitest.
  - `browser.ts` — `setupWorker()` para Playwright/dev opt-in.
  - `index.ts` — re-exports ergonómicos (`http`, `HttpResponse`).
- `src/test/setup.ts` extendido: `beforeAll(listen) / afterEach(resetHandlers) / afterAll(close)` con `onUnhandledRequest: 'warn'` para convivir con los ~20 tests legacy que aún hacen `vi.stubGlobal('fetch', ...)`.
- 3 PoCs migrados de `vi.stubGlobal('fetch', ...)` a `server.use(http...)`:
  - `src/lib/alerts/slack-notify.test.ts` — webhook POST con captura de body.
  - `src/lib/cloud/observability.test.ts` — API de Sentry con 200/400/403/`HttpResponse.error()`.
  - `src/views/greenhouse/people/tabs/PersonActivityTab.test.tsx` — view-layer con 2 endpoints concurrentes y assertion sobre `params`.
- `docs/operations/TESTING_WITH_MSW.md` — how-to canónico: qué es, cómo correr, cómo agregar handler, cómo override por test, simulación de errores, dev mode opt-in, troubleshooting.

## Verificacion

- `pnpm test` → 369 test files, 1805 tests passing (2 skipped), 0 regressions.
- `pnpm lint` sobre archivos tocados → clean.
- `pnpm build` → Compiled successfully in 35.9s.
- `npx tsc --noEmit` sobre archivos tocados → clean.

## Follow-ups recomendados

- Cuando TASK-517 (Playwright) incorpore MSW browser, reusar `src/mocks/browser.ts` desde el setup de Playwright.
- Subir `onUnhandledRequest` de `warn` a `error` en `src/test/setup.ts` una vez que el backlog de `vi.stubGlobal('fetch', ...)` baje a cero.
- Agregar handlers por dominio conforme nuevos módulos necesiten mocks estables (agency, integrations, dashboard).

## Scope

- `src/mocks/handlers.ts` — finance, hr, people handlers base.
- `src/mocks/node.ts`, `src/mocks/browser.ts`.
- Vitest setup integration.
- Opt-in en dev mode (env var controlada).

## Out of Scope

- Cobertura 100% de endpoints (iterativo).
- GraphQL handlers (si algún día migramos).

## Follow-ups

- Integrar MSW en Playwright (TASK-517) cuando este esté listo.
- Considerar MSW para Storybook si eventualmente adoptamos Storybook.
