# TASK-773 — Outbox Publisher Cloud Scheduler Cutover + Reliability + E2E Pre-Merge Gate

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Crítico`
- Effort: `Medio (3-4h)`
- Type: `infrastructure-platform`
- Epic: `none`
- Status real: `Cerrada 2026-05-03 — 7 slices entregados, deploy ops-worker SUCCESS, Cloud Scheduler ENABLED, drain manual verificado, account_balance Santander Corp rematerializado, E2E Playwright + Chromium 3/3 verde contra staging real`
- Rank: `TBD`
- Domain: `platform / finance / sync`
- Blocked by: `none`
- Branch: `develop` (instrucción explícita 2026-05-03 — no crear branch dedicado)
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Migrar el cron `outbox-publish` (que mueve outbox events de `pending → published`) de **Vercel Cron** (que solo corre en deploys de Production) a **Cloud Scheduler + ops-worker** (que corre por proyecto GCP, igual en staging y producción). Cierra una clase entera de bugs invisibles donde flujos write-then-projection de Finance funcionan en producción pero quedan colgados en staging. Endurece con state machine `pending → publishing → published/failed/dead_letter`, reliability signal `finance.outbox.unpublished_lag` y un **E2E pre-merge gate** que obliga verificación downstream para tasks que tocan `/api/finance/**/route.ts` (POST/PUT).

## Why This Task Exists

**Incidente runtime detectado 2026-05-03 (sesión TASK-772 followup)**: el usuario registró un pago de Figma en `dev-greenhouse.efeoncepro.com/finance/cash-out` (USD $92,90 vía TC Santander Corp). El payment se grabó correctamente en `expense_payments` y el outbox event `finance.expense_payment.recorded` se publicó dentro de la tx PG. Pero la TC NO se rebajó — el balance del UI mostraba "actualizado hace 7 horas".

Diagnóstico:

- Reactive consumer Cloud Run (`ops-reactive-finance` Cloud Scheduler `*/5 min`) corre OK con HTTP 200 en cada ciclo, **pero filtra `WHERE status='published'`** en el SELECT de outbox_events ([reactive-consumer.ts:463](../../src/lib/sync/reactive-consumer.ts#L463)).
- El cron que mueve `pending → published` es Vercel `/api/cron/outbox-publish */5 min` ([vercel.json:11-14](../../vercel.json#L11-L14)) que internamente llama `publishPendingOutboxEvents` de [outbox-consumer.ts:104](../../src/lib/sync/outbox-consumer.ts#L104).
- **Vercel solo ejecuta crons en deploys de Production por default**. Tu staging custom environment (`dev-greenhouse.efeoncepro.com`) NO los corre.
- Resultado: TODO outbox event en staging queda `pending` para siempre. El reactive consumer nunca los ve. Cualquier flow write-then-projection (account_balance, provider_bq_sync TASK-771, ico-materialize, person-intelligence, etc.) **se rompe silenciosamente en staging**.

Costo de no resolverlo:

- TASK-771 (provider_bq_sync) se ve completa pero el backfill nunca drenó en staging.
- TASK-772 (cash-out integrity) muestra contract correcto pero el payment no rebaja TC.
- Próximas tasks Finance que toquen reactive projections caerán en el mismo bug y el operador tendrá que verificar cada flow manualmente.
- El sistema tiene una **clase entera de bugs invisibles** que ningún test unitario/contract puede atrapar.

Causa arquitectónica:

- El path async crítico de Finance depende de un cron que solo vive en un environment.
- No hay reliability signal que detecte "outbox events acumulándose en pending". El bug es invisible hasta que un humano lo nota visualmente.
- El proceso de cierre de tareas valida API contract pero no downstream side effects.

## Goal

- **Cron canónico fail-safe en cualquier environment**: `outbox-publish` corre en staging y producción con la misma garantía SLA.
- **State machine explícita auditable**: cada outbox event transita por estados observables (`pending → publishing → published/failed/dead_letter`) con timestamps, retry count y last error.
- **Reliability signal automática**: `/admin/operations` pinta error si hay events `pending` con edad > 10 min.
- **E2E gate pre-merge obligatorio para tareas Finance write paths**: previene que la próxima clase de bugs "endpoint OK pero downstream calla" llegue a staging sin detectarse.
- **Backfill automático del backlog**: TASK-771 + TASK-772 pendientes drenan al primer ciclo.
- **Cero downtime**: Vercel cron sigue activo durante 24h post-deploy (idempotencia por `event_id`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` — playbook canónico
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — catálogo outbox
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — registry de signals
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` §4.9 — Cloud Run ops-worker patrón canónico
- `docs/tasks/complete/TASK-585-notion-bq-sync-cost-efficiency-hardening.md` — patrón de migración Vercel cron → Cloud Scheduler ya consolidado

Reglas obligatorias:

- NO ejecutar BQ DDL en hot path. Bootstrap BQ vive en startup del worker o migration.
- Idempotencia: el `event_id` es la clave dedupe natural. SELECT FOR UPDATE SKIP LOCKED para concurrencia.
- Status machine extendida con CHECK constraint canónico (`pending|publishing|published|failed|dead_letter`).
- Reliability signal sigue patrón TASK-765/766/771 (kind, severity rule, steady=0, reader degrada honestamente).
- Smoke gate Pre-Merge sigue patrón TASK-599 finance smoke lane.
- Cero breaking change al contrato `outbox_events`: solo aditivo (columnas nuevas + nuevos status values).

## Normative Docs

- `vercel.json` — fuente actual de crons Vercel (eliminar `outbox-publish` post-cutover en slice 4)
- `services/ops-worker/server.ts` — endpoint nuevo `POST /outbox/publish-batch`
- `services/ops-worker/deploy.sh` — agregar Cloud Scheduler job `ops-outbox-publish`
- `src/lib/sync/outbox-consumer.ts` — extender `publishPendingOutboxEvents` con state machine
- `src/lib/reliability/queries/outbox-unpublished-lag.ts` — reader nuevo (patrón TASK-771)
- `eslint-plugins/greenhouse/rules/finance-route-requires-e2e-evidence.mjs` — lint rule custom (mode `warn` initial, promote a `error` después de 1 sprint de adopción)

## Dependencies & Impact

### Depends on

- `greenhouse_sync.outbox_events` table (existe; agregamos columnas)
- `services/ops-worker/server.ts` Cloud Run service (existe)
- `RELIABILITY_REGISTRY` ([src/lib/reliability/registry.ts](../../src/lib/reliability/registry.ts))
- `captureWithDomain` ([src/lib/observability/capture.ts](../../src/lib/observability/capture.ts))
- Cloud Scheduler API ya configurada (`us-east4`)
- Service account `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` con `roles/run.invoker`

### Blocks / Impacts

- **TASK-771 backfill** (figma-inc, microsoft-inc, notion-inc en BQ providers): drena automáticamente al primer ciclo del nuevo Cloud Scheduler.
- **TASK-772 payment Figma**: el `expense_payment.recorded` event drena → `account_balances` rematerializa → TC Santander Corp rebaja sola.
- **Toda task Finance futura** que toque write paths con projection downstream deja de necesitar verificación manual de side effects en staging.
- **Vercel cron `outbox-publish`** queda deprecated (eliminado de `vercel.json` en slice 4 con feature flag fallback).

### Files owned

- `services/ops-worker/server.ts`
- `services/ops-worker/deploy.sh`
- `services/ops-worker/Dockerfile` (si necesita cambios)
- `src/lib/sync/outbox-consumer.ts`
- `src/lib/reliability/queries/outbox-unpublished-lag.ts` (nuevo)
- `src/lib/reliability/queries/outbox-unpublished-lag.test.ts` (nuevo)
- `src/lib/reliability/get-reliability-overview.ts`
- `src/app/api/cron/outbox-publish/route.ts` (mantener con feature flag fallback)
- `vercel.json` (eliminar entry outbox-publish)
- `migrations/<timestamp>_task-773-outbox-events-state-machine.sql` (nuevo)
- `eslint-plugins/greenhouse/rules/finance-route-requires-e2e-evidence.mjs` (nuevo)
- `eslint.config.mjs` (registrar rule)
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (Delta)
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` (Delta)
- `CLAUDE.md` (sección nueva)

