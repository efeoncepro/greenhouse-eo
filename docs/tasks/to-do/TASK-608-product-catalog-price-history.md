# TASK-608 — Product Catalog Price History (effective_at)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `TASK-587` (programa parent del catálogo sincronizado, follow-up de Fase B TASK-602)
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `none` (TASK-602 aportó el modelo base; price history es aditivo)
- Branch: `task/TASK-608-product-catalog-price-history`

## Summary

Extiende `greenhouse_commercial.product_catalog_prices` (creada por TASK-602) con `effective_at` + `effective_until` para soportar time-travel de precios. Permite consultar "¿qué precio tenía el producto X en moneda Y el 2025-12-15?" — necesario para auditoría de cotizaciones históricas, reportes de profitability con precios vigentes al momento de la venta, y reconstrucción forense tras disputas comerciales. No rompe el contrato actual: la tabla sigue representando estado vigente con `effective_until IS NULL`.

## Why This Task Exists

Hoy la tabla `product_catalog_prices` es solo estado actual. Cuando un operador cambia `setAuthoritativePrice` de CLP 100000 a CLP 120000, el valor anterior desaparece. Tres consumidores se ven afectados:

- **Cotizaciones históricas**: una quote cerrada en 2025-11-01 con precio CLP 100000 no puede ser re-materializada hoy porque la tabla ya muestra 120000. Workaround actual: snapshotear el precio en la quote row, lo cual duplica data y no escala a comparar pricing policy evolution.
- **Reportes de profitability time-series**: cálculo de margin por mes requiere el precio vigente durante cada período. Hoy el reporte asume precio actual, lo cual distorsiona trend analysis.
- **Auditoría regulatoria / compliance**: Efeonce opera en múltiples LATAM jurisdictions. Una revisión tributaria puede pedir el precio vigente en una fecha específica; sin history, la evidencia está en logs o backups, no en la SoT operativa.

La decisión de NO implementar history en TASK-602 fue correcta (YAGNI + scope focus). Este follow-up lo agrega cuando la demanda sea real — probablemente dispara al primer disputed quote o primer requerimiento de reporte mensual de profitability con precios vigentes.

## Goal

