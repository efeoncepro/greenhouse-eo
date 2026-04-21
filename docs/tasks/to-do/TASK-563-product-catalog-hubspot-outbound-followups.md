# TASK-563 — Product Catalog HubSpot Outbound Follow-ups (External Service Deploy + Custom Properties Apply + Anti-Ping-Pong Refactor + Batch Coalescing + E2E Staging)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[optional — TASK-544 Commercial Product Catalog Sync umbrella]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `crm + platform`
- Blocked by: `none` (TASK-547 Fase C ya shipped; estos items quedan fuera del V1 por tres razones: repo externo, coordinación HubSpot real, y decisiones cross-projection)
- Branch: `task/TASK-563-product-catalog-hubspot-outbound-followups`
- Legacy ID: `follow-up de TASK-547`
- GitHub Issue: `none`

## Summary

Cerrar los 5 items que TASK-547 dejó fuera del V1 — dos bloqueantes para producción real (deploy de los 3 endpoints nuevos en el Cloud Run externo `hubspot-greenhouse-integration` + aplicación de 5 custom properties en HubSpot sandbox→production via skill `hubspot-ops`) y tres mejoras de robustez (refactor del anti-ping-pong guard cuando TASK-540 aterrice, batch API coalescing para burst scenarios, y suite E2E contra HubSpot sandbox). El bridge `productHubSpotOutbound` en Greenhouse EO ya está shipped, testeado con mocks y listo para activarse; este task destraba la activación real end-to-end.

## Why This Task Exists

TASK-547 convergió el contrato outbound Greenhouse-first (migration trace + publishers + client + payload adapter + push helper idempotente + projection) y entregó 30 unit tests contra mocks, pero dejó 5 items que la arquitectura necesita para cerrar el loop end-to-end:

1. **Los 3 endpoints Cloud Run no existen todavía**. El repo externo `hubspot-greenhouse-integration` expone `POST /products` desde TASK-211, pero no `PATCH /products/:id`, ni `POST /products/:id/archive`, ni `GET /products/reconcile`. Mientras falten, el bridge opera en degraded mode (`hubspot_sync_status='endpoint_not_deployed'`) para updates/archives. La primera cotización en HubSpot con un product actualizado en Greenhouse va a ser stale hasta que estos shipan.
2. **Las 5 custom properties HubSpot no están creadas en ningún portal**. El runbook operativo `docs/operations/hubspot-custom-properties-products.md` describe el proceso pero nadie lo ha ejecutado. Sin las properties, TASK-548 (drift cron) no puede comparar `gh_owned_fields_checksum`, y el anti-ping-pong del sync inbound no tiene `gh_last_write_at` para leer.
3. **El anti-ping-pong guard vive inline en `push-product-to-hubspot.ts`**. Es la primera implementación en el repo (TASK-540 aún `to-do`). Cuando TASK-540 ship con el helper canónico compartido, este helper inline debe refactorizarse para consumir el canonical o genera divergencia silenciosa en el behavior cross-bridge (incomes, deals, quotes, products).
4. **El reactive worker procesa events 1:1 sin coalescing**. Si un bulk edit dispara 100 events de `commercial.sellable_role.pricing_updated` en ventana de 30s, se hacen 100 round-trips HTTP a HubSpot (o 100 intentos cuando los endpoints aterricen). El patrón `POST /products/batch/create` y `PATCH /products/batch/update` de HubSpot existe pero no se usa — es deuda de performance latente.
5. **No hay E2E real**. Los 30 unit tests pasan con mocks contra `createHubSpotGreenhouseProduct` / `updateHubSpotGreenhouseProduct` / etc. Antes de activar los flags en production necesitamos un ciclo completo staging: crear un role → ver aparecer un product en HubSpot sandbox con `gh_product_code=ECG-xxx` ≤ 2min → editar el role → product actualizado ≤ 2min → desactivar role → product archived en HubSpot ≤ 2min.

## Goal

