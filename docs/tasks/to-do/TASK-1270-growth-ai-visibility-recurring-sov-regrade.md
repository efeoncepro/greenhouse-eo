# TASK-1270 — Growth AI Visibility: Recurring Share-of-Voice + Scheduled Re-Grade

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
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
- Status real: `Diseno`
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
- Contrato nuevo o modificado: handler `handleGraderRegradeBatch` en ops-worker + Cloud Scheduler job + opt-in/cadence por perfil.
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
- Default state: `flag OFF` (`GROWTH_AI_VISIBILITY_REGRADE_ENABLED`) + opt-in vacío.
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
- Reliability signals/logs: `growth.grader.regrade.lag` / `..._cost` / perfiles stale.
- Production verification sequence: shadow staging (1 perfil opt-in) → verificar cadencia + budget → flip prod con cooldown.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Opt-in + cadence model + scheduler

- Migration additive: `opt_in_recurring` + `cadence` en `grader_profiles`; capability gobernada para el opt-in.
- Scheduler de cadencia que selecciona perfiles due (idempotente, lock por perfil).

### Slice 2 — ops-worker handler + Cloud Scheduler job + budget guard

- `handleGraderRegradeBatch` en ops-worker reusando el run-engine; Cloud Scheduler job en `deploy.sh` (staging + prod).
- Cost ceiling + circuit breaker; flag `GROWTH_AI_VISIBILITY_REGRADE_ENABLED`.

### Slice 3 — Reliability signals + ledger

- Signals de re-grade lag / costo / perfiles stale wired a `/admin/operations`.
- Fila por flag en `FEATURE_FLAG_STATE_LEDGER.md`.

## Out of Scope

- Dashboard visual de tendencia SoV (follow-up de producto / UI task aparte).
- Cambiar el scoring o el trend (reusa TASK-1227/1236).
- Re-gradear leads one-shot sin opt-in.

## Detailed Spec

El re-grade es una aplicación de cadencia sobre el run-engine existente: un Cloud Scheduler job pega periódicamente al ops-worker (`/grader/regrade-batch`), que selecciona perfiles `opt_in_recurring` cuya `cadence` venció (`SELECT FOR UPDATE SKIP LOCKED` para no solapar), encola un run nuevo por perfil (reusando todo el pipeline), y deja que el trend (TASK-1236) compute el delta vs el run anterior. El budget guard del run-engine acota el gasto; si el budget diario se agota, el batch degrada (skip con señal) en vez de gastar de más. Espeja el patrón del outbox publisher (TASK-773): helper canónico → endpoint ops-worker → Cloud Scheduler job → reliability signal.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (opt-in + scheduler) → Slice 2 (handler + Cloud Scheduler + budget) → Slice 3 (signals). El Cloud Scheduler job (Slice 2) NO se activa antes de que el budget guard esté en su lugar.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Re-grade infla gasto LLM en el tiempo | cost/reliability | high | cost ceiling + circuit breaker + cadencia conservadora + flag OFF | `growth.grader.regrade.cost` |
| Vercel cron en vez de Cloud Scheduler (staging ciego) | reliability | medium | Cloud Scheduler + ops-worker obligatorio (regla dura) | re-grade lag en staging |
| Re-grades solapados por perfil | robustness | medium | lock por perfil + `SKIP LOCKED` + idempotencia | duplicate runs por perfil |
| Re-grade sin opt-in (consent) | legal/privacy | medium | opt-in explícito gateado por capability | re-grade de perfil no opt-in |
| Worker runtime dep faltante | reliability | medium | `pnpm worker:runtime-deps-gate` + sin import `@core` worker-bundled | startup crash del worker |

### Feature flags / cutover

- `GROWTH_AI_VISIBILITY_REGRADE_ENABLED` (default `false`) + opt-in vacío. Cloud Scheduler job disabled hasta shadow staging. Revert: flag OFF + disable job + redeploy. <5 min.

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

- [ ] El re-grade corre por Cloud Scheduler + ops-worker (NUNCA Vercel cron), reusando el run-engine canónico.
- [ ] Solo perfiles `opt_in_recurring` entran a la cadencia (consentimiento explícito gateado por capability).
- [ ] Re-grade idempotente con lock por perfil (`SKIP LOCKED`); sin runs solapados.
- [ ] Cost ceiling + circuit breaker: budget agotado → degrada con señal, no gasta de más.
- [ ] Reliability signals de re-grade lag / costo / perfiles stale wired a `/admin/operations`.
- [ ] `pnpm worker:runtime-deps-gate` verde; sin import `@core` worker-bundled.
- [ ] Fila por flag en `FEATURE_FLAG_STATE_LEDGER.md`.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm worker:runtime-deps-gate`
- Re-grade real de un perfil opt-in en staging vía Cloud Scheduler

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-1240 budget, TASK-1236 trend)
- [ ] `FEATURE_FLAG_STATE_LEDGER.md` actualizado

## Follow-ups

- Dashboard de tendencia SoV cross-engine (UI task aparte).
- Alertas por caída brusca de SoV (signal → notificación al perfil).

## Open Questions

1. ¿Cadencia default semanal o mensual? Propuesta: mensual por defecto (balance costo/frescura), configurable por perfil.
2. ¿El opt-in es para clientes pagos o también para leads del lead magnet? Propuesta: opt-in de cliente pago; el lead magnet queda one-shot salvo upgrade explícito.
