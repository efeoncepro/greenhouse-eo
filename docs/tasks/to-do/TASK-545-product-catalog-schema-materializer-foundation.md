# TASK-545 — Product Catalog Schema & Materializer Foundation (Fase A)

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
- Blocked by: `none`
- Branch: `task/TASK-545-product-catalog-schema-materializer-foundation`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Fase A del programa TASK-544. Extiende `greenhouse_commercial.product_catalog` con `source_kind`, `source_id`, `source_variant_key`, `is_archived`, `archived_at`, `last_outbound_sync_at`, `gh_owned_fields_checksum`. Crea la tabla `product_sync_conflicts`. Scaffolding del materializer `sourceToProductCatalog` (sin handlers activos aun). Backfill idempotente heuristico por `product_code` prefix para poblar `source_kind`/`source_id` en rows existentes.

## Why This Task Exists

Sin las columnas de linking (`source_kind`, `source_id`) no se puede materializar desde los 4 source catalogs; sin `is_archived` no hay archival semantico; sin `product_sync_conflicts` no hay drift detection. El scaffolding del materializer sin handlers activos permite testear el pipeline vacio antes de enchufar sources en Fase B.

## Goal

- Migracion DDL sobre `product_catalog` con columnas nuevas + constraints + indexes.
- Crear tabla `greenhouse_commercial.product_sync_conflicts`.
- Scaffolding `src/lib/sync/projections/source-to-product-catalog.ts` registrada pero sin handlers activos.
- Script backfill `scripts/backfill-product-catalog-source.ts` que pobla `source_kind`/`source_id` heuristico para rows actuales.
- Types Kysely regenerados.
- Tests unitarios del scaffolding + backfill.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md` — §5, §6, §12 Fase A
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`

Reglas obligatorias:

