# HubSpot Products Prices Seed — 2026-04-24

> **Tipo de documento:** Reporte operativo (TASK-602 Fase B Slice 4 — Discovery)
> **Modo:** **APPLY** (escrituras reales en Postgres)
> **Script:** `scripts/discovery/hubspot-products-prices-seed.ts`

---

## Resumen

- Total productos HubSpot escaneados: **74**
- Productos matcheados con `greenhouse_commercial.product_catalog` (via `hubspot_product_id`): **74**
- Productos HS sin counterpart local (no-op): **0**
- Productos con al menos un `hs_price_*` poblado: **0**

## Por moneda

| Currency | Seeded | Dry-run (pending) | Conflicts (auth already exists) |
|---|---|---|---|
| CLP | 0 | 0 | 0 |
| USD | 0 | 0 | 0 |
| CLF | 0 | 0 | 0 |
| COP | 0 | 0 | 0 |
| MXN | 0 | 0 | 0 |
| PEN | 0 | 0 | 0 |

## Detalle

_No se encontraron `hs_price_*` poblados en el portal HS._

Esto es consistente con el Discovery de TASK-601 (el outbound v1 nunca envió precios por moneda — todos los productos llegan a Fase B en green-field).

---

## Decisiones

- **Idempotente**: correr el script N veces produce el mismo estado. Filas autoritativas existentes (backfill del Slice 3 o seeds previos) NO se sobrescriben.
- **GH SoT post-seed**: después de esta corrida, HubSpot pierde autoridad sobre precios. El outbound v2 (TASK-603) sobrescribe HS en cada push.
- **Conflict behavior**: el operator puede resolver conflictos manualmente via admin UI (TASK-605) — el seed nunca destruye decisiones locales.
