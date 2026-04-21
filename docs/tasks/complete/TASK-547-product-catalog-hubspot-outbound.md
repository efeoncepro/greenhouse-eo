# TASK-547 — Product Catalog HubSpot Outbound Projection (Fase C)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Implementado — 2026-04-21`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `TASK-545`
- Branch: `task/TASK-547-product-catalog-hubspot-outbound`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Fase C del programa TASK-544. Implementa la proyeccion reactiva `productHubSpotOutbound` (clonada del patron de `quotationHubSpotOutbound` TASK-463) que consume eventos `commercial.product_catalog.*` y pushea a HubSpot Products via Cloud Run. Extiende `hubspot-greenhouse-integration` con `POST /products`, `PATCH /products/:id`, `POST /products/:id/archive`, `GET /products/reconcile`. Crea custom properties HubSpot requeridas (`gh_product_code`, `gh_source_kind`, `gh_last_write_at`, `gh_archived_by_greenhouse`, `gh_business_line`). Cierra el loop Greenhouse → HubSpot con anti-ping-pong guard.

## Why This Task Exists

Sin outbound reactivo, los materializers de Fase B escriben a `product_catalog` pero HubSpot no se entera. Hoy `create-hubspot-product.ts` solo hace CREATE; no hay UPDATE ni archive. Esta fase es la que realmente cierra el pain point: al crear/actualizar un role en Greenhouse, HubSpot queda sincronizado automaticamente.

## Goal

