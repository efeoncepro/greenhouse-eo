# TASK-775 — Vercel Cron Async-Critical Migration Platform (absorbe TASK-258 + TASK-259)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Crítico` (cierra clase entera de bugs invisibles staging async)
- Effort: `Alto (9-10h)`
- Type: `infrastructure-platform`
- Epic: `none`
- Status real: `Slices 1-7 completos (drift signal = 0). Slice 8 (verificación E2E + docs + cierre) en curso 2026-05-03.`
- Rank: `TBD`
- Domain: `platform / sync / finance / integrations`
- Blocked by: `none`
- Branch: `develop` (instrucción explícita 2026-05-03 — patrón TASK-771/772/773)
- Legacy ID: `none`
- GitHub Issue: `none`
- Absorbe: TASK-258 (Migrar sync-conformed a ops-worker), TASK-259 (Migrar entra-profile-sync a ops-worker)

## Estado Slices 2026-05-03

- Slice 1 — Helper canónico `wrapCronHandler` + spec `GREENHOUSE_VERCEL_CRON_CLASSIFICATION_V1.md` — ✅ deployed
- Slice 2 — Migra `email-deliverability-monitor` → drift 16 — ✅ deployed
- Slice 3 — Migra 3 nubox crons (balance-sync, sync, quotes-hot-sync) → drift 12 — ✅ deployed
- Slice 4 — Cleanup duplicados (sync-conformed, quotation-lifecycle) → drift 16 — ✅ deployed
- Slice 5 — Reliability signal `platform.cron.staging_drift` + reader + tests + wire-up overview → drift 16 — ✅ deployed
- Slice 6 — CI gate `vercel-cron-async-critical-gate` (warn mode) → drift 16 — ✅ deployed
- Slice 7 — Mass migration 12 crons (webhook, email, entra, hubspot, recovery, recon) → **drift 0** — ✅ deployed
- Slice 8 — Verificación E2E + docs + cierre — 🔄 in-progress

## Summary

Cierre canónico de la clase de bugs "cron async-critical en Vercel" detectada y parcialmente atacada por TASK-771/772/773. Migra **todos** los crons restantes que tocan path async-critical (emisores de outbox + sync conformed + entra profile + identificados nuevos), agrega un **template helper canónico** para futuras migraciones, instala **reliability signal `platform.cron.staging_drift`** que detecta automáticamente cualquier cron Vercel async-critical sin equivalente en Cloud Scheduler, y agrega **lint rule mode error** que bloquea en CI nuevas entradas Vercel cron en paths async-critical (`outbox*`, `sync-*`, `*-publish`, `webhook-dispatch`, etc.). Resultado: la próxima regresión "cron Vercel-only que rompe staging" es **imposible por construcción**.

## Why This Task Exists

**Auditoría completa post-TASK-773 (2026-05-03)**: tras cerrar TASK-773 que migró `outbox-publish` solo, audité `vercel.json` vs Cloud Scheduler y encontré:

### Issues detectados sin task asignada

1. **`/api/cron/email-deliverability-monitor`** — emisor de outbox events que sigue en Vercel. NO funciona en staging (Vercel solo corre crons en producción), por lo tanto los eventos asociados (email delivery health alerts) **no existen en staging para QA**.

2. **`/api/cron/nubox-balance-sync`** — toca tabla `outbox_events` y nunca se ejecuta en staging, dejando balances Nubox stale en `dev-greenhouse.efeoncepro.com`.

3. **Duplicados Vercel + Cloud Scheduler** (ya migrados pero con entrada Vercel huérfana):
   - `ico-materialize` (Vercel 15:10 + Cloud Scheduler `ico-materialize-daily` 03:15)
   - `quotation-lifecycle` (Vercel 10:00 + Cloud Scheduler `ops-quotation-lifecycle` 07:00)

4. **TASK-258 pendiente** (`sync-conformed` + `sync-conformed-recovery`) — Notion conformed pipeline. Crítico para el flujo `delivery_tasks/projects/sprints` PG↔BQ. Sin migrar, staging queda con datos Notion stale tras 24h.

