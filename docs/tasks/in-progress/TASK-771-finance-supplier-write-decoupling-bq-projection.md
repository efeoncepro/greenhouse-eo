# TASK-771 — Finance Supplier Write Decoupling + BQ Projection vía Outbox

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Implementación`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `develop` (instrucción explícita 2026-05-03 — no crear branch dedicado)
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Desacoplar la creación/edición de proveedores en `/api/finance/suppliers` de la sincronización a BigQuery. Hoy el endpoint comitea en PG y luego ejecuta `syncProviderFromFinanceSupplier` (MERGE BQ + DDL BQ + UPDATE BQ) sin try/catch; cualquier falla BQ devuelve 500 al cliente aunque el supplier YA esté creado en PG. Resultado en producción: `figma-inc` (2026-05-03), `microsoft-inc` (2026-03-15), `notion-inc` (2026-03-15) quedaron silenciosamente persistidos sin que el operador lo supiera, y la UI muestra `Error al crear proveedor` con cero detalle.

La solución mueve el sync BQ a un consumer reactivo del outbox (`provider.upserted`, ya emitido), elimina la llamada inline, y agrega reliability signal para detectar drift PG↔BQ.

## Why This Task Exists

El commit `999d4a9b feat: close finance bigquery write cutover` introdujo `isFinanceBigQueryWriteEnabled()` y guardó la mayoría de paths Finance bajo el contrato PG-first. Pero `syncProviderFromFinanceSupplier` ([src/lib/providers/canonical.ts:72-159](../../src/lib/providers/canonical.ts#L72-L159)) quedó huérfano del cutover: se ejecuta UNCONDICIONALMENTE en [src/app/api/finance/suppliers/route.ts:353](../../src/app/api/finance/suppliers/route.ts#L353), sin guard, sin try/catch, sin fallback. El test `bigquery-write-cutover.test.ts:60-62` lo mockea siempre OK, ocultando el problema.

Causa inmediata del incidente actual: en staging la llamada BQ throw-ea (probablemente ADC sin permisos `bigquery.tables.create` en `efeonce-group`, o schema mismatch del MERGE contra `greenhouse.providers`). El catch externo del route ([route.ts:367-373](../../src/app/api/finance/suppliers/route.ts#L367-L373)) solo maneja `FinanceValidationError`; cualquier otro error se relanza como 500.

Causa arquitectónica: violación del playbook de proyecciones reactivas (`GREENHOUSE_REACTIVO_PROJECTIONS_PLAYBOOK_V1.md`). El outbox event `provider.upserted` YA se emite dentro de la tx PG ([src/lib/providers/postgres.ts:166-185](../../src/lib/providers/postgres.ts#L166-L185)) — pero su consumer canónico no existe; en lugar de eso se hace la proyección BQ inline en hot path del request.

Costo de no resolverlo: cada flujo Finance que toca proveedores (creación, edición, sync HubSpot, sync Nubox) tiene esta misma fragilidad. Cualquier caída/permiso/schema-drift de BQ rompe el endpoint aunque PG esté sano. Además, futuras proyecciones (Snowflake, search index, AI tooling) seguirían el mismo anti-patrón si no se canoniza el path reactivo ahora.

## Goal

- POST/PUT `/api/finance/suppliers` y `/api/finance/suppliers/[id]` responden 201/200 cuando PG commitea, independiente del estado de BQ.
- La proyección BQ (`greenhouse.providers` MERGE + `greenhouse.fin_suppliers` UPDATE) corre en `ops-worker` como consumer reactivo de `provider.upserted`, con retry exponencial, dead-letter después de N intentos, y backfill drenable.
- `ensureFinanceInfrastructure()` y `ensureAiToolingInfrastructure()` salen del request path; el bootstrap de infra BQ vive en migrations o en startup del worker.
- Reliability signal canónico `finance.providers.bq_sync_drift` detecta automáticamente eventos `provider.upserted` con status `dead_letter` o `pending` con edad > umbral.
- Backfill de los 3 suppliers ya creados (`figma-inc`, `microsoft-inc`, `notion-inc`) drena a BQ vía worker sin recreación manual.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` — playbook canónico de proyecciones reactivas + recovery
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — catálogo outbox; el evento `provider.upserted` ya está documentado
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` — contrato Finance dual-store, outbox, reactive projections
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — registry de módulos, signals, severity rollup
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` §4.9 — Cloud Run ops-worker (donde vivirá el consumer)