- 3 endpoints nuevos deployados en Cloud Run `hubspot-greenhouse-integration` con contratos que matcheen el client Greenhouse (`PATCH /products/:id`, `POST /products/:id/archive`, `GET /products/reconcile`)
- 5 custom properties (`gh_product_code`, `gh_source_kind`, `gh_last_write_at`, `gh_archived_by_greenhouse`, `gh_business_line`) creadas en HubSpot sandbox, validadas, replicadas en production via skill `hubspot-ops`
- Anti-ping-pong inline refactorizado a consumir el helper canónico de TASK-540 (o documentar explícitamente que TASK-540 adopta el patrón inline como canonical)
- Batch API HubSpot (`POST /products/batch/create`, `PATCH /products/batch/update`) activado cuando el reactive worker procesa ≥5 events en ventana 30s
- Suite E2E contra HubSpot sandbox cubriendo los 4 flows críticos (create / update / archive / unarchive) + anti-ping-pong + rate limit backoff
- Feature flags `GREENHOUSE_PRODUCT_SYNC_*` activos en staging 48h sin errors, luego en production

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md` — v1.3 con Delta Fase C (contrato cliente + custom properties + 5 status del trace)
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` — reglas del reactive worker, rate limiting, DLQ, retry
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` — topology Cloud Run (`ops-worker` + `hubspot-greenhouse-integration`)
- `docs/architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` — §5.3 patrón anti-ping-pong (cuando TASK-540 aterrice)

Reglas obligatorias:

- NO tocar el contrato TypeScript del cliente (`updateHubSpotGreenhouseProduct`/`archiveHubSpotGreenhouseProduct`/`reconcileHubSpotGreenhouseProducts`). El service externo debe matchear lo que el repo Greenhouse ya envía.
- NO modificar `sanitizeHubSpotProductPayload` (guard TASK-347) — el bridge Greenhouse-side es defense-in-depth; el service externo es el segundo anillo.
- Anti-ping-pong refactor NO debe cambiar el behavior (60s window, skip con `skipped_no_anchors` status, emit `synced:noop` con reason `anti_ping_pong_window`).
- Custom properties `gh_*` son **read-only** en HubSpot UI. Operadores HubSpot no deben editarlas.
- Batch coalescing NO debe bypass el trace por producto — cada row de `product_catalog` sigue recibiendo su UPDATE individual de `hubspot_sync_status`.
- E2E staging usa el portal HubSpot sandbox, NO production.

## Normative Docs

- `docs/operations/hubspot-custom-properties-products.md` — runbook operativo paso a paso (ya shipped en TASK-547)
- `docs/tasks/complete/TASK-547-product-catalog-hubspot-outbound.md` — contrato shipped que este task destraba
- `docs/tasks/complete/TASK-546-product-catalog-source-handlers-events.md` — materialización que emite los events
- `docs/tasks/to-do/TASK-540-hubspot-lifecycle-outbound-sync.md` — aguas arriba del refactor anti-ping-pong
- `docs/tasks/to-do/TASK-548-product-catalog-drift-detection-admin.md` — consumer del `reconcileHubSpotGreenhouseProducts`; Slice 1 de este task es prerequisito

## Dependencies & Impact

### Depends on

- `TASK-547` (Fase C shipped) — contratos del cliente, schema de trace, projection registrada
- Acceso admin al repo `hubspot-greenhouse-integration` (repo externo)
- Credenciales HubSpot sandbox + production (via skill `hubspot-ops`)
- `TASK-540` — solo para Slice 3 (anti-ping-pong refactor); los otros 4 slices son independientes

### Blocks / Impacts

- `TASK-548` (Drift Detection) — Slice 1 (deploy del `/reconcile` endpoint) es prerequisito directo. Sin el endpoint, el cron nocturno no puede operar.
- `TASK-549` (Policy Enforcement) — Slice 5 (E2E staging) es el gate para activar los flags en production. Sin eso, TASK-549 no puede deprecar inbound auto-adopt.
- Activación de los flags `GREENHOUSE_PRODUCT_SYNC_*` en production — bloqueada hasta Slice 2 (custom properties) + Slice 1 (endpoints) + Slice 5 (E2E).

### Files owned

- Repo externo `hubspot-greenhouse-integration/routes/products.ts` (Slice 1 — NOT in this repo)
- HubSpot admin settings (Slice 2 — custom properties, via skill CLI)
- `src/lib/hubspot/push-product-to-hubspot.ts` (Slice 3 refactor; Slice 4 batch logic)
- `src/lib/sync/projections/product-hubspot-outbound.ts` (Slice 4 coalescing window)
- `src/lib/integrations/hubspot-greenhouse-service.ts` (Slice 4 — agregar `createHubSpotGreenhouseProductBatch`, `updateHubSpotGreenhouseProductBatch`)
- `scripts/e2e-product-hubspot-outbound.ts` (Slice 5 nuevo)
- `docs/operations/hubspot-custom-properties-products.md` (Slice 2 actualizar con fechas de aplicación)
- `docs/architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md` (bump a v1.4 al cerrar)

## Current Repo State

### Already exists

- Cliente Cloud Run con 3 métodos nuevos con `endpoint_not_deployed` fallback (TASK-547)
- Migration `hubspot_sync_status` + CHECK enum + 2 indexes + backfill (TASK-547)
- Payload adapter con 5 custom properties + sanitize guard (TASK-547)
- Push helper con anti-ping-pong inline 60s (TASK-547)
- Projection `productHubSpotOutbound` registrada (TASK-547)
- 30 unit tests passing contra mocks (TASK-547)
- Runbook de custom properties documentado (TASK-547)
- Skill `hubspot-ops` disponible en el entorno del operador

### Gap

- Los 3 endpoints server-side (`PATCH /products/:id`, `POST /products/:id/archive`, `GET /products/reconcile`) NO están deployados en `hubspot-greenhouse-integration` (Cloud Run externo).
- Las 5 custom properties NO existen en HubSpot (ni sandbox ni production).
- Anti-ping-pong inline NO está alineado con TASK-540 porque TASK-540 aún no shipped.
- Batch API coalescing NO existe; el reactive worker procesa events 1:1 sin window-based batching.
- NO hay E2E real contra HubSpot sandbox.
- Feature flags `GREENHOUSE_PRODUCT_SYNC_{ROLES,TOOLS,OVERHEADS,SERVICES}` están ON en staging desde TASK-546, pero sin los items arriba no se pueden activar en production sin perder eventos o corromper state en HubSpot.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Cloud Run externo: deploy de 3 endpoints

- Repo externo `hubspot-greenhouse-integration` gana:
  - `PATCH /products/:hubspotProductId` — body matchea `HubSpotGreenhouseUpdateProductRequest`. Traduce `customProperties.gh_*` a HubSpot properties API. Respond con `{status: 'updated', hubspotProductId, message?}`.
  - `POST /products/:hubspotProductId/archive` — body `{reason?}`. Llama HubSpot `crm/v3/objects/products/:id/archive` o equivalent. Respond con `{status: 'archived', hubspotProductId}`.
  - `GET /products/reconcile?cursor&limit&includeArchived` — lista HubSpot Products con custom props Greenhouse + archived flag. Respond con `{status: 'ok', items: [{hubspotProductId, gh_product_code, gh_source_kind, gh_last_write_at, name, sku, price, description, isArchived}], nextCursor?}`.
- Auth OIDC del service (mismo patrón de `POST /products` / `POST /quotes`).
- Rate limit bucket + exponential backoff + DLQ config consistente con los endpoints existentes.
- Deploy a staging primero, luego production.
- Acceptance: el cliente Greenhouse deja de recibir `endpoint_not_deployed` y las rows marcadas así quedan en `pending` o `synced` tras el siguiente intento del retry worker.

### Slice 2 — Aplicar 5 custom properties en HubSpot (sandbox + production)

- Ejecutar runbook `docs/operations/hubspot-custom-properties-products.md` via skill `hubspot-ops`:
  1. Dry-run contra sandbox mostrando las 5 properties a crear + las ya existentes.
  2. Apply en sandbox.
  3. Validación UI: group `Greenhouse Sync`, labels correctos, flags read-only, enum options de `gh_source_kind`.
  4. Smoke test: trigger manual de un `commercial.sellable_role.created` → verificar product en sandbox con `gh_product_code=ECG-xxx`.
  5. Replicar apply en production tras 48h de sandbox sin errores.
- Actualizar el runbook con fechas de aplicación en sandbox y production.
- Si alguna property ya existía pre-TASK-547 con conflicto de shape (tipo diferente, label diferente), documentar la resolution.

### Slice 3 — Refactor anti-ping-pong a helper canónico

- **Dependencia**: TASK-540 debe shipear primero con el helper compartido (ubicación TBD, probablemente `src/lib/sync/anti-ping-pong.ts`).
- Reemplazar las 3 funciones inline en `push-product-to-hubspot.ts`:
  - `ANTI_PING_PONG_WINDOW_MS` → import de la constante canónica.
  - `toTimestampMs(value)` → reutilizar utility.
  - `hitsAntiPingPong(row)` → `shouldSkipForAntiPingPong(row.hubspot_last_write_at)`.
- Tests pasan sin cambios (el behavior es idéntico).
- Si TASK-540 adopta el patrón inline como canonical (no helper), cerrar Slice 3 documentando esa decisión en el spec — no hay refactor.

### Slice 4 — Batch API HubSpot (coalescing ≥5 events/30s)

- Extender el client con:
  - `createHubSpotGreenhouseProductBatch(payloads: HubSpotGreenhouseCreateProductRequest[])` → `POST /products/batch/create` (si el service externo lo expone; sino `endpoint_not_deployed`).
  - `updateHubSpotGreenhouseProductBatch(updates: Array<{hubspotProductId, payload}>)` → `PATCH /products/batch/update`.
- Modificar la projection `productHubSpotOutbound` para buffer events en ventana de 30s:
  - Si en ventana hay ≥5 events del mismo tipo (`create` o `update`) para distintos `productId`, hacer batch call.
  - Si hay <5 o mixed, seguir con calls individuales.
  - Trace por producto se preserva (cada fila UPDATE su `hubspot_sync_status` individualmente post-batch).
- **Alternativa menor**: si introducir buffering cross-event requiere cambios en el reactive worker, deferirlo explícitamente y documentar performance budget observado en Slice 5.
- Tests: 3 nuevos — batch create path, batch update path, fallback a single cuando batch endpoint `endpoint_not_deployed`.

### Slice 5 — E2E contra HubSpot sandbox

- Script `scripts/e2e-product-hubspot-outbound.ts` que:
  1. Crea un role fixture en Greenhouse con SKU único (`ECG-E2E-{timestamp}`).
  2. Espera ≤2 min.
  3. Lee via `reconcileHubSpotGreenhouseProducts` + verifica `gh_product_code` + `gh_source_kind=sellable_role`.
  4. Actualiza el role (precio o descripción).
  5. Verifica en HubSpot el update ≤ 2 min.
  6. Desactiva el role.
  7. Verifica el product archived en HubSpot ≤ 2 min.
- Test de anti-ping-pong: simular webhook HubSpot dentro de 60s de un outbound Greenhouse → verificar skip en el trace.
- Test de rate limit: 20 roles creados en 10s → verificar que los eventos se procesan con backoff sin 429 spurios.
- Script corre en staging contra HubSpot sandbox; se documenta el resultado en `docs/operations/product-hubspot-outbound-e2e-report.md`.

## Out of Scope

- DLQ + P1 alertas post-5-fallos (hoy la reactividad cubre con `maxRetries: 2`; alerting real viene con observability task dedicada).
- Bulk manual re-sync desde Admin Center para rows pre-TASK-547 stale (follow-up post TASK-548).
- Multi-currency variants — tracked por TASK-421.
- Bundle products en HubSpot (open question #6 del programa).
- Auto-deploy del repo externo `hubspot-greenhouse-integration` desde este task (requiere coordinación con DevOps).

## Detailed Spec

### Batch buffer (Slice 4) pseudocode

```typescript
// projection refresh body gains a window buffer
const BATCH_WINDOW_MS = 30_000
const BATCH_MIN_SIZE = 5