5. **TASK-259 pendiente** (`entra-profile-sync`) — Microsoft Entra avatar + identity link. Cron de 300s timeout en Vercel sin retry; en staging nunca corre, por lo tanto los avatars de equipo nunca se actualizan en QA.

### Bug class arquitectónica

Cualquier nuevo cron infra-critical agregado a `vercel.json` por error — sin equivalente en Cloud Scheduler — vuelve a generar el patrón "funciona en producción, invisible en staging". TASK-773 lo cerró solo para `outbox-publish`. **Sin esta task, la próxima regresión es cuestión de tiempo**.

### Costo de no resolverlo

- Cada cron Vercel async-critical es un mini-incidente Figma esperando ocurrir.
- QA en staging deja de detectar bugs reales — operadores creen que algo funciona porque "el endpoint API responde 200" pero el side effect downstream nunca corre.
- Patrón se reproduce sin freno: cada nueva integration (HubSpot leads, Slack notifications, etc.) cae en la misma trampa.

## Goal

- **Cero crons async-critical en Vercel**: 100% migrados a Cloud Scheduler.
- **Helper canónico de migración**: template `migrateVercelCronToOpsWorker(...)` reutilizable para futuras migraciones (1 línea por cron en `services/ops-worker/deploy.sh`).
- **Reliability signal automático**: `platform.cron.staging_drift` detecta drift entre `vercel.json` async-critical entries y `services/ops-worker/deploy.sh` jobs.
- **Lint rule bloqueante**: `greenhouse/no-vercel-cron-for-async-critical` rechaza en CI cualquier nueva entrada Vercel cron en paths async-critical sin override explícito.
- **Clasificación canónica**: cada cron Vercel restante anotado con su categoría (`prod_only`, `tooling`) en doc adyacente; los `async_critical` no existen post-cutover.
- **Absorbe TASK-258 + TASK-259**: superset estricto, marca ambas complete con nota de absorción.
- **Verificación end-to-end Playwright + Chromium contra staging real** al cierre.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` — playbook reactive
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — catálogo outbox
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — registry de signals
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` §4.9 — Cloud Run ops-worker patrón canónico
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` — pipeline Notion conformed
- `docs/tasks/complete/TASK-773-outbox-publisher-cloud-scheduler-cutover.md` — patrón canónico de migración Vercel → Cloud Scheduler

Reglas obligatorias:

- NO ejecutar BQ DDL en hot path. Bootstrap BQ vive en startup del worker o migration.
- Idempotencia por `event_id` o por job natural key. Coexistencia 24h (doble publisher) en cutover sin riesgo.
- Reliability signal sigue patrón TASK-765/766/771/773 (kind, severity rule, steady=0, reader degrada honestamente).
- Lint rule sigue patrón TASK-766 `no-untokenized-fx-math` (mode `error` desde commit-1, override block para callsites legítimos `prod_only`).
- E2E verificación con Playwright + Chromium + agent auth contra staging real al cierre.
- Helper canónico de migración debe ser idempotente y reusable: `services/ops-worker/deploy.sh` recibe entry templated, no boilerplate copy-paste.

## Normative Docs

- `vercel.json` — fuente actual de crons Vercel
- `services/ops-worker/deploy.sh` — Cloud Scheduler upsert idempotente
- `services/ops-worker/server.ts` — endpoints HTTP del worker
- `eslint-plugins/greenhouse/rules/no-untokenized-fx-math.mjs` — patrón de lint rule canónica
- `src/lib/reliability/queries/outbox-unpublished-lag.ts` — patrón de reader canónico
- `tests/e2e/smoke/finance-cash-out-bank-reflection.spec.ts` — patrón E2E smoke

## Dependencies & Impact

### Depends on

- `services/ops-worker/server.ts` Cloud Run service (existe)
- `services/ops-worker/deploy.sh` (existe + extensible)
- `RELIABILITY_REGISTRY` ([src/lib/reliability/registry.ts](../../src/lib/reliability/registry.ts))
- `captureWithDomain` ([src/lib/observability/capture.ts](../../src/lib/observability/capture.ts)) con dominio `'sync'` ya agregado en TASK-773
- Cloud Scheduler API ya configurada (`us-east4`)
- Service account `greenhouse-portal@efeonce-group.iam.gserviceaccount.com`
- Lint plugin `eslint-plugins/greenhouse/` (existe)

### Blocks / Impacts

- **TASK-258 + TASK-259**: absorbidas por TASK-775 (igual que TASK-262 → TASK-773).
- **Cualquier nuevo cron async-critical** que se agregue a `vercel.json` después de TASK-775 será bloqueado por la lint rule en CI.
- **Dashboard `/admin/operations`** muestra signal nuevo `platform.cron.staging_drift` automáticamente.
- **Staging environment** (`dev-greenhouse.efeoncepro.com`): TODOS los flows async-critical funcionan igual que en producción post-cutover.

### Files owned

- `vercel.json` (eliminar entries async-critical)
- `services/ops-worker/server.ts` (agregar handlers nuevos por cada cron migrado)
- `services/ops-worker/deploy.sh` (agregar Cloud Scheduler jobs)
- `services/ops-worker/migrate-vercel-cron-helper.ts` (NUEVO — template helper)
- `src/lib/reliability/queries/cron-staging-drift.ts` (NUEVO)
- `src/lib/reliability/queries/cron-staging-drift.test.ts` (NUEVO)
- `src/lib/reliability/get-reliability-overview.ts` (wire-up signal)
- `src/lib/reliability/registry.ts` (extender módulo `sync` o crear `platform.crons`)
- `eslint-plugins/greenhouse/rules/no-vercel-cron-for-async-critical.mjs` (NUEVO)
- `eslint-plugins/greenhouse/rules/__tests__/no-vercel-cron-for-async-critical.test.mjs` (NUEVO)
- `eslint.config.mjs` (registrar rule + override block)
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` (Delta clasificación de crons)
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` (Delta signal nuevo)
- `CLAUDE.md` (sección extendida)
- `tests/e2e/smoke/cron-staging-parity.spec.ts` (NUEVO — verifica que /admin/operations muestra signal en steady=0)

## Current Repo State

### Already exists

- TASK-773 patrón canónico: helper `publishPendingOutboxEvents`, endpoint `POST /outbox/publish-batch`, Cloud Scheduler `ops-outbox-publish`, reliability signals `sync.outbox.unpublished_lag` + `dead_letter`, lint rule `no-untokenized-fx-math` template.
- Cloud Scheduler infra ya consolidada: 24+ jobs ops-worker corriendo correctamente.
- Cross-task contamination resuelta (mocks vi.mock con `onGreenhousePostgresReset`).

### Gap

- 2 emisores de outbox aún en Vercel cron sin migrar (`email-deliverability-monitor`, `nubox-balance-sync`).
- 2 duplicados Vercel + Cloud Scheduler (`ico-materialize`, `quotation-lifecycle`).
- TASK-258 (sync-conformed) + TASK-259 (entra-profile-sync) pendientes con scope estrecho — sin endurecimientos sistémicos.
- Sin reliability signal de drift entre Vercel cron y Cloud Scheduler.
- Sin lint rule que bloquee nuevas entradas Vercel cron async-critical.
- Sin clasificación canónica `prod_only` / `async_critical` / `tooling` documentada.

### Inventario completo de Vercel cron post-TASK-773 (audit 2026-05-03)

| Cron path | Categoría propuesta | Acción TASK-775 |
|---|---|---|
| `outbox-publish` | (eliminado) | ✅ TASK-773 |
| `outbox-react*` (7 crons) | (eliminado) | ✅ TASK-254 |
| `email-deliverability-monitor` | `async_critical` (emisor outbox) | **Migrar** Slice 2 |
| `nubox-balance-sync` | `async_critical` (toca outbox) | **Migrar** Slice 3 |
| `ico-materialize` | duplicado | **Eliminar Vercel** (ya hay `ico-materialize-daily` Cloud Scheduler) Slice 4 |
| `quotation-lifecycle` | duplicado | **Eliminar Vercel** (ya hay `ops-quotation-lifecycle` Cloud Scheduler) Slice 4 |
| `sync-conformed` + `sync-conformed-recovery` | `async_critical` (Notion pipeline) | **Migrar** Slice 7 (absorbe TASK-258) |
| `entra-profile-sync` | `async_critical` (avatars + identity) | **Migrar** Slice 7 (absorbe TASK-259) |
| `entra-webhook-renew` | `async_critical` (Microsoft webhook subscriptions expiran) | **Migrar** Slice 7 |
| `webhook-dispatch` | `async_critical` (outbound webhooks) | **Migrar** Slice 7 |
| `email-delivery-retry` | `async_critical` (retry envíos fallidos) | **Migrar** Slice 7 |
| `hubspot-companies-sync` (x2) | `async_critical` (CRM sync) | **Migrar** Slice 7 |
| `hubspot-deals-sync` | `async_critical` | **Migrar** Slice 7 |
| `hubspot-products-sync` | `async_critical` | **Migrar** Slice 7 |
| `hubspot-quotes-sync` | `async_critical` | **Migrar** Slice 7 |
| `hubspot-company-lifecycle-sync` | `async_critical` | **Migrar** Slice 7 |
| `nubox-sync` | `async_critical` (financials sync) | **Migrar** Slice 7 |
| `nubox-quotes-hot-sync` | `async_critical` | **Migrar** Slice 7 |
| `reconciliation-auto-match` | `async_critical` (finance ops) | **Migrar** Slice 7 |
| `reliability-synthetic` | `tooling` (synthetic monitor) | Mantener Vercel — anotar como `tooling` |
| `email-data-retention` | `prod_only` (limpieza GDPR semanal) | Mantener Vercel — anotar como `prod_only` |
| `economic-indicators/sync` (finance) | `tooling` | Mantener Vercel — anotar como `tooling` |
| `notion-delivery-data-quality` | `tooling` (data quality probes) | Mantener Vercel — anotar como `tooling` |
| `sync-previred` | `prod_only` (Chile previred sync) | Mantener Vercel — anotar como `prod_only` |
| `ico-member-sync` | `tooling` | Mantener Vercel — anotar como `tooling` |
| `fx-sync-latam` (x3 windows) | `prod_only` (FX rates externos) | Mantener Vercel — anotar como `prod_only` |

**Resumen**: ~15 migrar + 2 duplicados eliminar + ~9 mantener anotados (Vercel legítimo).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Helper canónico de migración + clasificación

- Crear `services/ops-worker/migrate-vercel-cron-helper.ts` con template:
  ```typescript
  // Pseudocode
  export interface MigrateVercelCronOptions {
    name: string                 // 'ops-email-deliverability-monitor'
    schedule: string             // '0 */6 * * *'
    handler: () => Promise<unknown>  // re-uses existing Vercel handler logic
    domain: 'sync' | 'integrations.hubspot' | 'integrations.entra' | 'finance' | 'identity'
  }
  ```
- Documento `docs/architecture/GREENHOUSE_VERCEL_CRON_CLASSIFICATION_V1.md` (NUEVO):
  - 3 categorías canónicas: `async_critical`, `prod_only`, `tooling`
  - Tabla con cada cron Vercel actual + su categoría justificada
  - Decisión tree: nuevo cron → categorízalo
- Mocks/tests para el helper.

### Slice 2 — Migrar `email-deliverability-monitor`

- Endpoint nuevo en ops-worker: `POST /email/deliverability-monitor`
- Cloud Scheduler job `ops-email-deliverability-monitor` con cron `0 */6 * * *` (mismo schedule actual)
- Mantener endpoint Vercel `/api/cron/email-deliverability-monitor` activo como fallback con feature flag
- Cutover: eliminar entry de `vercel.json` después de 24h doble-publisher
- Verificación: outbox events generados en staging (no solo prod) + dashboard `/admin/operations` muestra correlations

### Slice 3 — Migrar `nubox-balance-sync`

- Endpoint nuevo `POST /nubox/balance-sync` en ops-worker
- Cloud Scheduler job `ops-nubox-balance-sync` con cron `0 */4 * * *`
- Cutover idem Slice 2
- Verificación: balances Nubox actualizándose en staging vía `pnpm staging:request /api/finance/nubox/balances`

### Slice 4 — Eliminar duplicados (cleanup quirúrgico)

- Eliminar de `vercel.json`:
  - `/api/cron/ico-materialize` (duplicado de Cloud Scheduler `ico-materialize-daily`)
  - `/api/cron/quotation-lifecycle` (duplicado de Cloud Scheduler `ops-quotation-lifecycle`)
- Verificar que Cloud Scheduler equivalents siguen ENABLED después de cutover
- Mantener endpoints `/api/cron/*` activos como fallback manual

### Slice 5 — Reliability signal `platform.cron.staging_drift`

- `src/lib/reliability/queries/cron-staging-drift.ts`:
  - Reader que parsea `vercel.json` (parsed at server-startup; cached en memoria) y compara contra snapshot estático de async-critical jobs Cloud Scheduler.
  - Detecta:
    - Crons `async_critical` en Vercel sin equivalente Cloud Scheduler
    - Crons Cloud Scheduler sin equivalente Vercel (cleanup pendiente)
    - Cambios de schedule entre los 2
  - Steady state = 0
  - Severity = 'error' si count > 0
- Wire-up en `get-reliability-overview.ts` con preload async
- Tests unit del reader (4 paths: steady, drift detected, cleanup pending, query throws)

### Slice 6 — Lint rule `greenhouse/no-vercel-cron-for-async-critical`

- `eslint-plugins/greenhouse/rules/no-vercel-cron-for-async-critical.mjs`:
  - Detecta modificaciones a `vercel.json` que agregan entradas en `crons[]` con `path` matching patterns canónicos:
    - `/api/cron/outbox*`
    - `/api/cron/sync-*`
    - `/api/cron/*-publish`
    - `/api/cron/webhook-*`
    - `/api/cron/*-monitor` (ya tocan outbox)
    - `/api/cron/hubspot-*`
    - `/api/cron/entra-*`
    - `/api/cron/nubox-*`
  - Mode `error` desde commit-1
  - Override block: comentario `// platform-cron-allowed: <reason>` adyacente para casos legítimos
- Tests RuleTester (5 cases: detected outbox*, detected sync-*, accepted prod_only via override, accepted unrelated path, malformed JSON)
- Registrar en `eslint.config.mjs`

### Slice 7 — Migración masiva (absorbe TASK-258 + TASK-259)

Para cada cron `async_critical` en la tabla del Inventario:

- Endpoint nuevo en ops-worker (handler reusa lógica existente)
- Cloud Scheduler job con mismo schedule
- Doble publisher 24h
- Eliminar entry de `vercel.json`

Crons a migrar (15 total):
- `sync-conformed` + `sync-conformed-recovery` (TASK-258)
- `entra-profile-sync` + `entra-webhook-renew` (TASK-259 + extra)
- `hubspot-companies-sync` (x2 schedules), `hubspot-deals-sync`, `hubspot-products-sync`, `hubspot-quotes-sync`, `hubspot-company-lifecycle-sync`
- `nubox-sync`, `nubox-quotes-hot-sync`
- `webhook-dispatch`
- `email-delivery-retry`
- `reconciliation-auto-match`

**Marcar TASK-258 y TASK-259 complete** con nota de absorción (igual que TASK-262 → TASK-773).

### Slice 8 — Docs canónicas + verificación E2E + cierre

- `CLAUDE.md` sección extendida "Vercel cron classification + migration platform (TASK-775)":
  - 3 categorías con decision tree
  - Patrón canónico de migración (template + steps)
  - Reglas duras anti-regresión
  - Lista canónica de crons + categoría
- `docs/architecture/GREENHOUSE_VERCEL_CRON_CLASSIFICATION_V1.md` (creado en Slice 1) — actualización final
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` Delta con signal nuevo
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` §4.9 Delta con tabla extendida de scheduler jobs
- changelog.md entry visible
- Handoff.md cierre con KPI/data diff
- **Verificación end-to-end con Playwright + Chromium + agent auth** contra staging:
  - `tests/e2e/smoke/cron-staging-parity.spec.ts` (NUEVO): verifica que `/admin/operations` muestra `platform.cron.staging_drift = 0`
  - Manual verification: `pnpm staging:request '/api/admin/reliability/overview'` muestra signals nuevos en steady
- Closing protocol completo

## Out of Scope

- NO migrar crons `prod_only` o `tooling` (se anotan pero quedan en Vercel).
- NO refactorizar la lógica interna de cada cron migrado (slice 7) — reusar handler existente.
- NO cambiar el schema de `outbox_events` ni `source_sync_runs` (TASK-773 ya cubrió eso).
- NO crear un sistema de auto-detección de "categoría" de cron — clasificación es manual y documentada.

## Detailed Spec

### Patrón canónico de migración (Slice 7 reusa este pattern)

```typescript
// services/ops-worker/server.ts
const handle<NewName> = async (req: IncomingMessage, res: ServerResponse) => {
  const body = await readBody(req)

  console.log(`[ops-worker] POST /<path> — ...`)

  try {
    const result = await <existing-handler-from-vercel-route>(body)

    json(res, 200, { ok: true, ...result })
  } catch (error) {
    captureWithDomain(error, '<domain>', { tags: { source: 'ops_worker_<name>' } })
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error(`[ops-worker] /<path> failed:`, message)
    json(res, 502, { error: message })
  }
}

// dispatcher
if (method === 'POST' && path === '/<path>') {
  await handle<NewName>(req, res)
  return
}
```

```bash
# services/ops-worker/deploy.sh
upsert_scheduler_job \
  "ops-<name>" \
  "<cron>" \
  "/<path>" \
  '<body>'
echo "  -> ops-<name>: <cron> (<purpose>, TASK-775)"
```

### Reliability signal canónico (Slice 5)

```typescript
// src/lib/reliability/queries/cron-staging-drift.ts
export const PLATFORM_CRON_STAGING_DRIFT_SIGNAL_ID = 'platform.cron.staging_drift'

const ASYNC_CRITICAL_PATTERNS = [
  /^outbox-/,
  /^sync-/,
  /-publish$/,
  /^webhook-/,
  /^hubspot-/,
  /^entra-/,
  /^nubox-/,
  /-monitor$/
]

const KNOWN_CLOUD_SCHEDULER_JOBS = new Set([
  'ops-outbox-publish',
  'ops-email-deliverability-monitor',
  // ... etc, generated from deploy.sh
])

// Reader cuenta Vercel cron paths que matchean async-critical pero no
// tienen entry en KNOWN_CLOUD_SCHEDULER_JOBS. Steady = 0.
```

### Lint rule canónica (Slice 6)

```javascript
// eslint-plugins/greenhouse/rules/no-vercel-cron-for-async-critical.mjs
//
// Bloquea nuevas entradas Vercel cron en paths async-critical.
// Si necesitas legítimamente Vercel cron para algo prod_only, agrega
// comentario: // platform-cron-allowed: <reason> en la entrada del crons[]
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Helper canónico `migrateVercelCronToOpsWorker(...)` creado y documentado
- [ ] 15 crons async-critical migrados a Cloud Scheduler (incluye TASK-258 + TASK-259 absorbidas)
- [ ] 2 duplicados eliminados de `vercel.json` (ico-materialize, quotation-lifecycle)
- [ ] Reliability signal `platform.cron.staging_drift` activo en `/admin/operations` con steady=0
- [ ] Lint rule `greenhouse/no-vercel-cron-for-async-critical` mode `error` activa
- [ ] Doc `GREENHOUSE_VERCEL_CRON_CLASSIFICATION_V1.md` con tabla canónica
- [ ] CLAUDE.md sección extendida con clasificación + patrón
- [ ] TASK-258 + TASK-259 marcadas complete con nota de absorción
- [ ] E2E Playwright + Chromium contra staging real → verde
- [ ] `pnpm staging:request /api/admin/reliability/overview` muestra `platform.cron.staging_drift=0`
- [ ] `gcloud scheduler jobs list` muestra todos los jobs nuevos ENABLED
- [ ] Side effect verificable en staging: outbox events de `email-deliverability-monitor` visibles en `outbox_events` table
- [ ] Side effect verificable: balances Nubox actualizan en `dev-greenhouse.efeoncepro.com`

## Verification

- `pnpm lint` — 0 errors
- `pnpm tsc --noEmit` — clean
- `pnpm test` — full suite verde
- `pnpm pg:doctor` — saludable
- `pnpm finance:e2e-gate` — skip (no finance routes touched)
- Build: `pnpm build` clean
- `gcloud scheduler jobs describe ops-<each-new-job> --location=us-east4` — todos ENABLED
- Manual verification: para cada cron migrado, ejecutar `gcloud scheduler jobs run ops-<name>` y verificar HTTP 200 en logs
- BQ verification: `bq query "SELECT COUNT(*) FROM efeonce-group.greenhouse_raw.postgres_outbox_events WHERE publish_run_id LIKE 'outbox-%'"` muestra crecimiento normal post-cutover

## Closing Protocol

- [ ] `Lifecycle: complete` + mover a `complete/`
- [ ] Sync `README.md` + `TASK_ID_REGISTRY.md`
- [ ] `Handoff.md` cierre con KPI/data diff (15 crons migrados, 2 duplicados eliminados, signal en steady=0)
- [ ] `changelog.md` entry visible
- [ ] Arch docs con Delta YYYY-MM-DD (`CLOUD_INFRASTRUCTURE` + `RELIABILITY_CONTROL_PLANE` + nuevo `VERCEL_CRON_CLASSIFICATION_V1`)
- [ ] CLAUDE.md sección extendida
- [ ] TASK-258 + TASK-259 marcadas `complete` con nota de absorción (mover a `complete/`, sync registry)
- [ ] Chequeo impacto cruzado: cualquier task que mencione crons Vercel debe revisarse
- [ ] PR creado con summary canónico
- [ ] Post-merge: verificación E2E real + signal en steady

## Follow-ups

- Si emerge necesidad de auto-detección de drift Vercel↔Cloud Scheduler en runtime (no solo via signal), considerar migrar el snapshot estático a query dinámica via gcloud API.
- Considerar promover lint rule a CI step bloqueante (require-passing en GitHub Actions) tras 1 sprint de adopción sin override usados de forma frívola.
- Cuando emerjan integraciones nuevas (Slack, Linear, etc.) que requieran crons, este patrón los absorbe sin task adicional.

## Open Questions

Resueltas pre-execution:

- **(Q1) ¿Helper canónico vive en services/ops-worker o en src/lib?** → `services/ops-worker/migrate-vercel-cron-helper.ts`. Pertenece al worker porque su único consumer es `deploy.sh`.

- **(Q2) ¿La lint rule debe leer el `vercel.json` real o pattern-match el path string?** → Pattern-match el path string. Más simple, no requiere parser JSON, funciona en pre-commit hook si se necesita.

- **(Q3) ¿`platform.cron.staging_drift` lee Cloud Scheduler dinámicamente o snapshot estático?** → Snapshot estático embebido en el reader (`KNOWN_CLOUD_SCHEDULER_JOBS` Set). Razón: el reader corre en cada hit de `/admin/operations` y `/admin/reliability/overview`; gcloud API call por hit es caro y agrega failure surface. Cuando se agregue/quite un job a `deploy.sh`, también se actualiza el set en el reader (1 archivo de cambio coordinado).

- **(Q4) ¿Mantener endpoints Vercel `/api/cron/*` activos como fallback manual?** → Sí, igual que TASK-773 mantuvo `/api/cron/outbox-publish`. Permite trigger manual de emergencia + zero-downtime cutover.

- **(Q5) ¿Doble publisher 24h en cada slice o solo en los críticos (sync-conformed, hubspot)?** → 24h en TODOS los slices del 2 al 7. Costo es nulo (idempotencia por job natural key) y la garantía de zero-downtime es uniforme.
