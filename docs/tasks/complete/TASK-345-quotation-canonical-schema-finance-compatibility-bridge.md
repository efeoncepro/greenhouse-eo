# TASK-345 — Quotation Canonical Schema & Finance Compatibility Bridge

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Implementado, validado y deployed 2026-04-17`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none` (`TASK-344` completada el 2026-04-17)
- Branch: `task/TASK-345-quotation-canonical-schema-bridge`
- Legacy ID: `follow-on de TASK-210 y TASK-211`
- GitHub Issue: `none`

## Summary

Implementar la foundation de storage canónico para Quotation y su bridge de compatibilidad con las APIs y surfaces actuales de Finance, de modo que el runtime pueda evolucionar sin romper `Finance > Cotizaciones` ni los syncs ya activos.

## Why This Task Exists

El repo actual ya tiene quotes, products y line items en `greenhouse_finance`, pero el target canónico necesita más estructura:

- quotation header con `pricing_model`, `current_version`, metrics y lifecycle extendido
- versionado explícito
- line items alineados con pricing/costing canónico
- espacio para convivir con HubSpot y Nubox sin dejar dos raíces equivalentes

Antes de pricing, approvals o quote-to-cash, Greenhouse necesita un lugar estable donde esa información viva.

## Goal

- Crear la foundation canónica de Quotation a nivel schema/runtime
- Backfillear o mapear los registros actuales de Finance hacia el nuevo anchor
- Mantener las rutas actuales de Finance operativas sobre el storage canónico o su façade explícita

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

Reglas obligatorias:

