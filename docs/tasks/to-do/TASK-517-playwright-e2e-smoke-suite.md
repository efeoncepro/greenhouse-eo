# TASK-517 — Playwright E2E smoke suite

## Status

- Lifecycle: `to-do`
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

- [ ] `@playwright/test` instalado.
- [ ] `playwright.config.ts` configura browsers (Chromium min), baseURL env, auth storageState.
- [ ] `scripts/playwright-auth-setup.mjs` reutilizado (ya existe) para generar `.auth/storageState.json`.
- [ ] 5+ smoke tests green en localhost + staging.
- [ ] Scripts: `pnpm test:e2e` y `pnpm test:e2e:ui` (inspector).
- [ ] Docs ops.
- [ ] Gates tsc/lint/test/build verdes.

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
