# ISSUE-012 — Reactive cron routes fail closed without CRON_SECRET

## Ambiente

develop runtime

## Detectado

2026-04-05, investigación operativa posterior a `ISSUE-009` sobre backlog reactivo vivo en `greenhouse-pg-dev`

## Síntoma

El carril reactivo podía quedar estancado aun cuando `vercel.json` siguiera programando `GET /api/cron/outbox-react` cada `5` minutos. En el incidente observado, Admin Ops ya mostraba backlog reactivo real (`607` eventos ocultos, `128` en últimas `24h`) y `lastReactedAt` congelado en `2026-04-03 01:50:29+00`.

## Causa raíz

`requireCronAuth()` evaluaba `CRON_SECRET` antes de reconocer tráfico legítimo de Vercel Cron. Cuando el secret faltaba en el entorno, la helper devolvía `503` y bloqueaba todas las routes cron, incluso si la request tenía `x-vercel-cron: 1` o `user-agent` `vercel-cron/*`.

## Impacto

- El reactor podía quedar detenido por configuración aun cuando la schedule siguiera activa.
- El blast radius no era exclusivo del carril reactivo: cualquier route protegida con `requireCronAuth()` quedaba expuesta al mismo fail-close.
- La plataforma observaba backlog creciente en Admin Ops, pero el scheduler no podía drenarlo.

## Solución

- `src/lib/cron/require-cron-auth.ts` ahora acepta primero requests válidas de Vercel Cron.
- `CRON_SECRET` quedó reservado para invocaciones bearer/manuales fuera de Vercel.
- Si falta `CRON_SECRET`, las invocaciones no-Vercel siguen fallando en cerrado con `503`, preservando el guardrail manual.
- Se agregó regresión unitaria para cubrir ambos caminos cuando el secret falta.

## Verificación

- `pnpm exec vitest run src/lib/cron/require-cron-auth.test.ts` — OK (`8` tests)
- `pnpm exec tsc --noEmit --pretty false` — OK

## Estado

resolved

## Relacionado

- `vercel.json`
- `src/lib/cron/require-cron-auth.ts`
- `src/lib/cron/require-cron-auth.test.ts`
- `src/lib/cloud/cron.ts`
- `src/app/api/cron/outbox-react/route.ts`
- `src/app/api/cron/outbox-react-delivery/route.ts`
- `docs/issues/resolved/ISSUE-009-reactive-event-backlog-can-accumulate-without-ops-visibility.md`
- `docs/tasks/to-do/TASK-251-reactive-control-plane-backlog-observability-replay.md`