- la task debe respetar la policy definida en `TASK-344`
- no dejar `greenhouse_finance.quotes` y el nuevo storage compitiendo como roots equivalentes
- cualquier backfill o compatibilidad debe ser idempotente y auditable

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/documentation/finance/cotizaciones-multi-source.md`
- `docs/tasks/complete/TASK-344-quotation-contract-consolidation-cutover-policy.md`
- `docs/tasks/complete/TASK-210-hubspot-quotes-integration.md`
- `docs/tasks/complete/TASK-211-hubspot-products-line-items-integration.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-344-quotation-contract-consolidation-cutover-policy.md`
- `docs/tasks/complete/TASK-210-hubspot-quotes-integration.md`
- `docs/tasks/complete/TASK-211-hubspot-products-line-items-integration.md`
- `src/app/api/finance/quotes/route.ts`
- `src/lib/hubspot/sync-hubspot-quotes.ts`
- `src/lib/hubspot/create-hubspot-quote.ts`
- `src/lib/hubspot/sync-hubspot-line-items.ts`
- `src/lib/hubspot/sync-hubspot-products.ts`
- `src/lib/nubox/sync-nubox-to-postgres.ts`

### Blocks / Impacts

- `TASK-346`
- `TASK-347`
- `TASK-348`
- `TASK-349`
- `TASK-350`
- `TASK-351`

### Files owned

- `migrations/[generated]-task-345-quotation-canonical-schema-finance-compatibility-bridge.sql`
- `src/lib/finance/schema.ts`
- `src/lib/finance/contracts.ts`
- `src/lib/finance/canonical.ts`
- `src/lib/finance/postgres-store.ts`
- `src/app/api/finance/quotes/route.ts`
- `src/app/api/finance/quotes/[id]/route.ts`
- `src/app/api/finance/quotes/[id]/lines/route.ts`
- `src/lib/hubspot/sync-hubspot-quotes.ts`
- `src/lib/hubspot/create-hubspot-quote.ts`
- `src/lib/hubspot/sync-hubspot-line-items.ts`
- `src/lib/hubspot/sync-hubspot-products.ts`
- `src/lib/nubox/sync-nubox-to-postgres.ts`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- `greenhouse_finance.quotes`
- `greenhouse_finance.quote_line_items`
- `greenhouse_finance.products`
- current routes:
  - `src/app/api/finance/quotes/route.ts`
  - `src/app/api/finance/quotes/[id]/route.ts`
  - `src/app/api/finance/quotes/[id]/lines/route.ts`
- current writers/syncs:
  - `src/lib/hubspot/sync-hubspot-quotes.ts`
  - `src/lib/hubspot/create-hubspot-quote.ts`
  - `src/lib/hubspot/sync-hubspot-line-items.ts`
  - `src/lib/hubspot/sync-hubspot-products.ts`
  - `src/lib/nubox/sync-nubox-to-postgres.ts`
- setup y backfill operativo:
  - `src/app/api/admin/ops/finance/setup-quotes/route.ts`
- drift conocido:
  - `docs/architecture/schema-snapshot-baseline.sql` no refleja aun el lane multi-source completo
  - `quotes`, `quote_line_items` y `products` siguen sin `space_id`

### Gap

- no existe aún el storage canónico de Quotation con versionado y contrato suficientemente rico para el target comercial
- el runtime actual de cotizaciones no pasa por una sola capa de store; varias escrituras siguen viviendo directo en helpers HubSpot/Nubox
- la compatibilidad tenant-safe todavía no está cerrada porque el lane actual no es `space-first`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema foundation

- Crear el storage canónico de Quotation según la policy de `TASK-344`
- Cubrir al menos quotations, versions y line items con keys estables y metadata de source/cutover

### Slice 2 — Backfill + bridge

- Mapear quotes, line items y products ya existentes al nuevo anchor
- Dejar readers/repositorios que abstraigan la compatibilidad mientras siga existiendo `Finance > Cotizaciones`
- Dejar bridge explícito para que los writers actuales de HubSpot/Nubox mantengan sincronizado el anchor canónico durante el cutover

### Slice 3 — Finance compatibility

- Ajustar las APIs actuales de Finance para leer/escribir vía el nuevo anchor o façade acordada
- Mantener backward compatibility razonable para consumers actuales del portal
- Resolver de forma explícita el drift de tenancy para que las lecturas del bridge queden filtrables por `space_id`

## Out of Scope

- pricing/costing avanzado
- approval workflow
- UI workbench final
- renewals y profitability tracking

## Detailed Spec

La task debe dejar resuelto:

- cómo se representa una quote de HubSpot ya sincronizada dentro del anchor canónico
- cómo conviven `hubspot_quote_id`, `nubox_document_id` y `quotation_id`
- cómo se versiona una quote histórica existente que hoy solo tiene header + line items actuales
- cómo se mantiene el anchor canónico actualizado cuando los writers reales siguen entrando por rutas/helpers de Finance, HubSpot y Nubox
- cómo se materializa o resuelve `space_id` para un lane que hoy todavía es principalmente `organization/client-first`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe storage canónico para quotations, versions y line items
- [ ] Las rutas actuales de Finance pueden seguir resolviendo quotes desde el nuevo anchor o façade definida
- [ ] El backfill/mapeo desde `greenhouse_finance.quotes` queda documentado y es idempotente
- [ ] El módulo no deja dos roots equivalentes sin policy de compatibilidad
- [ ] Los writers actuales de HubSpot/Nubox no dejan drift entre `greenhouse_finance.*` y el anchor canónico
- [ ] Las lecturas del bridge quedan scopeadas por `space_id`

## Verification

- `pnpm pg:connect:migrate`
- `pnpm db:generate-types`
- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm build`
- validación manual de lectura de quotes existentes desde `Finance > Cotizaciones`

## Closing Protocol

- [ ] Actualizar arquitectura/documentación si el placement real difiere de la propuesta inicial
- [ ] Documentar cualquier estrategia de rollback o coexistencia temporal en `Handoff.md`

## Follow-ups

- `TASK-346`
- `TASK-347`
- `TASK-348`

## Open Questions

- si la compatibilidad de Finance conviene materializarla como façade de store, vista SQL o ambos

## Completion Notes (2026-04-17)

### Entregado

- **Migration** `migrations/20260417103700979_task-345-quotation-canonical-schema-finance-compatibility-bridge.sql`:
  - Schema `greenhouse_commercial` + 4 tablas (`product_catalog`, `quotations`,
    `quotation_versions`, `quotation_line_items`) con FKs a
    `greenhouse_core.{spaces, organizations, clients}` y `product_catalog`.
  - Backfill idempotente desde `greenhouse_finance.{quotes, quote_line_items, products}`
    mapeando status legacy → canónico, resolviendo `space_id` via
    `greenhouse_core.spaces` por `organization_id` o `client_id`.
  - Versión inicial `v1` en `quotation_versions.snapshot_json` por cada quote backfilleada.
  - Grants a `greenhouse_runtime` / `greenhouse_migrator` / `greenhouse_app`.