const batchBuffer: Map<'create' | 'update', Array<PendingPush>> = new Map()

refresh: async (scope, payload) => {
  const action = deriveAction(row, payload.eventType)

  if (action === 'created' || action === 'updated') {
    batchBuffer.get(action)!.push({scope, payload})

    if (batchBuffer.get(action)!.length >= BATCH_MIN_SIZE) {
      return flushBatch(action)
    }

    scheduleWindowFlush(action, BATCH_WINDOW_MS)

    return 'buffered'
  }

  // archive / unarchive / noop → no coalescing, call immediately
  return await pushProductToHubSpot({...})
}
```

**Caveat**: buffering dentro de una projection requiere que el ops-worker soporte stateful projection state — puede ser complejo. Alternativa: implementar coalescing como un wrapper separado entre el materializer de TASK-546 y la emision de events (buffer de events antes de emit). Decidir en Plan Mode.

### E2E report shape (Slice 5)

```markdown
# Product HubSpot Outbound E2E Report — YYYY-MM-DD

| Test | Status | Latency (p50) | Latency (p95) | Notes |
|---|---|---|---|---|
| Create role → HubSpot product | ✅ | 45s | 90s | — |
| Update role → HubSpot updated | ✅ | 35s | 80s | — |
| Archive role → HubSpot archived | ✅ | 40s | 85s | — |
| Unarchive role → HubSpot unarchived | ✅ | 45s | 95s | — |
| Anti-ping-pong guard | ✅ | N/A | N/A | Webhook inbound dentro de 60s skipped correctamente |
| Rate limit burst (20 roles/10s) | ⚠️ | 55s | 140s | 2 intentos con backoff; 0 DLQ |
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Cliente `updateHubSpotGreenhouseProduct` deja de recibir 404 en sandbox → responde con `{status: 'updated'}`.
- [ ] Cliente `archiveHubSpotGreenhouseProduct` deja de recibir 404 en sandbox → responde con `{status: 'archived'}`.
- [ ] Cliente `reconcileHubSpotGreenhouseProducts` deja de recibir 404 en sandbox → responde con `{status: 'ok', items: [...]}`.
- [ ] Las 5 custom properties existen en HubSpot sandbox con labels, types y read-only flags correctos.
- [ ] Las 5 custom properties existen en HubSpot production tras validación 48h.
- [ ] Anti-ping-pong refactorizado al helper de TASK-540 (o decisión documentada si TASK-540 adopta inline).
- [ ] Batch API activado cuando outbound procesa ≥5 events en 30s (o performance budget documentado si deferido).
- [ ] E2E staging E2E report shipped con 4 flows críticos ✅.
- [ ] Rate limit burst (20 roles/10s) sin 429 spurios.
- [ ] Feature flags `GREENHOUSE_PRODUCT_SYNC_*` activos en production post-validación.
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` verde.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- E2E staging: `pnpm tsx scripts/e2e-product-hubspot-outbound.ts`
- Validación manual: custom properties en HubSpot UI sandbox + production
- Monitoreo 48h: distribución de `hubspot_sync_status` en `greenhouse_commercial.product_catalog`; outbox lag del ops-worker

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] Chequeo de impacto cruzado (TASK-548 — drift cron ahora puede operar; TASK-549 — policy enforcement puede activarse)

- [ ] Runbook `hubspot-custom-properties-products.md` actualizado con fechas de apply sandbox + production
- [ ] E2E report en `docs/operations/product-hubspot-outbound-e2e-report.md`
- [ ] Architecture spec bumped a v1.4 con Delta Fase C follow-ups

## Follow-ups

- DLQ + P1 alertas dedicadas (observability task separada).
- Admin Center bulk re-sync para rows stale (post TASK-548).
- Multi-currency products via variants (TASK-421).
- Bundle products HubSpot (programa follow-up).
