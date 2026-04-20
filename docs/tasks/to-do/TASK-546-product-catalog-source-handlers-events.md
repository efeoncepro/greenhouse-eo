# TASK-546 — Product Catalog Source Handlers & Event Homogenization (Fase B)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `TASK-545`
- Branch: `task/TASK-546-product-catalog-source-handlers-events`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Fase B del programa TASK-544. Implementa los 4 handlers por source (`sellable_role`, `tool`, `overhead_addon`, `service`) que traducen eventos de cada source catalog a upserts del `product_catalog`. Homogeniza eventos de los source catalogs: cada uno debe emitir `.created`, `.updated`, `.deactivated` con payload canonico. Activa el materializer detras de sub-flags por source para rollout incremental.

## Why This Task Exists

Sin handlers, el materializer scaffolding de Fase A no hace nada. Cada source catalog hoy emite eventos parciales y shapes distintos; sin homogenizacion el materializer no puede consumir un contrato unico. Esta fase es donde los 4 catalogos fuente empiezan a alimentar `product_catalog` automaticamente.

## Goal

- Auditar y homogenizar eventos emitidos por `sellable_roles`, `tool_catalog`, `overhead_addons`, `service_pricing`.
- Implementar 4 handlers en `src/lib/sync/handlers/` siguiendo el contrato del spec §6.2.
- Activar el materializer con events completos.
- Rollout por sub-flag: `GREENHOUSE_PRODUCT_SYNC_ROLES`, `..._TOOLS`, `..._OVERHEADS`, `..._SERVICES`.
- Tests de integracion exhaustivos: crear/update/deactivate en cada source genera upsert correcto en `product_catalog`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md` — §6, §12 Fase B
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

Reglas obligatorias:

- Cada source catalog emite eventos canonicos; el store del source es el unico emisor legal.
- Handlers son funciones puras: extraen payload del event + devuelven shape `ProductCatalogUpsertInput`.
- Materializer upsertea en transaccion + emite `commercial.product_catalog.{created,updated,archived}` en el mismo commit.
- Idempotencia: mismo event dos veces → no-op si nada cambio (checksum check).
- Field ownership: handler NO escribe `hubspot_product_id`, `sync_status`, `last_outbound_sync_at`.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/to-do/TASK-544-commercial-product-catalog-sync-program.md`
- `docs/tasks/to-do/TASK-545-product-catalog-schema-materializer-foundation.md`

## Dependencies & Impact

### Depends on

- TASK-545 cerrada (schema + scaffolding + eventos registrados)
- `sellable_roles`, `tool_catalog`, `overhead_addons`, `service_pricing` stores existentes

### Blocks / Impacts

- TASK-547 Fase C — consume eventos `commercial.product_catalog.*` que este materializer emite
- Source catalogs: cada store gana eventos homogeneos + tests

### Files owned

- `src/lib/sync/handlers/sellable-role-to-product.ts`
- `src/lib/sync/handlers/tool-to-product.ts`
- `src/lib/sync/handlers/overhead-addon-to-product.ts`
- `src/lib/sync/handlers/service-to-product.ts`
- `src/lib/sync/projections/source-to-product-catalog.ts` (update con events array y handler wiring)
- `src/lib/commercial/sellable-roles-events.ts` (extender si falta)
- `src/lib/commercial/tool-catalog-events.ts`
- `src/lib/commercial/overhead-addons-events.ts`
- `src/lib/commercial/service-pricing-events.ts` (validar TASK-465)
- `src/lib/commercial/product-catalog/upsert-product-catalog-from-source.ts`
- Flag registry: 4 sub-flags en `src/lib/flags/greenhouse-flags.ts`

## Current Repo State

### Already exists

- Source catalog stores con eventos parciales
- TASK-545 deja scaffolding del materializer + columnas `source_kind`/`source_id`
- Patron de handlers en otras projections

### Gap

- Eventos no homogeneizados entre los 4 sources.
- Handlers no existen.
- Materializer no tiene events array poblado.
- Sub-flags no creados.
- `upsertProductCatalogFromSource` helper no existe.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Audit + homogenize source events

- Revisar eventos emitidos por cada source store (roles, tools, overheads, services).
- Lista gap: que eventos faltan, que payloads no matchean contrato canonico.
- Agregar/renombrar eventos para que cada source emita `.created`, `.updated`, `.deactivated` con shape minimo: `{ id, sku, name, active, timestamp, actor }` + fields especificos del source.

### Slice 2 — Handler `sellable-role-to-product`

- Extract + transform segun spec §6.2.
- Map: role.defaultBillRateUsd → product.default_unit_price; role.active → !product.is_archived; etc.
- Tests: role creado emite event → handler genera upsert correcto.

### Slice 3 — Handler `tool-to-product`

- Similar patron. Tools solo se materializan si `sellable=true`.
- Tests.

### Slice 4 — Handler `overhead-addon-to-product`