Reglas obligatorias:

- NO ejecutar DDL BQ desde request hot path. `ensureFinanceInfrastructure` queda permitido solo en bootstrap del worker o en migration explícita.
- NO levantar 5xx desde un endpoint cuando la primary store (PG) commiteó. El response refleja el estado canónico (PG); las proyecciones secundarias son eventually consistent.
- NUNCA emitir un outbox event fuera de la tx PG que cambia el agregado. La emisión actual en `upsertProviderFromFinanceSupplierInPostgres` ya cumple esto — preservarlo.
- Usar `captureWithDomain(err, 'finance', { extra: { stage, supplierId, providerId } })` para cualquier error en el path. Nunca `Sentry.captureException()` directo.
- El consumer reactivo debe ser idempotente. MERGE BQ por `provider_id` lo es naturalmente. El handler debe poder re-procesar el mismo event sin efectos colaterales.

## Normative Docs

- [docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md](../architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md)
- [docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md](../architecture/GREENHOUSE_EVENT_CATALOG_V1.md)
- [docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md](../architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md)
- [services/ops-worker/](../../services/ops-worker/) — patrón canónico de consumers reactivos

## Dependencies & Impact

### Depends on

- `greenhouse_sync.outbox_events` (existe)
- `greenhouse_core.providers`, `greenhouse_finance.suppliers` (existen)
- `provider.upserted` event ya emitido por `upsertProviderFromFinanceSupplierInPostgres` ([src/lib/providers/postgres.ts:166](../../src/lib/providers/postgres.ts#L166)) — preservar contrato
- `ops-worker` Cloud Run service (existe, [services/ops-worker/](../../services/ops-worker/))
- `RELIABILITY_REGISTRY` ([src/lib/reliability/](../../src/lib/reliability/)) — extender con módulo nuevo
- `captureWithDomain` ([src/lib/observability/capture.ts](../../src/lib/observability/capture.ts))

### Blocks / Impacts

- TASK-013 (Nubox Finance Reconciliation Bridge) — bridge HubSpot/Nubox crea suppliers; este fix desbloquea creación silenciosa
- TASK-706 (HubSpot inbound webhook companies + contacts) — sync de HubSpot puede crear suppliers; mismo path roto
- TASK-478 (tool-provider cost basis snapshots) — depende de FK a `greenhouse_finance.suppliers`; afectado si crear supplier falla

### Files owned

- `src/app/api/finance/suppliers/route.ts` (POST handler)
- `src/app/api/finance/suppliers/[id]/route.ts` (PUT handler — verificar mismo anti-patrón)
- `src/lib/providers/canonical.ts` (mover función o eliminar)
- `src/lib/providers/postgres.ts` (preservar emisión outbox)
- `services/ops-worker/server.ts` + handler nuevo
- `src/lib/reliability/registry.ts` (extender con `finance.providers.bq_sync_drift`)
- `src/app/api/finance/bigquery-write-cutover.test.ts` (actualizar mocks o eliminar mock obsoleto)
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (si emerge contrato `v2` del event)
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` (Delta del cambio)

## Current Repo State

### Already exists

- Outbox publisher canónico: `publishOutboxEvent` ([src/lib/sync/publish-event.ts:41](../../src/lib/sync/publish-event.ts#L41))
- Emisión `provider.upserted` dentro de tx PG: [src/lib/providers/postgres.ts:166](../../src/lib/providers/postgres.ts#L166)
- PG-first write path en supplier POST: [src/app/api/finance/suppliers/route.ts:246-288](../../src/app/api/finance/suppliers/route.ts#L246-L288)
- Cloud Run ops-worker con crons reactivos: [services/ops-worker/server.ts](../../services/ops-worker/server.ts)
- Reliability registry: [src/lib/reliability/](../../src/lib/reliability/)
- BQ write flag: `isFinanceBigQueryWriteEnabled()` ([src/lib/finance/bigquery-write-flag.ts](../../src/lib/finance/bigquery-write-flag.ts))
- 3 suppliers afectados ya en PG (`figma-inc`, `microsoft-inc`, `notion-inc`) con outbox event `provider.upserted` emitido — ready para drenaje del worker

### Gap

- Sin consumer reactivo para `provider.upserted` → outbox events se acumulan sin proyectar a BQ
- `syncProviderFromFinanceSupplier` corre inline en POST/PUT request path sin guard ni try/catch
- `ensureFinanceInfrastructure` ejecuta DDL BQ en hot path
- El catch externo del route ([route.ts:367](../../src/app/api/finance/suppliers/route.ts#L367)) solo maneja `FinanceValidationError`; cualquier otro error → 500 opaco
- UI ([src/views/greenhouse/finance/drawers/CreateSupplierDrawer.tsx:169](../../src/views/greenhouse/finance/drawers/CreateSupplierDrawer.tsx#L169)) muestra mensaje genérico que oculta la causa real
- Sin reliability signal que detecte drift PG↔BQ
- Test `bigquery-write-cutover.test.ts` mockea `syncProviderFromFinanceSupplier` siempre OK → masking del bug

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar al crear)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Desbloqueo inmediato (HOTFIX, mergeable solo)

- En `src/app/api/finance/suppliers/route.ts:353-360`: envolver `syncProviderFromFinanceSupplier(...)` en try/catch.
- En el catch: `captureWithDomain(err, 'finance', { extra: { stage: 'sync_provider_bq_legacy', supplierId, providerId: normalizedProviderId } })` y continuar.
- El response retorna 201 con `supplierId` + `providerId` derivados de PG (no del syncResult).
- Mismo tratamiento en `PUT /api/finance/suppliers/[id]/route.ts` si tiene el mismo patrón (auditarlo).
- Test unitario: simular throw de `syncProviderFromFinanceSupplier` → esperar 201 + log Sentry.
- Verificar manualmente en staging que crear proveedor (Figma/Adobe/cualquiera) responde 201 y aparece en la lista sin recargar.

### Slice 2 — Consumer reactivo `provider.upserted` en ops-worker

- Endpoint nuevo en `services/ops-worker/server.ts`: `POST /providers/sync-bq` (también puede colgar de `/reactive/process` si hay un dispatcher genérico).
- Handler que lee batch de `outbox_events WHERE event_type = 'provider.upserted' AND status = 'pending'`, procesa con MERGE BQ idempotente, marca `status='processed'` o `status='dead_letter'` después de N retries (usar el patrón ya canónico del worker).
- Cloud Scheduler job nuevo: `ops-providers-sync-bq @ */5 * * * * America/Santiago` (alineado con `ops-reactive-process`).
- Idempotency: el MERGE BQ ya es idempotente por `provider_id`; el handler debe deduplicar dentro del batch antes de hacer la llamada BQ.
- Logging: emitir `source_sync_runs` con `source_system='reactive_provider_bq_sync'` para visibilidad en Admin > Ops Health.
- DDL BQ inicial (datasets/tablas): se mueve al startup del worker o a migration BQ explícita. NO ejecutar `ensureFinanceInfrastructure` en cada request.

### Slice 3 — Limpieza del request path

- Eliminar la llamada a `syncProviderFromFinanceSupplier` del POST y PUT supplier routes (ya no es necesaria post-Slice 2).
- El response usa `normalizedProviderId` derivado en PG, no `syncResult.providerId`.
- Marcar `syncProviderFromFinanceSupplier` como `@deprecated` o eliminar si nadie más la consume (verificar `grep`).
- Eliminar mock obsoleto en `src/app/api/finance/bigquery-write-cutover.test.ts:60-62` y agregar test de regresión: BQ down → POST suplier sigue 201.
- Lint rule opcional (si emerge patrón): bloquear imports de `bigquery` desde `src/app/api/finance/**/route.ts`.

### Slice 4 — Reliability signal `finance.providers.bq_sync_drift`

- Registrar módulo en `RELIABILITY_REGISTRY` con `incidentDomainTag='finance'`, kind=`drift`, severity=`error` si count > 0, steady=0.
- Query: `SELECT COUNT(*) FROM greenhouse_sync.outbox_events WHERE event_type='provider.upserted' AND (status='dead_letter' OR (status='pending' AND occurred_at < NOW() - INTERVAL '30 minutes'))`
- Subsystem rollup: `Finance Data Quality`.
- UI: visible en `/admin/operations` como signal automática.
- Doc en `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` Delta + entry en CLAUDE.md sección Finance.

### Slice 5 — Backfill de suppliers huérfanos

- Detectar suppliers en PG con outbox `provider.upserted` event aún `pending` o nunca procesado: `figma-inc`, `microsoft-inc`, `notion-inc` (al menos).
- Drenar vía Slice 2 worker en su primer run automático (idempotente — si ya estaban en BQ por algún sync histórico, MERGE no rompe).
- Script de verificación: `pnpm tsx scripts/finance/verify-provider-bq-sync.ts` (ad-hoc, NO se commitea como cron) que compare counts PG vs BQ y reporte gaps.
- Verificar que los 3 suppliers aparecen en `greenhouse.providers` BQ con `provider_kind='organization'` y `provider_category='financial_vendor'` (contrato actual).

## Out of Scope

- Refactor general del módulo Finance — esta task es quirúrgica, solo el path supplier/provider sync.
- Cambios al schema de `greenhouse_finance.suppliers` o `greenhouse_core.providers` — el fix es comportamental, no estructural.
- Migración del MERGE BQ a otra tecnología (Snowflake, etc.) — la decisión de `BQ as projection store` se mantiene.
- Eliminación de BQ Finance datasets — task separada cuando se cierre TASK-769 (Cloud Cost Intelligence) y se decida el fate de `greenhouse.fin_*`.
- Cambios al UI del drawer `CreateSupplierDrawer` más allá de leer el response 201 nuevo. La mejora UX (mostrar errores estructurados, status BQ, etc.) es task derivada.

## Detailed Spec

### Patrón de outbox consumer (referencia: cron reactivo del worker)

```ts
// services/ops-worker/handlers/provider-bq-sync.ts (nuevo)
export async function processProviderUpsertedBatch({ batchSize = 50 }) {
  const events = await fetchPendingEvents({
    eventType: 'provider.upserted',
    limit: batchSize,
    maxRetries: 5
  })

  if (events.length === 0) return { processed: 0, deadLettered: 0 }

  // Dedup por provider_id (mismo provider puede tener N events en el batch)
  const uniqueProviders = new Map<string, ProviderUpsertedPayload>()
  for (const event of events) uniqueProviders.set(event.payload.providerId, event.payload)

  let processed = 0, deadLettered = 0
  for (const payload of uniqueProviders.values()) {
    try {
      await syncProviderToBigQuery(payload)
      await markEventsProcessed(events.filter(e => e.payload.providerId === payload.providerId))
      processed++
    } catch (err) {
      captureWithDomain(err, 'finance', {
        extra: { stage: 'provider_bq_sync_worker', providerId: payload.providerId }
      })
      await incrementEventRetries(events.filter(e => e.payload.providerId === payload.providerId))
      // Auto-dead-letter al hit max retries
    }
  }
  return { processed, deadLettered }
}
```

### Cambio mínimo en route handler (Slice 1 — hotfix)

```ts
// src/app/api/finance/suppliers/route.ts:353
let syncResult: { providerId: string; providerName: string } | null = null
try {
  syncResult = await syncProviderFromFinanceSupplier({
    supplierId,
    providerId: normalizedProviderId || null,
    legalName,
    tradeName: body.tradeName ? normalizeString(body.tradeName) : null,
    website: body.website ? normalizeString(body.website) : null,
    isActive: true
  })
} catch (err) {
  captureWithDomain(err, 'finance', {
    extra: { stage: 'sync_provider_bq_legacy', supplierId, providerId: normalizedProviderId }
  })
  // Continue: PG already committed, BQ projection is eventually consistent via outbox
}

return NextResponse.json({
  supplierId,
  providerId: syncResult?.providerId ?? normalizedProviderId ?? null,
  created: true
}, { status: 201 })
```

### Reliability signal definition (Slice 4)

```ts
// src/lib/reliability/registry.ts (extender)
{
  moduleId: 'finance.providers.bq_sync',
  displayName: 'Finance Provider BQ Sync',
  subsystem: 'finance_data_quality',
  incidentDomainTag: 'finance',
  expectedSignalKinds: ['drift', 'incident'],
  signals: [
    {
      signalId: 'bq_sync_drift',
      kind: 'drift',
      severity: (count) => count > 0 ? 'error' : 'ok',
      steadyState: 0,
      query: `
        SELECT COUNT(*)::int AS value
        FROM greenhouse_sync.outbox_events
        WHERE event_type = 'provider.upserted'
          AND (
            status = 'dead_letter'
            OR (status = 'pending' AND occurred_at < NOW() - INTERVAL '30 minutes')
          )
      `,
      description: 'Provider upserts no proyectados a BQ (dead-lettered o aged-pending > 30min)'
    }
  ]
}
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] POST `/api/finance/suppliers` devuelve 201 cuando PG commitea, incluso si BQ falla (verificado simulando throw + en staging real)
- [ ] PUT `/api/finance/suppliers/[id]` mismo comportamiento
- [ ] Crear "Figma, Inc" desde el drawer en staging muestra el supplier en la lista sin error visible
- [ ] Outbox events `provider.upserted` se procesan automáticamente cada 5 min vía Cloud Scheduler
- [ ] BQ tablas `greenhouse.providers` y `greenhouse.fin_suppliers` reflejan los 3 suppliers backfilled (`figma-inc`, `microsoft-inc`, `notion-inc`)
- [ ] Reliability signal `finance.providers.bq_sync_drift` aparece en `/admin/operations` con value 0 después del backfill
- [ ] `syncProviderFromFinanceSupplier` ya no se importa desde `src/app/api/finance/suppliers/**` (verificable con grep)
- [ ] Test de regresión nuevo: BQ down → POST supplier responde 201
- [ ] Mock obsoleto en `bigquery-write-cutover.test.ts:60-62` eliminado o actualizado
- [ ] CLAUDE.md sección Finance actualizada con la regla "no DDL BQ en request path + outbox como contrato canónico"

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/app/api/finance/suppliers src/lib/providers services/ops-worker`
- `pnpm pg:doctor` (sanity check post-deploy)
- Manual staging: crear 1 supplier nuevo (e.g. "Adobe Inc" + país US + isInternational=true) → verificar 201 + aparece en lista + outbox event existe + worker lo procesa en < 5 min
- BQ check manual: `bq query "SELECT provider_id, provider_name, updated_at FROM efeonce-group.greenhouse.providers WHERE provider_id IN ('figma','microsoft','notion','adobe') ORDER BY updated_at DESC"`
- Verify worker deploy: `gh run list --workflow=ops-worker-deploy.yml --limit 1`
- Reliability signal: GET `/api/admin/platform-health` → buscar entry `finance.providers.bq_sync_drift` con value=0

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con el estado real
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con la decisión arquitectónica + recovery del incidente
- [ ] `changelog.md` actualizado (cambio de comportamiento del endpoint + nueva proyección reactiva)
- [ ] Chequeo de impacto cruzado: TASK-013, TASK-706, TASK-478
- [ ] `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` Delta YYYY-MM-DD agregado
- [ ] `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` actualizado con consumer canónico de `provider.upserted`
- [ ] `CLAUDE.md` sección Finance / Reactive projections actualizada

## Follow-ups

- TASK derivada: auditar OTROS endpoints Finance que sigan el mismo anti-patrón (`syncClientToBigQuery`, sync legacy de incomes, expenses, etc.) y aplicar el mismo desacople.
- TASK derivada: mejora UX del drawer `CreateSupplierDrawer` — mostrar mensajes de error estructurados desde el endpoint (FinanceValidationError) en lugar del genérico actual.
- TASK derivada: decidir el fate de los datasets BQ `greenhouse.fin_*` post-cutover (deprecar o mantener como projection store oficial).
- Considerar lint rule `greenhouse/no-bq-write-in-route-handler` si emerge el patrón en otros módulos.

## Open Questions

- ¿BQ `greenhouse.providers` y `greenhouse.fin_suppliers` tienen consumers vivos hoy (queries downstream, marts, dashboards)? Si nadie los lee, Slice 2 puede simplificarse a "eliminar el sync sin reemplazo" en lugar de mover a worker.
- ¿El reliability signal debe usar `30 minutes` como umbral aged-pending, o algo más estricto (5 min)? Depende del SLA acordado para proyecciones reactivas.
- ¿La causa raíz inmediata del fail BQ en staging (permisos ADC, schema mismatch, dataset missing) requiere una task separada de infra, o se resuelve naturalmente al mover la llamada al worker (que tiene SA distinta y más permisos)?
