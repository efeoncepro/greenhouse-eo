# TASK-602 — Product Catalog Multi-Currency Price Normalization (TASK-587 Fase B)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `TASK-587` (umbrella) → `TASK-544` (program parent)
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `TASK-601`
- Branch: `task/TASK-602-product-catalog-multi-currency-prices`

## Summary

Crea `greenhouse_commercial.product_catalog_prices` (tabla normalizada producto × moneda) con 6 monedas canónicas (CLP, USD, CLF, COP, MXN, PEN) alineadas a `hs_price_*` de HubSpot. Migra `default_unit_price + default_currency` actuales a 1 fila autoritativa por producto. VIEW de compat preserva callers legacy. Helper `derivePricesFromAuthoritative` computa monedas no autoritativas via FX platform; hook reactivo regenera prices al cambiar FX rate o precio autoritativo. Discovery one-time captura cualquier `hs_price_*` poblado en HS como semilla `source='hs_seed'` — después GH es SoT permanente.

## Why This Task Exists

Hoy `product_catalog` tiene `default_unit_price NUMERIC` + `default_currency TEXT`, un único precio scalar. HubSpot expone 6 slots `hs_price_clp/usd/clf/cop/mxn/pen` y los 74 productos del portal están vacíos en moneda porque el outbound v1 envía `unitPrice` a un field inexistente (`hs_price` deshabilitado). Esta task instala el modelo normalizado que Fase C (TASK-603) consume para emitir los 6 fields HS.

## Goal

