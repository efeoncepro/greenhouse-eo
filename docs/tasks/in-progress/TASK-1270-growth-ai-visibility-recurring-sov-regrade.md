# TASK-1270 — Growth AI Visibility: Recurring Share-of-Voice + Scheduled Re-Grade

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `cron`
- Epic: `EPIC-020`
- Status real: `Rollout staging en curso`
- Rank: `TBD`
- Domain: `growth|ai|ops|reliability`
- Blocked by: `none`
- Branch: `task/TASK-1270-growth-ai-visibility-recurring-sov-regrade`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El grader es hoy un snapshot point-in-time (con `trend` run-over-run de TASK-1236, pero sin re-grade automático). Esta task agrega un **re-grade agendado** para perfiles opt-in vía Cloud Scheduler + ops-worker, materializando Share-of-Voice cross-engine en el tiempo. Convierte el lead magnet de "diagnóstico único" en un producto de monitoreo recurrente (gancho de retención / upsell).

## Why This Task Exists

La frescura es ranking factor IA y la visibilidad en answer engines se mueve cada semana; un diagnóstico único envejece. El run-engine + trend ya existen, pero nadie dispara re-grades en cadencia ni acumula SoV en el tiempo. Un re-grade agendado (mensual/semanal por perfil opt-in) da continuidad de valor y abre el camino a un dashboard de tendencia — el tipo de capability que justifica una relación recurrente, no una transacción única.

## Goal

- Cron gobernado (Cloud Scheduler + ops-worker, NUNCA Vercel cron) que re-ejecuta el grader para perfiles opt-in en cadencia configurable.
- Materializar SoV cross-engine en el tiempo sobre el `trend` existente (TASK-1236), idempotente y con budget acotado.
- Reliability signals de cadencia (re-grade lag, costo acumulado, perfiles stale).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — §7 scoring/trend, §17 observability, §18 rollout.
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` — outbox + reactive + dead-letter.
- `docs/tasks/complete/TASK-775-*` [verificar slug] — Cloud Scheduler + ops-worker + clasificación de crons (async_critical / prod_only / tooling).
- `docs/tasks/complete/TASK-1236-growth-ai-visibility-report-trend.md` [verificar] — trend run-over-run.
- `docs/tasks/complete/TASK-1234-*` [verificar slug] — worker async del grader.

Reglas obligatorias:

- **Cloud Scheduler + ops-worker, NUNCA Vercel cron** para el re-grade (path async; Vercel cron solo corre en Production y dejaría staging ciego — footgun documentado en CLAUDE.md §outbox publisher).
- **Re-grade idempotente + budget acotado:** la cadencia respeta el cost ceiling global/per-run; un re-grade no duplica gasto fuera de lo esperado ni satura providers. Circuit breaker si el budget diario se agota.
- **Opt-in explícito:** solo perfiles que consintieron monitoreo recurrente entran a la cadencia (no re-gradear leads one-shot del lead magnet sin consentimiento).
- **Reusar run-engine + trend canónicos** (TASK-1226/1236), NO un pipeline paralelo.
- **Reliability signal** por la cadencia (lag/costo/stale) wired a `/admin/operations`.

## Normative Docs

- `docs/epics/to-do/EPIC-020-public-ai-visibility-lead-magnet-program.md`
- `services/ops-worker/server.ts` [verificar: handler del re-grade]
- `src/lib/growth/ai-visibility/run-engine.ts`
- `src/lib/reliability/queries/`

## Dependencies & Impact

### Depends on

- `TASK-1226` — run-engine.
- `TASK-1236` — trend run-over-run.
- `TASK-1234` — worker async del grader.
- Cloud Scheduler + ops-worker (TASK-775 pattern).

### Blocks / Impacts

- Habilita un dashboard de tendencia SoV (follow-up de producto).
- Impacta el budget de providers (más runs en el tiempo) → coordinar con TASK-1240 controls.

### Files owned

- `services/ops-worker/server.ts` [extender: handler re-grade]
- `services/ops-worker/deploy.sh` [extender: Cloud Scheduler job]
- `src/lib/growth/ai-visibility/regrade/` [nuevo: scheduler de cadencia + opt-in]
- `src/lib/reliability/queries/growth-grader-regrade-*.ts` [nuevo signal]
- `migrations/` [opt-in flag + cadence por perfil — verificar]
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

## Current Repo State

### Already exists

- Run-engine async + worker drain (TASK-1226/1234).
- Trend run-over-run (TASK-1236).
- Cloud Scheduler + ops-worker infra (TASK-775).

### Gap

- Nadie dispara re-grades en cadencia; el grader es point-in-time.
- No hay opt-in de monitoreo recurrente ni acumulación de SoV en el tiempo.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `cron`
- Source of truth afectado: `grader_runs` (re-grades) + cadencia/opt-in por perfil
- Consumidores afectados: trend, report, dashboard de tendencia, marketing/sales
- Runtime target: `worker|cron|staging|production`

### Contract surface

- Contrato existente a respetar: run-engine (TASK-1226), trend (TASK-1236), Cloud Scheduler + ops-worker (TASK-775).
- Contrato nuevo o modificado: handler `POST /growth/grader/regrade` en ops-worker + Cloud Scheduler job + opt-in/cadence por perfil.
- Backward compatibility: `gated` (cadencia detrás de flag + opt-in; perfiles one-shot no cambian).
- Full API parity: el re-grade reusa el run-engine canónico; el opt-in es una capability gobernada.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.grader_profiles` (opt-in + cadence) + `grader_runs` (re-grades).
- Invariantes que no se pueden romper:
  - Re-grade idempotente; respeta cost ceiling; circuit breaker si budget agotado.
  - Solo perfiles opt-in entran a la cadencia (consentimiento explícito).
  - Cloud Scheduler + ops-worker, NUNCA Vercel cron para el path async.
  - Reusar run-engine + trend; sin pipeline paralelo.