- DDL via `pnpm migrate:create`; nunca renombrar timestamps manualmente.
- Nueva columna `source_id` NULLABLE en V1 (existen rows manual y hubspot_imported sin source_id); UNIQUE constraint solo cuando `source_kind NOT IN ('manual', 'hubspot_imported')`.
- Backfill idempotente: segunda corrida no-op salvo `--force`.
- Materializer scaffolding no debe ejecutar side effects; solo registrar domain + shape.
- `gh_owned_fields_checksum` se calcula en el commit handler, no en migration.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/to-do/TASK-544-commercial-product-catalog-sync-program.md`

## Dependencies & Impact

### Depends on

- `greenhouse_commercial.product_catalog` (existe)
- Reactive projection infrastructure
- `src/lib/db.ts` (Kysely)
- `node-pg-migrate`, `kysely-codegen`

### Blocks / Impacts

- TASK-546 Fase B (handlers) — requiere columnas y scaffolding
- TASK-547 Fase C (outbound) — consume eventos `commercial.product_catalog.*` emitidos por el materializer
- TASK-548 Fase D (drift) — lee `product_sync_conflicts`

### Files owned

- `migrations/YYYYMMDDHHMMSS_task-545-product-catalog-extension.sql`
- `migrations/YYYYMMDDHHMMSS_task-545-product-sync-conflicts-table.sql`
- `migrations/YYYYMMDDHHMMSS_task-545-product-catalog-backfill.sql`
- `scripts/backfill-product-catalog-source.ts`
- `src/lib/sync/projections/source-to-product-catalog.ts`
- `src/lib/commercial/product-catalog/types.ts`
- `src/lib/commercial/product-catalog/product-catalog-events.ts`
- `src/lib/commercial/product-catalog/product-catalog-store.ts` (extender con source filters)
- `src/types/db.d.ts` (regenerado)

## Current Repo State

### Already exists

- `greenhouse_commercial.product_catalog` (TASK-345)
- Patron de projection registry en `src/lib/sync/projections/`
- `product-catalog-store.ts` con readers basicos
- `create-hubspot-product.ts` outbound CREATE (sin touch aqui)

### Gap

- Sin columnas `source_kind`, `source_id`, `source_variant_key`, `is_archived`, `archived_at`, `last_outbound_sync_at`, `gh_owned_fields_checksum`.
- Sin tabla `product_sync_conflicts`.
- Sin scaffolding del materializer `sourceToProductCatalog`.
- Sin backfill de source data.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — DDL product_catalog extension

- Migracion con ALTER TABLE + check constraint de `source_kind` + indexes parciales.
- Unique constraint condicional sobre `(source_kind, source_id, source_variant_key)` para sources no-manuales.
- Regenerar types.

### Slice 2 — product_sync_conflicts table

- Migracion separada (facilita rollback independiente).
- Columnas + check constraints + indexes segun spec §5.2.

### Slice 3 — Backfill heuristico

- Script idempotente que inspecciona `product_code` prefix:
  - Prefix `ECG-` → `source_kind='sellable_role'`, resuelve `source_id` via join a `sellable_roles.sku`.
  - Prefix `ETG-` → `tool` + join a `tool_catalog.tool_sku`.
  - Prefix `EFO-` → `overhead_addon` + join a `overhead_addons.addon_sku`.
  - Prefix `EFG-` → `service` + join a `service_pricing.service_sku`.
  - Prefix `PRD-` → `source_kind='manual'`, `source_id=NULL`.
  - Match fallido → `source_kind='hubspot_imported'` si tiene `hubspot_product_id`, else flag warning.
- Migracion que invoca el script en un bloque seguro + modo dry-run env.

### Slice 4 — Scaffolding materializer

- Registrar `sourceToProductCatalogProjection` en domain `cost_intelligence` con events array vacio o stub.
- Handler factory pattern para que Fase B pueda plugear handlers sin tocar el core.
- Tests: projection se registra correctamente; consumer stub no produce side effects.

### Slice 5 — Events + types

- Agregar eventos `commercial.product_catalog.{created,updated,archived,unarchived}` a `product-catalog-events.ts` + registry.
- Types en `src/lib/commercial/product-catalog/types.ts`: `ProductSourceKind`, `ProductSyncDirection`, `ProductSyncStatus`, `ProductSyncConflict`.

## Out of Scope

- Handlers por source (TASK-546).
- Outbound Cloud Run (TASK-547).
- Drift cron (TASK-548).
- Admin Center UI (TASK-548).
- Modificar source catalogs (solo se leen en el backfill).

## Detailed Spec

Ver `GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md` §5, §6 para contratos completos.

### Backfill rules (idempotencia)

```sql
-- Skip rows con source_kind ya seteado
WHERE source_kind IS NULL
```

```typescript
// Con flag --force, recompute todo (util para iteraciones de testing)
if (args.force) { /* update incondicional */ }
```

### Checksum calculation

```typescript
gh_owned_fields_checksum = sha256(
  [product_code, product_name, description, default_unit_price, default_currency, default_unit, product_type, pricing_model, business_line_code, is_archived].join('|')
)
```

Se calcula en el commit del store (TASK-546+ lo usan; aqui solo scaffolding del helper).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `product_catalog` tiene todas las columnas nuevas tras migrate:up.
- [ ] `product_sync_conflicts` existe con check constraints validos.
- [ ] Backfill deja 100% de rows con `source_kind` NOT NULL.
- [ ] Segunda corrida del backfill es no-op (idempotencia verificada).
- [ ] Rows con prefix ambiguo quedan flagged en log, no mutadas.
- [ ] Materializer scaffolding registrado; `pnpm test` incluye test de registro exitoso.
- [ ] Eventos `commercial.product_catalog.*` agregados al catalog doc.
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` verde.
- [ ] `pnpm db:generate-types` post-migrate sin drift.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/commercial/product-catalog`
- `pnpm pg:connect:migrate` local
- `pnpm pg:connect:shell` → `SELECT source_kind, COUNT(*) FROM greenhouse_commercial.product_catalog GROUP BY source_kind;`

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado con "Product catalog schema extension"
- [ ] Chequeo de impacto cruzado (TASK-467, TASK-474)

- [ ] Update TASK-544 umbrella
- [ ] `GREENHOUSE_EVENT_CATALOG_V1.md` sincronizado

## Follow-ups

- Resolver ambiguos del backfill (si los hay) → task de hygiene.
- Si el backfill dejo orphans HubSpot, agregarlos como candidatos para TASK-548.