- Tabla `product_catalog_prices (product_id, currency_code, unit_price, is_authoritative, derived_from_currency, derived_from_fx_at, derived_fx_rate, source, created_at, updated_at)` con PK `(product_id, currency_code)`.
- VIEW `product_catalog_default_price` preserva callers legacy.
- Migración no destructiva: cada producto existente queda con 1 fila autoritativa en su moneda actual.
- Helper `derivePricesFromAuthoritative(productId)` computa las 5 monedas restantes via FX platform.
- Hook reactivo dispara recompute en `commercial.product.price_set` (operador fija precio) y en `fx.rate.updated` (FX platform).
- Discovery one-time semilla cualquier `hs_price_*` poblado como `source='hs_seed'`.
- Tests cubren: round-trip authoritative→derived, recompute trigger, GH SoT preservation contra HS edits.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md` (matriz canónica + FX rates source)
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` (hooks reactivos idempotentes)
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`

Reglas obligatorias:

- **GH es SoT permanente de precios**. HS edits sobre `hs_price_*` se sobrescriben en próximo outbound (regla heredada de TASK-587).
- `is_authoritative` es flag interno GH (operator-set vs FX-derived), NO tiene relación con SoT vs HS.
- Outbound (TASK-603) emite los 6 currencies aunque GH tenga NULL — envía `null` explícito para limpiar HS.

## Normative Docs

- `docs/tasks/to-do/TASK-587-hubspot-products-full-fidelity-sync.md` § Detailed Spec → Currency canonical set + § SoT direction table
- `docs/tasks/complete/TASK-547-product-catalog-hubspot-outbound.md` (decisión "USD por ahora, variants para TASK-421" — esta task la supera)

## Dependencies & Impact

### Depends on

- `TASK-601` — `product_catalog` extendido con columnas referenciadas por la VIEW
- `ref.currencies` o equivalente registrado en FX platform [verificar schema exacto en Discovery]
- Helpers de FX platform existentes para conversión rate-based [verificar paths en Discovery]

### Blocks

- `TASK-603` (Outbound v2) — necesita la tabla para construir `pricesByCurrency` payload
- `TASK-605` (Admin UI) — necesita la tabla para grid de precios en tab "Precios"

### Files owned

- `migrations/{ts}_task-602-product-catalog-prices-table.sql` (new)
- `migrations/{ts}_task-602-product-catalog-default-price-view.sql` (new — VIEW de compat)
- `migrations/{ts}_task-602-product-catalog-prices-backfill.sql` (new — migra default_unit_price actual)
- `scripts/discovery/hubspot-products-prices-seed.ts` (new — captura hs_price_* poblado)
- `src/lib/commercial/product-catalog-prices.ts` (new — store + derivePricesFromAuthoritative)
- `src/lib/commercial/product-catalog-prices.test.ts` (new)
- `src/lib/sync/projections/product-catalog-prices-recompute.ts` (new — hook reactivo)
- `src/types/db.d.ts` (regenerated)

## Current Repo State

### Already exists

- `product_catalog.default_unit_price NUMERIC` + `default_currency TEXT` (single scalar)
- FX platform con rates dinámicas [verificar exacto API en Discovery]
- Outbox / event bus para hooks reactivos ([projections playbook](docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md))

### Gap

- NO existe tabla normalizada de prices.
- Callers actuales (outbound v1, admin) usan `default_unit_price` directo.
- NO existe helper para derivar monedas via FX.
- NO existe hook reactivo que regenere prices cuando cambia FX rate.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Tabla + indexes

- `product_catalog_prices` con shape definido en [TASK-587 Slice B](docs/tasks/to-do/TASK-587-hubspot-products-full-fidelity-sync.md)
- Indexes: PK `(product_id, currency_code)`, índice secundario en `(product_id, is_authoritative)` para queries "give me the authoritative price of X"
- `pnpm db:generate-types`

### Slice 2 — VIEW de compat

- `CREATE VIEW product_catalog_default_price` que expone `product_id, default_unit_price, default_currency` para callers legacy
- Resolución: si producto tiene fila autoritativa en `default_currency` (heredado de catalog), usa ese; si no, primer autoritativa por orden de precedencia CLP→USD→CLF→COP→MXN→PEN

### Slice 3 — Backfill no destructivo

- Para cada `product_catalog` con `default_unit_price NOT NULL`, insertar fila en `product_catalog_prices` con `currency_code = default_currency`, `is_authoritative = true`, `source = 'gh_admin'`
- Idempotente: `ON CONFLICT (product_id, currency_code) DO NOTHING`

### Slice 4 — Discovery seed desde HS

- `scripts/discovery/hubspot-products-prices-seed.ts`:
  - Itera 74 productos via MCP HS
  - Por cada `hs_price_{code}` poblado, upsert fila con `source='hs_seed'`, `is_authoritative=true` (asumiendo que el operador fijó ese valor en HS)
  - Output report: cuántas filas agregadas por moneda, productos con conflicto vs backfill Slice 3
- **Discovery one-time**. Después de ejecutar, GH gana siempre.

### Slice 5 — derivePricesFromAuthoritative + FX hook

- `src/lib/commercial/product-catalog-prices.ts`:
  - `getPricesByCurrency(productId): Promise<Record<CurrencyCode, number | null>>` — devuelve los 6 (NULL si no hay)
  - `setAuthoritativePrice(productId, currencyCode, unitPrice, actor)` — upsert + recompute las 5 derivadas
  - `derivePricesFromAuthoritative(productId)` — lee fila autoritativa, computa 5 derivadas via FX, upsert con `is_authoritative=false, source='fx_derived', derived_from_currency, derived_from_fx_at, derived_fx_rate`
  - Si producto tiene >1 autoritativa (operador fijó CLP y USD), las 4 restantes se derivan de la primera por orden de precedencia, y se loguea warning
- `src/lib/sync/projections/product-catalog-prices-recompute.ts`:
  - Suscrito a `commercial.product.price_set` y `fx.rate.updated`
  - En `price_set`: recompute solo las derivadas del producto afectado
  - En `fx.rate.updated`: recompute todas las derivadas que dependen de monedas afectadas
  - Idempotente, anti-ping-pong via `derived_from_fx_at` timestamp check

### Slice 6 — Tests

- Unit: `setAuthoritativePrice` produce 6 filas (1 auto + 5 derivadas)
- Unit: cambiar FX rate → `derived_fx_rate` actualizado, `derived_from_fx_at` refleja momento del rebuild
- Integration: backfill no destructivo (correr 2x → mismo state)
- Integration: Discovery seed coexiste con backfill (operator-set y hs-seed conviven sin conflict)

## Out of Scope

- Outbound HS contract changes → TASK-603 (Fase C)
- Inbound HS price reads → TASK-604 (Fase D, aunque por SoT no debería leerlos como autoritativos)
- Admin UI grid de precios → TASK-605 (Fase E)
- Price history / effective_at → follow-up si emerge necesidad
- Cambiar shape de `default_unit_price` en `product_catalog` (drop column) → TASK-549 (cleanup) o follow-up; este task lo deja vivo via VIEW

## Detailed Spec

Ver [TASK-587 § Slice B](docs/tasks/to-do/TASK-587-hubspot-products-full-fidelity-sync.md) para shape completo de la tabla y SoT direction table.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `product_catalog_prices` creada con PK, indexes, FK a `product_catalog(product_id)` ON DELETE CASCADE
- [ ] VIEW `product_catalog_default_price` reproduce shape legacy (`product_id, default_unit_price, default_currency`)
- [ ] Backfill ejecutado: cada producto con `default_unit_price` tiene exactamente 1 fila autoritativa
- [ ] Discovery seed report generado; 0 productos huérfanos sin precio (Discovery confirmó si HS tenía valores)
- [ ] `setAuthoritativePrice` produce las 5 derivadas en mismo statement transaccional
- [ ] Hook reactivo en `fx.rate.updated` regenera derivadas afectadas
- [ ] Tests passing
- [ ] Re-correr backfill 2x no genera duplicados ni cambios

## Verification

- `pnpm migrate:status` muestra las 3 migraciones de Fase B aplicadas
- `pnpm pg:doctor`
- `pnpm lint` + `npx tsc --noEmit`
- `pnpm test src/lib/commercial/product-catalog-prices.test.ts`
- Manual: `SELECT product_id, count(*) FROM product_catalog_prices GROUP BY product_id` — todos = 6 (después de derivación) o 1+ (operator-set sin derivación si rate no disponible)

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado: tabla creada, productos con prices, Discovery seed result
- [ ] `changelog.md`: nueva tabla + VIEW + helper + hook
- [ ] Update TASK-587 con nota: Fase B completada
- [ ] Desbloquear TASK-603 — confirmar `Blocked by` removido

## Follow-ups

- Drop `default_unit_price` y `default_currency` de `product_catalog` cuando todos los callers migren al VIEW o a `getPricesByCurrency` → TASK-549 cleanup
- Price history con `effective_at` si se requieren prices time-travel → follow-up TASK
- UI admin para grid de prices → TASK-605 (Fase E)