- Similar. Solo addons con `visibleToClient=true` se materializan.
- Tests.

### Slice 5 — Handler `service-to-product`

- Similar. Reutiliza `service_sku` y pricing de `service_pricing`.
- Tests.

### Slice 6 — `upsertProductCatalogFromSource` helper

- Core logic: lock row por (source_kind, source_id) → compute checksum → skip si unchanged → upsert + emit outbox.
- Manejo de archival: si event es `.deactivated`, setea `is_archived=true`, `archived_at=now()`; emit `commercial.product_catalog.archived`.

### Slice 7 — Materializer activation + sub-flags

- Registrar events array completo en la projection.
- Sub-flags por source; handler solo procesa si flag esta on.
- Rollout plan: roles primero (staging), validar 48h, luego tools, etc.

### Slice 8 — Tests E2E

- Crear role → product_catalog row nueva con source_kind='sellable_role' ≤ 30s.
- Update role → product_catalog row updated con checksum nuevo.
- Deactivate role → product_catalog row con is_archived=true.
- Mismo flujo para tool, overhead, service.

## Out of Scope

- Outbound Cloud Run (TASK-547).
- Drift cron (TASK-548).
- Admin UI (TASK-548).
- Variants (open question #1; diferir).
- Service bundle en HubSpot (open question #6; diferir).

## Detailed Spec

Ver `GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md` §6.2 para shape exacto de cada handler.

### Event contract homogeneo

```typescript
type SourceEventPayload = {
  sourceKind: ProductSourceKind;
  sourceId: string;
  sku: string;
  active: boolean;
  sellable?: boolean; // solo tools
  visibleToClient?: boolean; // solo overheads
  // ...fields por source
  timestamp: string;
  actor?: string;
};
```

### Upsert logic

```typescript
async function upsertProductCatalogFromSource(tx, input: HandlerOutput) {
  const existing = await findBySourceKeyLocked(tx, input.sourceKind, input.sourceId, input.variantKey);
  const newChecksum = computeChecksum(input);
  
  if (existing && existing.gh_owned_fields_checksum === newChecksum && existing.is_archived === input.isArchived) {
    return { changed: false, productId: existing.product_id }; // idempotent no-op
  }
  
  const productId = existing?.product_id ?? generateProductId();
  await upsertProductCatalog(tx, { productId, ...input, checksum: newChecksum });
  
  const eventType = !existing 
    ? 'commercial.product_catalog.created' 
    : input.isArchived && !existing.is_archived 
    ? 'commercial.product_catalog.archived'
    : 'commercial.product_catalog.updated';
  
  await emitOutbox(tx, eventType, { productId, sourceKind, sourceId });
  return { changed: true, productId };
}
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Cada source (roles, tools, overheads, services) emite `.created`, `.updated`, `.deactivated` con payload canonico.
- [ ] Los 4 handlers estan implementados y cubiertos por tests unitarios ≥90%.
- [ ] Con sub-flag on, crear un role nuevo genera row en `product_catalog` con `source_kind='sellable_role'` ≤ 30s.
- [ ] Update de role genera `commercial.product_catalog.updated` event con checksum distinto.
- [ ] Deactivate de role genera `commercial.product_catalog.archived` event.
- [ ] Rows existentes (creadas antes del flag) no se tocan hasta que haya un event fresh del source.
- [ ] Idempotencia verificada: mismo event dos veces no dispara segundo upsert.
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` verde.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/sync/handlers`
- `pnpm test src/lib/commercial/product-catalog`
- Staging E2E: crear role → verificar product_catalog row + evento emitido

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] Chequeo de impacto cruzado (TASK-467, TASK-465)

- [ ] Update TASK-544 umbrella
- [ ] 4 sub-flags on en staging; production detras de validacion explicita

## Follow-ups

- Variants on-demand (open question #1) — evaluar tras Fase C cuando haya feedback.
- Coalescing de eventos masivos (open question #7) — agregar si aparece performance issue.
- Service bundle HubSpot (open question #6) — diferir.

## Delta 2026-04-20

- **Runtime topology confirmada**: la proyeccion `sourceToProductCatalog` corre en `ops-worker` Cloud Run (mismo carril que el resto de reactive consumers de outbox en domain `cost_intelligence` y que `quotationHubSpotOutbound` TASK-463), NO en `commercial-cost-worker`.
- Razon: `commercial-cost-worker` es domain-specific para cost basis materialization (bundles heavy sobre `src/lib/commercial-cost-worker/materialize.ts`) + endpoints reservados para bulk commercial computations (`quotes/reprice-bulk`, `margin-feedback/materialize`). Las proyecciones reactivas de sync y materializers de catalogo no son cost computations y no pertenecen ahi.
- Consecuencia operativa: Discovery de esta task NO debe proponer montar el handler en `commercial-cost-worker`. Si el volumen justifica spin-off futuro de un `commercial-sync-worker` dedicado, abrir task nueva — no mezclar scope con el cost basis engine.