- Nueva tabla `greenhouse_commercial.product_catalog_prices_history` (o columnas `effective_at` + `effective_until` en la tabla actual — decisión de diseño en Discovery)
- Helper `getPriceAsOf({productId, currencyCode, asOfDate})` devuelve el precio vigente en la fecha
- `setAuthoritativePrice` cierra la row anterior (set `effective_until = NOW()`) antes de insertar la nueva
- `recomputeDerivedForCurrencyPair` escribe history cuando actualiza derivadas
- Backfill: row actual se clona a history con `effective_at = created_at` para cada producto
- Tests cubren: time-travel query, transition boundary (asOfDate exacta a un cambio), múltiples cambios en el mismo día

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`
- `docs/architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md` (history de FX rates ya existe como precedente de patrón)

Reglas obligatorias:

- **No romper queries actuales**: `getPricesByCurrency(productId)` debe seguir retornando el estado vigente sin cambios en la API pública.
- **Time-travel es opt-in**: la mayoría de los callers usan "precio actual"; solo los que necesiten history llaman `getPriceAsOf`.
- **Inmutabilidad de history**: filas cerradas (`effective_until IS NOT NULL`) NO se updatean — solo se insertan nuevas rows sucesoras. Corregir un precio histórico requiere una operación explícita de amendment.

## Normative Docs

- `docs/tasks/complete/TASK-602-product-catalog-multi-currency-prices.md` (modelo base)

## Dependencies & Impact

### Depends on

- `TASK-602` ✅ (tabla `product_catalog_prices` + store)

### Blocks

- Futura Fase G (si emerge) de reportes de profitability time-series
- Auditoría regulatoria o disputed-quote remediation si surge

### Files owned

- `migrations/{ts}_task-608-product-catalog-prices-history.sql` (new)
- `migrations/{ts}_task-608-product-catalog-prices-history-backfill.sql` (new)
- `src/lib/commercial/product-catalog-prices.ts` (extender con `getPriceAsOf`, modificar `setAuthoritativePrice` + `recomputeDerivedForCurrencyPair` para cerrar history)
- `src/lib/commercial/product-catalog-prices.test.ts` (extender)
- `src/types/db.d.ts` (regenerated)

## Current Repo State

### Already exists

- `greenhouse_commercial.product_catalog_prices` con PK `(product_id, currency_code)`, sin history
- Store `setAuthoritativePrice` + `getPricesByCurrency` + `recomputeDerivedForCurrencyPair`

### Gap

- NO existe history de precios (solo estado vigente)
- NO existe helper time-travel
- NO existe escritura de history en writes del store

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Discovery: history pattern

Decidir entre dos shapes posibles:

**Opción A — Tabla separada**: `product_catalog_prices_history` con el mismo shape + `effective_at` + `effective_until`. Tabla vigente queda intacta; helper `getPriceAsOf` lee de history.
**Opción B — PK extendida**: agregar `effective_at` + `effective_until` a la tabla actual, cambiar PK a `(product_id, currency_code, effective_at)`. Estado vigente = `effective_until IS NULL`.

Decisión basada en: volumen esperado de cambios, complejidad de queries actuales, impacto en indexes. Probablemente **Opción A** es más conservadora (no rompe la tabla actual).

### Slice 2 — Migración schema + backfill

- Crear tabla o alterar existente según Slice 1
- Backfill idempotente: cada row vigente genera 1 row de history con `effective_at = created_at`
- Indexes: `(product_id, currency_code, effective_at DESC)`

### Slice 3 — Helper `getPriceAsOf`

- `getPriceAsOf({productId, currencyCode, asOfDate})` → `number | null`
- Query: row con `effective_at <= asOfDate AND (effective_until IS NULL OR effective_until > asOfDate)`
- Si no hay row vigente en esa fecha, retorna `null`

### Slice 4 — Escritura en history

- `setAuthoritativePrice` transacción: `UPDATE history SET effective_until = NOW()` de la row anterior, `INSERT` nueva row con `effective_at = NOW(), effective_until = NULL`
- `recomputeDerivedForCurrencyPair` análogo para derivadas

### Slice 5 — Tests

- Round-trip: set → get as_of past → validar precio original
- Transition boundary: asOfDate exacta al timestamp del cambio
- Multi-changes same day: 3 precios en un día, queries a cada instante intermedio
- Gap: asOfDate antes de `created_at` de la primera row → null

## Out of Scope

- Editar precios pasados (amendment) — follow-up si emerge
- Historial de `derived_fx_rate` separado del unit_price — vive en el mismo row de history
- UI admin para visualizar history — puede venir en TASK-605 si emerge requirement

## Detailed Spec

- **Inmutabilidad**: filas cerradas no se updatean más salvo via amendment explícito
- **Timestamps canónicos**: `effective_at = GREATEST(created_at_of_write, NOW() - epsilon)` — evita backfill histórico accidental via clock skew
- **Transacción atómica**: cierre + inserción de nueva row siempre en la misma transacción via `withTransaction`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Migración de schema aplicada
- [ ] Backfill idempotente; re-correr no duplica
- [ ] `getPriceAsOf` retorna precio correcto en todos los escenarios de test
- [ ] `setAuthoritativePrice` y `recomputeDerivedForCurrencyPair` escriben history atómicamente
- [ ] Tests 100% passing
- [ ] Documentación en el spec de arquitectura actualizada (si existe) o creada

## Verification

- `pnpm migrate:status`
- `pnpm lint` + `npx tsc --noEmit`
- `pnpm test src/lib/commercial/product-catalog-prices.test.ts`

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md`

## Follow-ups

- Amendment flow para corregir precios históricos (si emerge necesidad)
- Retention policy: si tabla crece mucho, archivar rows >N años a BigQuery
- Read-replica optimization si history queries saturan el primary
