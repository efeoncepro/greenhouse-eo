# ISSUE-106 — CHECK `product_catalog_hubspot_trace_consistent` bloquea productos inbound de quotes HubSpot

> **Estado:** Open
> **Detectado:** 2026-06-22 (durante TASK-1222 Slice B)
> **Ambiente:** dev/staging data plane (`greenhouse_commercial.product_catalog`)
> **Severidad:** media — bloquea el mirror canónico (`commercial.quotations`) + line items de N quotes HubSpot; esas quotes quedan en `finance.quotes` pero invisibles en el portal (el read API lee de `commercial.quotations`).

## Síntoma

Al sincronizar quotes HubSpot al store canónico (`syncCanonicalFinanceQuote` → `syncCanonicalQuoteProducts`), el INSERT a `greenhouse_commercial.product_catalog` falla con:

```
new row for relation "product_catalog" violates check constraint "product_catalog_hubspot_trace_consistent"
```

para productos cuyo `hubspot_product_id IS NOT NULL`. El bridge cae para esa quote (line items + canonical bridge), así que la quote NO llega a `commercial.quotations` y no se muestra. Observado en ≥5 quotes durante TASK-1222 (`30196617885`, `31358473024`, `32019248697`, `32583751538`, y las 2 de Slice A `33909911841`/`31798108817`).

## Causa raíz

El CHECK es:

```sql
CHECK ((hubspot_product_id IS NULL) OR (last_outbound_sync_at IS NOT NULL))
```

Fue diseñado para governance **outbound** de productos (un producto con `hubspot_product_id` debió haberse empujado outbound → `last_outbound_sync_at` set). Pero los productos que entran **inbound** desde line items de quotes HubSpot tienen `hubspot_product_id` (son productos HubSpot) y `last_outbound_sync_at = NULL` (nunca se empujaron desde Greenhouse). El INSERT en `quotation-canonical-store.ts` (`syncCanonicalQuoteProducts`) ni siquiera lista `last_outbound_sync_at` → cae al default NULL → viola el CHECK.

El CHECK conflaciona "tiene hubspot_product_id" con "fue sincronizado outbound", ignorando el origen inbound.

## Impacto

- N quotes HubSpot con productos inbound no se materializan en `commercial.quotations` → invisibles en `/finance/quotes` (read API lee de commercial). En TASK-1222 quedaron 5/69 así (las otras 64 sí se exponen).
- Pre-existente: ya fallaba antes de TASK-1222 (Slice A lo vio en 2 quotes); TASK-1222 lo amplificó al bridgear más quotes.

## Solución propuesta (NO band-aid)

NO setear un `last_outbound_sync_at` falso en el INSERT inbound (corrompería la semántica del trace outbound y podría romper el guard de productos / reconcile). Opciones canónicas a evaluar con `greenhouse-finance-accounting-operator` + dueño del product catalog (TASK-547/603/604):

1. **Corregir la semántica del CHECK**: requerir `last_outbound_sync_at` solo cuando el producto es Greenhouse-origin/outbound (e.g. `sync_direction='greenhouse_only'` o un flag de ownership), no para inbound (`source_system='hubspot'` / `sync_direction='bidirectional'`).
2. **Migración** `NOT VALID + VALIDATE` con el CHECK corregido + backfill de las filas afectadas.
3. Verificar que el guard outbound de productos (TASK-547) sigue intacto tras el cambio.

## Workaround temporal

Ninguno aplicado. Las quotes afectadas quedan en `finance.quotes` (no se pierden); re-corren idempotente cuando el CHECK se corrija.

## Relacionado

- TASK-1222 (HubSpot quotes reconciliation) — lo detectó y lo dejó documentado como follow-up; las 64 quotes no afectadas sí se reconciliaron.
- `src/lib/finance/quotation-canonical-store.ts` (`syncCanonicalQuoteProducts`).
- Product catalog governance: TASK-547 / TASK-603 / TASK-604.