- Tenant/space boundary: perfiles del grader; el SoV recurrente es por perfil opt-in.
- Idempotency/concurrency: lock por perfil para no solapar re-grades; `SELECT FOR UPDATE SKIP LOCKED` al drenar la cadencia.
- Audit/outbox/history: re-grade emite los mismos events del run; signal de cadencia.

### Migration, backfill and rollout

- Migration posture: `additive` (opt-in flag + cadence column en `grader_profiles`).
- Default state: staging `flag ON` (`GROWTH_AI_VISIBILITY_REGRADE_ENABLED`) tras rollout develop; production `flag OFF`; opt-in vacío por defecto.
- Backfill plan: N/A (cadencia prospectiva).
- Rollback path: flag OFF + deshabilitar Cloud Scheduler job + redeploy.
- External coordination: Cloud Scheduler job en GCP (staging + prod) + budget sign-off.

### Security and access

- Auth/access gate: ops-worker service account; opt-in vía capability gobernada.
- Sensitive data posture: sin PII a providers; el opt-in respeta consent.
- Error contract: errores sanitizados (`captureWithDomain`); dead-letter del batch.
- Abuse/rate-limit posture: cost ceiling + circuit breaker + lock por perfil.

### Runtime evidence

- Local checks: `pnpm test` del scheduler de cadencia + idempotencia + `pnpm worker:runtime-deps-gate`.
- DB/runtime checks: re-grade de un perfil opt-in en staging + verificar nuevo run + trend actualizado.
- Integration checks: Cloud Scheduler job dispara el handler en staging.
- Reliability signals/logs: `growth.ai_visibility.regrade_lag` / `growth.ai_visibility.regrade_cost` / `growth.ai_visibility.regrade_stale_profiles`.
- Production verification sequence: shadow staging (1 perfil opt-in) → verificar cadencia + budget → flip prod con cooldown.

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths or objects.
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [x] Migration/backfill/rollback posture is explicit and proportional to risk.
- [x] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [x] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

## Audit / Plan (Codex 2026-06-29)

### Audit

- Hook ejecutado: `pnpm codex:task-hook 1270`; trabajo local-first en `develop` sin branch/worktree nuevo, documentado en `Handoff.md`.
- Supuestos correctos: el run-engine async, trend run-over-run, ops-worker y módulo `ai_visibility_v1` ya existían; la task podía ser aditiva.
- Drift corregido en la spec: el endpoint implementado es `POST /growth/grader/regrade` (no `/grader/regrade-batch`) y el modelo usa columnas explícitas `recurring_regrade_*` (no `opt_in_recurring`/`cadence` genéricos).
- Decisiones cerradas: cadencia default mensual; re-grade recurrente sólo para perfiles con opt-in explícito y módulo contratado (`metadata_json.aeo_tier='contracted'`).
- Riesgo principal: costo acumulado de providers. Mitigación implementada: flag OFF por defecto, Scheduler job pausado, batch cap, budget mensual y cost ceiling por run `full`.
- Brecha detectada durante auditoría de cierre: si el enqueue fallaba después del claim, el perfil podía quedar diferido hasta la siguiente cadencia. Fix aplicado: retry corto (`next_at = now()+1 day`) + contador `failedProfiles`.