- Cloud Run endpoints `POST /products`, `PATCH /products/:hubspotProductId`, `POST /products/:hubspotProductId/archive`, `GET /products/reconcile`.
- Custom properties HubSpot creadas idempotentemente.
- Proyeccion `productHubSpotOutbound` registrada en domain `cost_intelligence`.
- Anti-ping-pong guard + `gh_last_write_at` marking.
- Rate limit + exponential backoff + DLQ.
- Batch API HubSpot cuando outbound procesa >5 events simultaneos.
- Events de resultado (`.hubspot_synced_out`, `.hubspot_sync_failed`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md` — §7, §8, §11
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` — §5.3 patron anti-ping-pong

Reglas obligatorias:

- Cloud Run auth via OIDC token (patron existente).
- Anti-ping-pong: cada outbound escribe `gh_last_write_at`; inbound skipea si Greenhouse escribio <60s.
- Field authority: nunca escribir `name`, `domain` (HubSpot owns estos si aplica) ni tocar el product internal id.
- Batch API HubSpot (`POST /products/batch/create`) cuando hay ≥5 events en ventana 30s.
- DLQ tras 5 fallos; alerta P1.
- Skill `hubspot-ops` para validar custom properties + cuotas.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/to-do/TASK-544-commercial-product-catalog-sync-program.md`

## Dependencies & Impact

### Depends on

- TASK-545 cerrada (events `commercial.product_catalog.*` + schema)
- `hubspot-greenhouse-integration` Cloud Run service + deploy access
- HubSpot API credentials + portal access
- Reactive worker + outbox

### Blocks / Impacts

- TASK-548 Fase D — drift detection usa `GET /products/reconcile`
- UX del operador — crear role = aparece en HubSpot transparent

### Files owned

- `src/lib/sync/projections/product-hubspot-outbound.ts`
- `src/lib/hubspot/push-product-to-hubspot.ts`
- `src/lib/hubspot/hubspot-product-payload-adapter.ts`
- `services/hubspot-greenhouse-integration/routes/products.ts` (nuevos endpoints)
- `scripts/create-hubspot-product-custom-properties.ts`
- `src/lib/sync/anti-ping-pong-product.ts` (o reutilizar TASK-540 helper)

## Current Repo State

### Already exists

- `src/lib/hubspot/create-hubspot-product.ts` — CREATE only (reemplazable)
- `quotationHubSpotOutboundProjection` como template exacto (TASK-463)
- Cloud Run `hubspot-greenhouse-integration` con quotes endpoints
- HubSpot API client + OIDC auth

### Gap

- No existe `PATCH /products/:id`, `archive`, ni `GET /products/reconcile` en Cloud Run.
- No existe proyeccion `productHubSpotOutbound`.
- No existen custom properties HubSpot `gh_product_code`, `gh_source_kind`, `gh_last_write_at`, etc.
- No existe anti-ping-pong para products.
- Batch API HubSpot no usado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Custom properties HubSpot

- Script `create-hubspot-product-custom-properties.ts` idempotente.
- Usar skill `hubspot-ops`. Properties: `gh_product_code`, `gh_source_kind`, `gh_last_write_at`, `gh_archived_by_greenhouse`, `gh_business_line`.
- Documentar en `docs/operations/hubspot-custom-properties.md`.
- Correr en HubSpot sandbox primero, luego production.

### Slice 2 — Cloud Run endpoints

- `POST /products` — create with custom props.
- `PATCH /products/:hubspotProductId` — update fields respetando field authority.
- `POST /products/:hubspotProductId/archive` — set active=false.
- `GET /products/reconcile` — batch read con custom props para drift detection.
- Rate limit bucket + exponential backoff.
- Batch API: `POST /products/batch/create` y `PATCH /products/batch/update`.

### Slice 3 — Payload adapter + push helper

- `hubspot-product-payload-adapter.ts` traduce shape Greenhouse → shape HubSpot.
- `push-product-to-hubspot.ts` decide create/update/archive segun state + calls Cloud Run.
- Reemplaza `create-hubspot-product.ts` (deprecar con wrapper).

### Slice 4 — Anti-ping-pong

- Helper compartido con TASK-540 si aplica; sino dedicado.
- Skip outbound si HubSpot change event recien (60s window).
- Marcar `gh_last_write_at` en cada outbound successful.

### Slice 5 — Proyeccion reactiva

- `productHubSpotOutboundProjection` en domain `cost_intelligence`.
- Consume `commercial.product_catalog.{created,updated,archived,unarchived}`.
- Coalescing opcional en ventana 30s para batch.
- Emits `.hubspot_synced_out` o `.hubspot_sync_failed`.

### Slice 6 — Tests E2E

- Crear role → materializer → product_catalog → outbound → HubSpot product aparece ≤2 min.
- Update role → HubSpot product actualizado con nuevos fields.
- Deactivate role → HubSpot product archived.
- Anti-ping-pong: escribir en HubSpot + Greenhouse en paralelo → Greenhouse gana (field authority).
- Rate limit: simular burst → verificar backoff + DLQ.

### Slice 7 — Decision multi-currency

- Resolver open question #4: HubSpot Enterprise tier check.
- Si tier Enterprise: 1 product, multi-currency native.
- Si no: 1 product per currency (ECG-xxx-USD, ECG-xxx-CLP) via variants.
- Documentar decision en spec delta.

## Out of Scope

- Drift cron (TASK-548).
- Admin UI (TASK-548).
- Policy enforcement de orphans (TASK-549).
- Bundle products (open question #6).

## Detailed Spec

Ver `GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md` §7, §8 para contratos completos.

### Push logic

```typescript
async function pushProductToHubSpot(product: ProductCatalogRow, ctx: PushContext) {
  const payload = adaptToHubSpotPayload(product);
  
  if (ctx.eventType === 'archived') {
    if (!product.hubspot_product_id) return; // nothing to archive
    return await cloudRun.archiveProduct(product.hubspot_product_id);
  }
  
  if (product.hubspot_product_id) {
    return await cloudRun.updateProduct(product.hubspot_product_id, payload);
  }
  
  const { hubspotProductId } = await cloudRun.createProduct(payload);
  await persistHubSpotId(product.product_id, hubspotProductId);
  return { hubspotProductId };
}
```

### Batch coalescing (si aplica)

```typescript
// buffer events de la proyeccion por 30s; si >5 en ventana, usar batch API
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Crear role → HubSpot product aparece con `gh_product_code=ECG-xxx` ≤ 2 min.
- [ ] Update role → HubSpot product actualizado con nuevos fields ≤ 2 min.
- [ ] Deactivate role → HubSpot product `active=false` (archived).
- [ ] Anti-ping-pong funciona: writes dentro de 60s de HubSpot side son skip.
- [ ] Rate limit respetado; no 429 spurios.
- [ ] Batch API activado cuando outbound procesa ≥5 events.
- [ ] Tests E2E pasan contra HubSpot sandbox.
- [ ] DLQ + alert disparados tras 5 fallos consecutivos.
- [ ] Decision multi-currency documentada.
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` verde.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Test E2E en staging con HubSpot sandbox
- Validar custom properties en HubSpot via `hubspot-ops` skill

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] Chequeo de impacto cruzado

- [ ] Update TASK-544 umbrella
- [ ] Cloud Run service deployed + monitoreado
- [ ] Custom properties creadas en production HubSpot

## Follow-ups

- Coalescing si aparece performance issue (open question #7).
- Variants para multi-currency si Enterprise tier no disponible.

## Delta 2026-04-20

- **Runtime topology confirmada** (tres servicios Cloud Run + Vercel, separacion explicita de concerns):
  - `ops-worker` — ejecuta la proyeccion reactiva `productHubSpotOutbound` (mismo patron y domain `cost_intelligence` que `quotationHubSpotOutbound` TASK-463). Consume eventos `commercial.product_catalog.*` del outbox y dispara pushes.
  - `hubspot-greenhouse-integration` — HTTP facade a HubSpot API: gana los endpoints nuevos `POST /products`, `PATCH /products/:id`, `POST /products/:id/archive`, `GET /products/reconcile`. La proyeccion de `ops-worker` llama aqui.
  - `commercial-cost-worker` — NO participa en este sync. Queda reservado para cost basis materialization y bulk commercial computations (endpoints reservados `quotes/reprice-bulk`, `margin-feedback/materialize`).
- Razon de la separacion: reactive sync/projection (ops-worker) es proceso de datos; HTTP facade (integration) es adapter de API externa; cost basis (cost-worker) es computacion heavy de dominio. Mezclar scopes crea workers polymorphic y deploys de blast radius mayor.
- Consecuencia operativa: Discovery de esta task debe verificar contratos de auth OIDC entre `ops-worker` y `hubspot-greenhouse-integration` (el outbound pasa por el HTTP facade, no llama HubSpot directo desde el worker).