- **Runtime store** `src/lib/finance/quotation-canonical-store.ts` (~1000 líneas):
  - `resolveFinanceQuoteTenantSpaceIds` (tenant-scoped space filter)
  - `listFinanceQuotesFromCanonical` / `getFinanceQuoteDetailFromCanonical` /
    `listFinanceQuoteLinesFromCanonical` (readers desde canonical)
  - `syncCanonicalFinanceQuote` / `syncCanonicalFinanceProduct` (writers canónicos)
  - `mapCanonicalQuote{List,Detail,Line}Row` (map canonical → legacy Finance API shape)
- **Contracts** en `src/lib/finance/contracts.ts`:
  - `QUOTATION_CANONICAL_STATUSES` (incluye `pending_approval`)
  - `QUOTATION_LEGACY_STATUSES` (mantiene `accepted` para compat)
  - `QUOTATION_SOURCE_SYSTEMS`
- **Rutas Finance existentes** refactorizadas para leer desde canonical:
  - `GET /api/finance/quotes` → `listFinanceQuotesFromCanonical` con fallback legacy
  - `GET /api/finance/quotes/[id]` → `getFinanceQuoteDetailFromCanonical`
  - `GET /api/finance/quotes/[id]/lines` → `listFinanceQuoteLinesFromCanonical`
- **Writers HubSpot/Nubox** actualizados para syncar anchor canónico:
  - `src/lib/hubspot/sync-hubspot-quotes.ts`
  - `src/lib/hubspot/create-hubspot-quote.ts`
  - `src/lib/hubspot/sync-hubspot-line-items.ts`
  - `src/lib/hubspot/sync-hubspot-products.ts`
  - `src/lib/nubox/sync-nubox-to-postgres.ts`

### Acceptance criteria

- [x] Storage canónico para quotations, versions y line items existe y está poblado.
- [x] Rutas actuales de Finance resuelven quotes desde el nuevo anchor (con fallback legacy por schema drift).
- [x] Backfill documentado e idempotente (ON CONFLICT ... DO UPDATE en cada sección).
- [x] Sin dos roots equivalentes: `greenhouse_commercial.quotations` es canónico,
      `greenhouse_finance.quotes` queda como bridge con `finance_quote_id` como clave.
- [x] Writers HubSpot/Nubox mantienen anchor canónico sincronizado.
- [x] Lecturas del bridge scopeadas por `space_id` via `resolveFinanceQuoteTenantSpaceIds`.

### Verification ejecutado

- `pnpm pg:connect:migrate` → migración aplicada, tipos regenerados (`db.d.ts`).
- `pnpm exec tsc --noEmit --incremental false` → 0 errors (único warning preexistente
  en `src/lib/campaigns/tenant-scope.test.ts` ajeno a TASK-345).
- `pnpm lint` → 0 errors.
- `pnpm build` → exit 0 (warnings Dynamic server usage preexistentes).
- `rg "new Pool\(" src` → sólo `src/lib/postgres/client.ts`.

### Archivo físico

Trabajo completado y deployed 2026-04-17 (per Handoff.md "Sesion 2026-04-17 — TASK-345").
Archivo movido de `docs/tasks/to-do/` a `docs/tasks/complete/` el 2026-04-17 como
parte del cleanup de lifecycle drift tras cerrar TASK-346.

### Detailed spec resuelta

- **Representación de quote HubSpot:** `hubspot_quote_id` + `hubspot_deal_id` +
  `hubspot_last_synced_at` en `quotations`; line items mantienen `hubspot_line_item_id`
  + `hubspot_product_id`. `source_system = 'hubspot'` marca origen.
- **Convivencia de IDs:** `quotation_id` (canonical) + `finance_quote_id` (legacy bridge,
  UNIQUE) + `hubspot_quote_id` + `nubox_document_id` conviven en la misma fila.
  `source_quote_id` captura el ID del sistema origen si el source no es manual.
- **Versionado de quotes históricos:** backfill crea `v1` con snapshot_json basado en
  las líneas actuales. Versiones futuras las genera TASK-346 (`persistQuotationPricing`
  con `createVersion: true`).
- **Anchor actualizado durante cutover:** syncers HubSpot/Nubox llaman
  `syncCanonicalFinanceQuote` después de escribir a `greenhouse_finance.quotes`,
  garantizando sync bidireccional hasta que TASK-347 migre publishers.
- **Tenancy:** `space_resolution_source` (`organization` | `client` | `explicit` |
  `unresolved`) auditado por fila; queries downstream pueden filtrar `unresolved`
  para detectar drift.