### Slice Plan

1. Modelo additive en `grader_profiles` + capability `growth.ai_visibility.regrade.manage`.
2. Scheduler idempotente con `FOR UPDATE SKIP LOCKED`, entitlement contratado y budget guard.
3. Ops-worker endpoint + Cloud Scheduler job pausado por defecto.
4. Reliability signals de lag/costo/stale wired al overview operativo.
5. Documentación de arquitectura, feature ledger, changelog, task lifecycle y handoff.

### Evidence Map

- Código: `src/lib/growth/ai-visibility/regrade/**`, `services/ops-worker/server.ts`, `services/ops-worker/deploy.sh`.
- Datos: `migrations/20260629103000000_task-1270-recurring-regrade.sql`.
- Observabilidad: `src/lib/reliability/queries/growth-ai-visibility-regrade-signals.ts` + `get-reliability-overview.ts`.
- Governance: `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`, arquitectura del grader, changelog y Handoff.

### Slice 1 — Opt-in + cadence model + scheduler

- Migration additive: `recurring_regrade_enabled` + `recurring_regrade_cadence` + `recurring_regrade_next_at` + `recurring_regrade_last_*` en `grader_profiles`; capability gobernada para el opt-in.
- Scheduler de cadencia que selecciona perfiles due (idempotente, lock por perfil).

### Slice 2 — ops-worker handler + Cloud Scheduler job + budget guard

- `POST /growth/grader/regrade` en ops-worker reusando el run-engine; Cloud Scheduler job `ops-growth-grader-regrade` en `deploy.sh` (activo en staging, pausado por default en production).
- Cost ceiling + circuit breaker; flag `GROWTH_AI_VISIBILITY_REGRADE_ENABLED`.

### Slice 3 — Reliability signals + ledger

- Signals de re-grade lag / costo / perfiles stale wired a `/admin/operations`.
- Fila por flag en `FEATURE_FLAG_STATE_LEDGER.md`.

## Out of Scope

- Dashboard visual de tendencia SoV (follow-up de producto / UI task aparte).
- Cambiar el scoring o el trend (reusa TASK-1227/1236).
- Re-gradear leads one-shot sin opt-in.

## Detailed Spec

El re-grade es una aplicación de cadencia sobre el run-engine existente: un Cloud Scheduler job pega periódicamente al ops-worker (`POST /growth/grader/regrade`), que selecciona perfiles `recurring_regrade_enabled` cuya `recurring_regrade_next_at` venció (`SELECT FOR UPDATE SKIP LOCKED` para no solapar), exige módulo cliente `ai_visibility_v1` contratado, encola un run `full` por perfil con idempotency key `growth-ai-visibility-regrade:<profile>:<cadence>:<window>`, y deja que el trend (TASK-1236) compute el delta vs el run anterior. El budget guard acota el gasto mensual usando el cost ceiling del policy `full`; si el budget se agota, el batch degrada a skip antes de claim/enqueue. Espeja el patrón del outbox publisher (TASK-773): helper canónico → endpoint ops-worker → Cloud Scheduler job → reliability signal.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (opt-in + scheduler) → Slice 2 (handler + Cloud Scheduler + budget) → Slice 3 (signals). El Cloud Scheduler job (Slice 2) NO se activa antes de que el budget guard esté en su lugar.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Re-grade infla gasto LLM en el tiempo | cost/reliability | high | cost ceiling + circuit breaker + cadencia conservadora + flag OFF | `growth.ai_visibility.regrade_cost` |
| Vercel cron en vez de Cloud Scheduler (staging ciego) | reliability | medium | Cloud Scheduler + ops-worker obligatorio (regla dura) | re-grade lag en staging |
| Re-grades solapados por perfil | robustness | medium | lock por perfil + `SKIP LOCKED` + idempotencia | duplicate runs por perfil |
| Re-grade sin opt-in (consent) | legal/privacy | medium | opt-in explícito gateado por capability | re-grade de perfil no opt-in |
| Worker runtime dep faltante | reliability | medium | `pnpm worker:runtime-deps-gate` + sin import `@core` worker-bundled | startup crash del worker |