## Current Repo State

### Already exists

- Vercel cron `outbox-publish */5 min` en `vercel.json:11-14`
- Endpoint `/api/cron/outbox-publish` ([src/app/api/cron/outbox-publish/route.ts](../../src/app/api/cron/outbox-publish/route.ts))
- Helper canónico `publishPendingOutboxEvents` ([outbox-consumer.ts:104](../../src/lib/sync/outbox-consumer.ts#L104)) con BQ raw insert + status update
- ops-worker Cloud Run con endpoints `/reactive/process`, `/reactive/process-domain`, `/reactive/recover` ([services/ops-worker/server.ts](../../services/ops-worker/server.ts))
- Cloud Scheduler patrón canónico ya consolidado (`ops-reactive-finance`, `ops-reactive-organization`, etc.) en [services/ops-worker/deploy.sh](../../services/ops-worker/deploy.sh)
- Reliability signal pattern (TASK-765/766/771)
- Outbox events table con `status` text column (default `'pending'`)

### Gap

- Vercel cron NO corre en staging custom environment → outbox events `pending` se acumulan invisibles.
- Sin state machine explícita: `pending` y `failed` se confunden, no hay `publishing` lock para concurrencia, ni `dead_letter` formal.
- Sin reliability signal para "outbox lag".
- Sin E2E gate pre-merge para finance writes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Migration: outbox_events state machine extendida

- `pnpm migrate:create task-773-outbox-events-state-machine`
- Agregar columnas:
  - `publishing_started_at TIMESTAMPTZ` (cuando worker hace SELECT FOR UPDATE)
  - `published_attempts INT DEFAULT 0 NOT NULL`
  - `last_publish_error TEXT`
  - `dead_letter_at TIMESTAMPTZ`
- Status enum extendido (CHECK constraint NOT VALID + VALIDATE atomic):
  - actuales: `pending`, `published`
  - nuevos: `publishing`, `failed`, `dead_letter`
- Index nuevo: `outbox_events_pending_publishing_idx ON (status, occurred_at) WHERE status IN ('pending', 'failed')` para fetch eficiente del worker.
- Backfill defensivo: cualquier row legacy con `status NOT IN (...)` se queda intacta hasta cutover.
- Regenerar `src/types/db.d.ts` via `pnpm migrate:up`.

### Slice 2 — Helper canónico extendido + endpoint ops-worker

- Refactor `publishPendingOutboxEvents` en `src/lib/sync/outbox-consumer.ts`:
  - SELECT FOR UPDATE SKIP LOCKED (concurrencia segura)
  - Marca `status='publishing'` + `publishing_started_at=NOW()` en transición de fetch
  - Si BQ insert OK → `status='published'`, `published_at=NOW()`
  - Si BQ insert falla → `status='failed'` + `published_attempts++` + `last_publish_error=<sanitized>`
  - Si `published_attempts >= 5` → `status='dead_letter'`, `dead_letter_at=NOW()`, captura Sentry via `captureWithDomain(err, 'sync')`
  - Recovery: en próximo ciclo, fetch incluye `failed` (con backoff exponencial implícito por `published_attempts` order)
- Endpoint nuevo `POST /outbox/publish-batch` en `services/ops-worker/server.ts` que llama al helper.
  - Acepta `{batchSize?: number, maxRetries?: number}` body (defaults: 500, 5)
  - Devuelve `{eventsRead, eventsPublished, eventsFailed, eventsDeadLetter, durationMs}`
  - Usa `writeReactiveRunStart/Complete/Failure` para auditabilidad en `source_sync_runs`
- Tests unit del helper extendido (state transitions, dedupe, partial failure, dead-letter).

### Slice 3 — Cloud Scheduler job + service account least-privilege

- Editar `services/ops-worker/deploy.sh`:
  - `upsert_scheduler_job "ops-outbox-publish" "*/2 * * * *" "/outbox/publish-batch" '{"batchSize":500,"maxRetries":5}'`
  - Más frecuente que el Vercel actual (`*/5`) — mejor SLA sin costo significativo (sub-segundo CPU)
- Service account dedicada (reusa `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` que ya tiene `roles/run.invoker`).
- OIDC-authed invocation (Cloud Scheduler default).
- Verificar que el deploy.sh sigue idempotente con el job nuevo.

### Slice 4 — Reliability signal `finance.outbox.unpublished_lag`

- `src/lib/reliability/queries/outbox-unpublished-lag.ts` (patrón TASK-771):
  - Query: `SELECT COUNT(*) FROM greenhouse_sync.outbox_events WHERE status IN ('pending', 'failed') AND occurred_at < NOW() - INTERVAL '10 minutes'`
  - Steady state = 0
  - Severity = 'error' si count > 0
  - Subsystem rollup = 'sync_health' (o crear nuevo si no existe)
- `src/lib/reliability/queries/outbox-dead-letter.ts`:
  - Query: `SELECT COUNT(*) FROM greenhouse_sync.outbox_events WHERE status='dead_letter'`
  - Severity = 'error' si count > 0
- Wire-up en `src/lib/reliability/get-reliability-overview.ts`:
  - Extender `ReliabilityOverviewSources` con `outboxLag?: ReliabilitySignal[] | null`
  - Preload async + injection en `allSignals`
- Module `'sync'` o nuevo `'platform.outbox'` en `RELIABILITY_REGISTRY` (decisión durante implementación).
- Tests unit de los 2 readers (4 tests cada uno: count=0 ok, count>0 error, query throws → unknown, handler param canónico).

### Slice 5 — Cutover Vercel → Cloud Scheduler (zero-downtime)

- **Fase A — Doble publisher (24h)**: Cloud Scheduler nuevo activo + Vercel cron sigue corriendo. Idempotencia por `event_id` + `SELECT FOR UPDATE SKIP LOCKED` evita double-publish.
- **Fase B — Validación staging**: ejecutar `pnpm staging:request POST /api/finance/expenses/[id]/payments` con payload real, verificar que `account_balance` se rematerializa < 5 min sin necesidad de trigger manual del cron.
- **Fase C — Eliminar Vercel cron**: remover entry de `vercel.json`. Mantener endpoint `/api/cron/outbox-publish` activo con feature flag `OUTBOX_PUBLISH_ALLOW_LEGACY` para fallback manual de emergencia.
- **Fase D — Backfill drenaje**: invocar `POST /outbox/publish-batch` manualmente en staging para drenar el backlog acumulado. Idempotente — si Cloud Scheduler ya drenó algunos, no double-publish.

### Slice 6 — E2E pre-merge gate (Endurecimiento 3)

- **Lint rule custom** `eslint-plugins/greenhouse/rules/finance-route-requires-e2e-evidence.mjs`:
  - Detecta archivos modificados en `src/app/api/finance/**/route.ts` con métodos POST/PUT
  - Falla (mode `warn` initial, `error` después de adopción) si NO existe un commit en el mismo branch con tag `[downstream-verified: <flow-name>]` o un test E2E nuevo en `tests/e2e/smoke/finance-*.spec.ts`
  - Mode `warn` durante 1 sprint para adopción gradual
  - Override block para callsites legítimos (e.g. fix de typo, refactor sin business logic)
- **Closing protocol enriquecido** en `CLAUDE.md`:
  - Para tasks que toquen write endpoints Finance, agregar a Verification:
    - "Ejecutar el flow real end-to-end via `pnpm staging:request` o browser"
    - "Verificar al menos 1 nivel downstream (account_balance, projection, UI display)"
    - "Documentar en commit message: `[downstream-verified: <flow-name>]`"
- **Lista canónica de "flujos críticos finance"** documentada en CLAUDE.md sección nueva:
  - Crear supplier → aparece en `/admin/payment-instruments` directory + NO 500
  - Crear expense → aparece en `/finance/expenses` con sortDate correcto
  - Registrar pago → expense status=paid + account_balance refleja cargo + cash-out drawer ya no muestra el doc
  - Anular payment → balance vuelve atrás
- Tests RuleTester de la lint rule (3 cases: detected violation, valid commit message bypass, valid test bypass).

### Slice 7 — Docs + cierre

- `CLAUDE.md` sección "Outbox publisher canónico — Cloud Scheduler, no Vercel" con reglas duras:
  - NUNCA agregar nuevos crons Finance write-then-projection a `vercel.json`
  - SIEMPRE usar Cloud Scheduler + ops-worker para crons que dependen de async path crítico
  - Lista de "flujos críticos finance" + protocol E2E pre-merge
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` Delta:
  - State machine extendida documentada
  - Idempotencia por `event_id` formalizada
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` Delta:
  - 2 nuevos signals documentados
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` §4.9 — agregar `ops-outbox-publish` a la tabla de schedulers ops-worker
- `Handoff.md` cierre con KPI/data diff (TASK-771 backfill drenado, TASK-772 payment Figma rebajado en TC)
- `changelog.md` entry visible

## Out of Scope

- NO migrar otros Vercel crons (sync-conformed, hubspot-companies-sync, etc.) — esta task es solo `outbox-publish`. Una task derivada (TASK-774?) puede seguir el mismo patrón para los demás.
- NO cambiar el contrato `outbox_events.payload_json` ni el schema BQ raw — solo la state machine.
- NO refactorizar `publishOutboxEvent` (writer) — sigue insertando con `status='pending'`.
- NO eliminar el endpoint `/api/cron/outbox-publish` — queda como fallback manual con feature flag.

## Detailed Spec

### State machine canónica (Slice 1)

```
                 ┌──────────────┐
                 │   pending    │  (writer INSERT default)
                 └──────┬───────┘
                        │ SELECT FOR UPDATE SKIP LOCKED
                        ▼
                 ┌──────────────┐
                 │  publishing  │  (worker tomó el lock)
                 └──┬───────┬───┘
            BQ OK   │       │   BQ FAIL
                    ▼       ▼
            ┌───────────┐  ┌─────────┐
            │ published │  │ failed  │  (retries++)
            └───────────┘  └────┬────┘
                                │ retries >= 5
                                ▼
                          ┌─────────────┐
                          │ dead_letter │  (humano interviene)
                          └─────────────┘
```

### Reliability signal canónico (Slice 4)

```typescript
// src/lib/reliability/queries/outbox-unpublished-lag.ts
export const OUTBOX_UNPUBLISHED_LAG_SIGNAL_ID = 'sync.outbox.unpublished_lag'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_sync.outbox_events
  WHERE status IN ('pending', 'failed')
    AND occurred_at < NOW() - INTERVAL '10 minutes'
`

// Steady state = 0
// Severity error si count > 0 → indica que outbox publisher está caído
//                                o que dead-letter está bloqueando el flow
```

### Lint rule pseudocode (Slice 6)

```javascript
// eslint-plugins/greenhouse/rules/finance-route-requires-e2e-evidence.mjs
//
// Detect: archivo en src/app/api/finance/**/route.ts modificado con
//         export async function POST/PUT en el diff
//
// Require: commit message del último commit del branch incluye
//          [downstream-verified: <flow-name>]
//          OR
//          existe en el mismo branch un test nuevo en
//          tests/e2e/smoke/finance-*.spec.ts modificado
//
// Mode: warn (Slice 6) → error (post-adopción 1 sprint, task derivada)
// Override block para callsites legítimos: typo fixes, formatting,
//                                          comments-only changes
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `pnpm migrate:status` muestra migration aplicada
- [ ] `outbox_events.status` CHECK acepta los 5 valores
- [ ] `POST /outbox/publish-batch` (Cloud Run) responde 200 con stats correctos
- [ ] `pnpm staging:request POST /api/finance/expenses/[id]/payments` (registrar pago) → `account_balance` rematerializa en < 5 min sin intervención manual
- [ ] Cloud Scheduler `ops-outbox-publish` corre cada 2 min con HTTP 200
- [ ] `/admin/operations` muestra signal `sync.outbox.unpublished_lag` en steady=0
- [ ] Vercel cron `outbox-publish` eliminado de `vercel.json`
- [ ] Endpoint `/api/cron/outbox-publish` con feature flag `OUTBOX_PUBLISH_ALLOW_LEGACY` activo como fallback
- [ ] Lint rule `greenhouse/finance-route-requires-e2e-evidence` activa en mode `warn`
- [ ] CLAUDE.md sección "Outbox publisher canónico" documentada
- [ ] TASK-771 backfill (figma-inc, microsoft-inc, notion-inc en BQ providers) drenado
- [ ] TASK-772 payment Figma rebajado en TC Santander Corp visible en `/finance/bank`

## Verification

- `pnpm lint` — 0 errors
- `pnpm tsc --noEmit` — clean
- `pnpm test` — full suite verde
- `pnpm pg:doctor` — saludable
- `pnpm migrate:status` — sin pendientes
- `gcloud run services describe ops-worker --region=us-east4` — revision Ready
- `gcloud scheduler jobs describe ops-outbox-publish --location=us-east4` — ENABLED + last run success
- Manual staging: registrar pago dummy → ver TC rebajada en UI < 5 min
- BQ check: `bq query "SELECT COUNT(*) FROM efeonce-group.greenhouse_raw.postgres_outbox_events WHERE event_id = '<exp-pay-figma>'"` → 1

## Closing Protocol

- [ ] `Lifecycle: complete` + mover a `complete/`
- [ ] Sync `README.md` + `TASK_ID_REGISTRY.md`
- [ ] `Handoff.md` cierre con KPI/data diff
- [ ] `changelog.md` entry visible
- [ ] Arch docs con Delta YYYY-MM-DD (EVENT_CATALOG, RELIABILITY_CONTROL_PLANE, CLOUD_INFRASTRUCTURE)
- [ ] CLAUDE.md sección nueva "Outbox publisher canónico" + "Flujos críticos Finance — E2E gate"
- [ ] Chequeo impacto cruzado: TASK-771 + TASK-772 + futuros writes finance ya no requieren manual cron trigger en staging

## Follow-ups

- TASK derivada: aplicar el mismo patrón a otros Vercel crons críticos (`sync-conformed`, `hubspot-companies-sync`, `webhook-dispatch`)
- TASK derivada: promover lint rule de `warn` → `error` después de 1 sprint de adopción
- Considerar si el path de outbox publisher debería tener `circuit_breaker` (TASK-379 patrón) si el dead-letter rate crece

## Open Questions

- **(Q1)** ¿Subsystem rollup del nuevo signal: extender `'sync_health'` existente o crear `'platform.outbox'` nuevo? **DECISIÓN pre-execution**: extender `'sync_health'` (menos fragmentación, mismo dominio operativo).
- **(Q2)** ¿Lint rule debe correr en CI (bloquear PR) o solo local pre-commit? **DECISIÓN pre-execution**: CI bloquea (mode `warn` no rompe pero queda visible en PR review). Mode `error` solo después de 1 sprint de adopción.
- **(Q3)** ¿`maxRetries=5` antes de dead-letter es correcto? **DECISIÓN pre-execution**: SÍ. Cloud Scheduler corre cada 2 min → 10 min de retry total cubre transient BQ failures sin saturar.
- **(Q4)** ¿Eliminar Vercel cron en este task o en task derivada? **DECISIÓN pre-execution**: eliminar en este task (slice 5 fase C) después de 24h con doble publisher activo. Idempotencia garantiza zero-downtime.
