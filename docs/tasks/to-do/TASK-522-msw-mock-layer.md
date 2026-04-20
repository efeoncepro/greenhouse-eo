# TASK-522 — Install MSW (Mock Service Worker) for tests

## Status

- Lifecycle: `to-do`
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

- [ ] `msw` 2.x instalado.
- [ ] Handlers canónicos en `src/mocks/handlers.ts`.
- [ ] Vitest + setup file importa MSW node server.
- [ ] 2-3 tests migrados como proof of concept.
- [ ] Docs ops con how-to-add-handler y how-to-run.
- [ ] Gates tsc/lint/test/build verdes.

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