### Feature flags / cutover

- `GROWTH_AI_VISIBILITY_REGRADE_ENABLED` staging `true` / production `false` + opt-in vacío por default. Cloud Scheduler job activo en staging y pausado por default en production. Revert staging: flag OFF + pause job + redeploy. <5 min.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR; migration additive con DEFAULT (reverse si necesario) | <10 min | si |
| Slice 2 | flag OFF + disable Cloud Scheduler job | <5 min | si |
| Slice 3 | revert PR (signals additive) | <5 min | si |

### Production verification sequence

1. `pnpm migrate:up` staging + verificar columnas opt-in/cadence.
2. Deploy worker + flag OFF + verificar runs existentes sin cambio.
3. Opt-in 1 perfil de prueba + Cloud Scheduler job staging + verificar 1 re-grade + trend + budget.
4. Revisar signals steady + costo del re-grade.
5. Flip prod con cooldown 24h + monitorear costo/lag 7d.

### Out-of-band coordination required

- Cloud Scheduler job en GCP (staging + prod).
- Budget sign-off del operador (más runs en el tiempo = más gasto).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] El re-grade corre por Cloud Scheduler + ops-worker (NUNCA Vercel cron), reusando el run-engine canónico.
- [x] Solo perfiles `recurring_regrade_enabled` entran a la cadencia (consentimiento explícito gateado por capability + módulo contratado).
- [x] Re-grade idempotente con lock por perfil (`SKIP LOCKED`); sin runs solapados.
- [x] Cost ceiling + circuit breaker: budget agotado → degrada con señal, no gasta de más.
- [x] Reliability signals de re-grade lag / costo / perfiles stale wired a `/admin/operations`.
- [ ] `pnpm worker:runtime-deps-gate` verde; sin import `@core` worker-bundled.
- [x] Fila por flag en `FEATURE_FLAG_STATE_LEDGER.md`.
- [ ] Re-grade real de un perfil opt-in en staging vía Cloud Scheduler/manual run; rollout staging en curso.

## Verification

- [x] `pnpm exec vitest run src/lib/growth/ai-visibility/__tests__/regrade-scheduler.test.ts`
- [x] `pnpm worker:runtime-deps-gate`
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm exec tsc --noEmit --pretty false`
- [x] `pnpm lint`
- [x] `pnpm task:lint --task TASK-1270`
- [x] `pnpm task:lint --changed`
- [x] `pnpm ops:lint --changed`
- [x] `pnpm docs:closure-check` (warnings no bloqueantes: doc de arquitectura del grader sigue monolítica; `project_context.md` revisado/no requiere cambio porque no se agregó regla standing nueva)
- [x] `pnpm vercel-cron-gate`
- [x] `set -a; source .env.local; set +a; pnpm secrets:audit`
- [x] `pnpm route-reachability-gate`
- [x] `pnpm test:observability:summary`
- [x] `pnpm pg:connect:migrate` (migración TASK-1270 aplicada en Cloud SQL dev/staging; `src/types/db.d.ts` regenerado)
- [ ] `NEXT_BUILD_CPUS=2 NODE_OPTIONS=--max-old-space-size=8192 pnpm build` (compilación Turbopack exitosa con warning preexistente de `roadmap/work-item-index`; proceso interrumpido tras quedar sin salida en etapa post-compile/TypeScript, con `tsc` explícito verde)
- [ ] Re-grade real de un perfil opt-in en staging vía Cloud Scheduler/manual run

## Closing Protocol

- [x] `Lifecycle` del markdown sincronizado
- [x] el archivo vive en la carpeta correcta
- [x] `docs/tasks/README.md` sincronizado
- [x] `Handoff.md` actualizado
- [x] `changelog.md` actualizado
- [x] chequeo de impacto cruzado (TASK-1240 budget, TASK-1236 trend)
- [x] `FEATURE_FLAG_STATE_LEDGER.md` actualizado

## Follow-ups

- Dashboard de tendencia SoV cross-engine (UI task aparte).
- Alertas por caída brusca de SoV (signal → notificación al perfil).

## Open Questions

1. ¿Cadencia default semanal o mensual? Resuelto: mensual por defecto (`monthly`) para equilibrar costo/frescura; configurable por perfil.
2. ¿El opt-in es para clientes pagos o también para leads del lead magnet? Resuelto: sólo cliente pago/entitled con opt-in explícito; lead magnet permanece one-shot salvo upgrade explícito.
