# TASK-623 — Tier/Volume/Graduated Pricing Engine

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Alto`
- Effort: `Medio` (~3 dias)
- Type: `implementation`
- Epic: `none` (RESEARCH-005 P2 Bloque E)
- Status real: `Diseno cerrado v1.9`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `TASK-620.1`
- Branch: `task/TASK-623-tier-volume-graduated-pricing`

## Summary

Extender el pricing engine actual (flat-only) con `pricingModel: 'flat' | 'volume' | 'graduated'` para sellable_tools y sellable_artifacts. Habilita commitment discounts (Adobe CC: 1-10 seats $54.99, 11-50 $44.99, 51+ $39.99) que son estandar en SaaS resale.

## Why This Task Exists

TASK-620 ya creo `sellable_tool_pricing_tier` schema, pero sin engine que lo lea. Sin tier pricing, Efeonce no puede competir en deals SaaS grandes (cliente pide commitment discount estandar de Adobe / Microsoft / HubSpot).

## Goal

- Engine reads pricing model + tier rows
- 3 modos: flat (current), volume (mismo precio para todos pero negociado por size), graduated (different prices per tier breakpoint)
- Quote line snapshot incluye tier resolution para auditability
- Composer UI permite al admin definir tiers
- Picker (TASK-620.4) muestra preview de pricing por tier al agregar

## Architecture Alignment

- `docs/architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_SELLABLE_CATALOG_V1.md`

## Dependencies & Impact

### Depends on

- TASK-620.1 (sellable_tool_pricing_tier table existe)

### Blocks / Impacts

- TASK-624 (renewal engine respeta tier al renovar)
- TASK-620.1.1 (partner attribution snapshot tier negociado)

### Files owned

- `migrations/YYYYMMDD_task-623-pricing-model-column.sql` (nuevo)
- `src/lib/commercial/pricing-engine-v3.ts` (nuevo o modificado)
- `src/lib/commercial/pricing-models/tier-resolver.ts` (nuevo)
- `src/views/greenhouse/admin/.../PricingTierEditor.tsx` (nuevo)

## Scope

### Slice 1 — Schema (0.25 dia)

```sql
ALTER TABLE greenhouse_commercial.sellable_tools
  ADD COLUMN pricing_model text NOT NULL DEFAULT 'flat'
    CHECK (pricing_model IN ('flat', 'volume', 'graduated'));

ALTER TABLE greenhouse_commercial.sellable_artifacts
  ADD COLUMN pricing_model text NOT NULL DEFAULT 'flat'
    CHECK (pricing_model IN ('flat', 'volume'));
-- Artifacts no soportan graduated (no aplica a deliverables one-off)
```

### Slice 2 — Tier resolver (1 dia)

```typescript
export const resolvePricingForQuantity = async (params: {
  itemType: 'sellable_tool' | 'sellable_artifact'
  itemId: string
  currency: string
  quantity: number
  asOfDate?: Date
}): Promise<{ unitPrice: number; tierBreakpoint: number; tierRange: string; pricingModel: string }> => {
  const item = await getItem(params.itemType, params.itemId)

  switch (item.pricing_model) {
    case 'flat':
      const flat = await getCanonicalPricing(...)
      return { unitPrice: flat, tierBreakpoint: 1, tierRange: '1+', pricingModel: 'flat' }

    case 'volume':
      // Misma rate, todos los seats al mismo precio segun el tier al que cae quantity
      const volumeTier = await findTier(itemId, currency, quantity)
      return { unitPrice: volumeTier.unit_price, tierBreakpoint: volumeTier.min_quantity, tierRange: `${volumeTier.min_quantity}-${volumeTier.max_quantity ?? '+'}`, pricingModel: 'volume' }

    case 'graduated':
      // Different prices per tier - first N seats at price1, next M at price2, etc.
      const totalCost = await calculateGraduatedCost(itemId, currency, quantity)
      return { unitPrice: totalCost / quantity, tierBreakpoint: -1, tierRange: 'graduated', pricingModel: 'graduated' }
  }
}
```

Modificar `expandServiceIntoQuoteLines` y `buildQuoteLineFromCatalogItem` (TASK-620.4) para usar tier resolver.

### Slice 3 — Composer tier editor (1 dia)

`<PricingTierEditor>`:

```
┌─ Tier pricing for Adobe CC (USD) ──────────┐
│ Pricing model: ◯ flat  ◉ volume  ◯ graduated│
│                                              │
│ Tiers:                                       │
│ Min qty │ Max qty │ Unit price               │
│ 1       │ 10      │ $54.99      [eliminar]  │
│ 11      │ 50      │ $44.99      [eliminar]  │
│ 51      │ (max)   │ $39.99      [eliminar]  │
│                                              │
│ [+ Add tier]                                 │
│                                              │
│ Preview: 25 seats at volume = $44.99 × 25 = $1,124.75 │
└──────────────────────────────────────────────┘
```

Validation: no tier overlap, min_quantity < max_quantity, ascending order.

### Slice 4 — Picker pricing preview + tests (0.75 dia)

Picker (TASK-620.4) muestra cuando agrega tool con tier pricing:

```
🔧 Adobe Creative Cloud · TOOL-0012
   Adobe partner · Volume pricing
   Cantidad: [25]   -> $44.99/seat (tier 11-50)
```

Tests:
- Flat: cualquier qty -> mismo precio
- Volume: qty 25 cae en tier 11-50 -> price 44.99
- Graduated: qty 25 = 10 * 54.99 + 15 * 44.99
- Snapshot en quote_line_items registra tier_breakpoint para auditability

## Out of Scope

- Custom pricing per cliente (negociaciones individuales) - Fase 2
- Tier de bundles completos (whole service module discount) - Fase 2
- Min commitment penalty (cliente firma 50 seats anual, baja a 30, paga penalty) - Fase 2

## Acceptance Criteria

- [ ] migracion aplicada
- [ ] resolver funcional para 3 modos
- [ ] composer tier editor funcional con validation
- [ ] picker muestra preview correcto
- [ ] snapshot en quote_line_items incluye tier metadata
- [ ] tests passing

## Verification

- Crear tool con volume tiers, agregar a quote con qty 25 -> price correcto
- Cambiar tier prices despues de signed quote -> snapshot historico inmutable

## Closing Protocol

- [ ] Lifecycle sincronizado
- [ ] Handoff con ejemplo tier setup Adobe
- [ ] Doc updated
