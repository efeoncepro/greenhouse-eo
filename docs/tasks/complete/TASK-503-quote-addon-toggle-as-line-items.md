# TASK-503 — Addon Toggle = Line Item (`autoResolveAddons: 'internal_only'`)

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto` (transparencia con cliente + control comercial real)
- Effort: `Bajo-Medio`
- Type: `fix` + `refactor` + `ux`
- Status real: `En implementación`
- Rank: `Post-TASK-502`
- Domain: `ui` + `finance`
- Blocked by: `none`
- Branch: `task/TASK-503-addon-toggle-as-line-items`

## Summary

Dos problemas en el panel "Addons sugeridos" del Quote Builder:

1. **Tildar es cosmético**: el checkbox actualiza un `Set<string>` local (`excludedAddons`) que nunca llega al engine. `autoResolveAddons: true` sigue auto-sumando todos los addons al total, independientemente del estado del checkbox. Destildar NO resta.
2. **`appliedReason` raw en UI**: el panel muestra strings crudos del engine como `staffing_model=named_resources`. Texto técnico no user-facing.

## Why This Task Exists

Regla de negocio: **lo que el cliente paga es lo que ve en la tabla**. Addons visibles al cliente deben promoverse a líneas explícitas — transparencia total en el PDF. Addons internos (overhead, fee EOR) son estructura de costos y siguen corriendo automáticamente como parte del margen.

El engine ya distingue con `visibleToClient: boolean` y ya deduplica addons (si viene como línea `overhead_addon` explícita, el auto-resolver la salta). Solo falta exponer ese contrato correctamente a la UI.

## Goal

1. **Tildar** un addon visible → agrega una línea `overhead_addon` al `linesSnapshot` con el sku. Engine la trata como línea explícita; suma al total; visible en tabla y PDF.
2. **Destildar** → remueve esa línea. Total baja.
3. **Estado del checkbox** deriva de `linesSnapshot` (SoT única), no de un Set local.
4. **Engine `autoResolveAddons: 'internal_only'`** (valor nuevo, aditivo): auto-resuelve solo addons `visibleToClient: false`. Los visibles NO se auto-suman — son decisión del comercial.
5. **Panel copy**: ocultar `appliedReason` raw; mostrar solo nombre + monto en currency output. Quitar el doble display de USD.

## Acceptance Criteria

- [ ] `PricingEngineInputV2.autoResolveAddons` acepta `true | false | 'internal_only'`. Default sigue siendo `true` (no rompe callers legacy).
- [ ] Cuando `autoResolveAddons: 'internal_only'`, el engine auto-resuelve solo addons con `visibleToClient: false`; los visibles NO aparecen en `output.addons`.
- [ ] Shell del builder pasa `'internal_only'` al engine.
- [ ] Tildar un addon en el panel agrega una línea `{ lineType: 'direct_cost', metadata: { pricingV2LineType: 'overhead_addon', sku }, quantity: 1, unitPrice: null }` al snapshot.
- [ ] Destildar remueve la línea `overhead_addon` con ese sku.
- [ ] `includedSkus` deriva de `linesSnapshot.filter(l => l.metadata?.pricingV2LineType === 'overhead_addon').map(l => l.metadata.sku)`.
- [ ] `AddonSuggestionsPanel` no muestra `appliedReason`; quita el fallback en USD; texto en currency output.
- [ ] `excludedAddons` state eliminado del shell (dead code).
- [ ] Test unitario del engine cubre `'internal_only'`.
- [ ] Gates tsc/lint/test/build verdes.
- [ ] Smoke staging: crear quote con rol, abrir panel, tildar un addon visible, verificar línea aparece en tabla + subtotal sube; destildar, línea se va + subtotal baja; guardar, persiste la línea.

## Scope

### Engine (`pricing-engine-v2.ts` + contracts)
- `autoResolveAddons?: boolean | 'internal_only'`.
- En la rama de auto-resolve: si `'internal_only'`, filtrar `resolvedAddons.filter(a => a.addon.visibleToClient === false)` antes de computar charges + poblar `autoAddonOutputs`.

### Shell (`QuoteBuilderShell.tsx`)
- `buildQuotePricingInput` → añadir `autoResolveAddons: 'internal_only'`.
- `includedAddonSkus` deriva de `linesSnapshot` (no del Set).
- `handleAddonToggle`:
  - `include === true` → `editorRef.current?.appendLines([{ label: addon.addonName, lineType: 'direct_cost', unit: 'unit', quantity: 1, unitPrice: null, source: 'catalog', metadata: { pricingV2LineType: 'overhead_addon', sku } }])`.
  - `include === false` → filtrar el snapshot removiendo la línea con ese sku.
- `excludedAddons` state y setter eliminados.
- `addonTotalDelta` se ajusta para calcular solo addons NO tildados (sugerencias).

### Panel (`AddonSuggestionsPanel.tsx`)
- Filtrar `suggestions.filter(s => s.visibleToClient)` antes de renderizar (defensa; el engine ya debería devolver solo visibles en `'internal_only'`).
- Remover `<Typography>{suggestion.appliedReason}</Typography>`.
- Remover el `· USD` dual display; solo currency output.

### Editor (`QuoteLineItemsEditor.tsx`)
- Soporte de remoción por `appendLines` inverso: agregar método `removeLinesBy(predicate)` o usar `onDraftChange` desde el shell para mutar directamente. Alternativa: el shell llama a `handleDraftChange(nextLines)` directamente via ref sin pasar por el editor. Evaluar.

### Contract para persistencia
- Las líneas `overhead_addon` ya se persisten como `QuotationLineInput` — sin cambio al backend.
- `buildQuotePricingLineInput` ya cubre `overhead_addon` como caso explícito.

## Out of Scope

- Migración on-read de quotes legacy (se dejan intactas).
- Mapa humanizado de `appliedReason` (Opción 2 de la propuesta). Si aparece necesidad real, se agrega después.
- Permitir editar el monto de un addon una vez agregado como línea. Hoy es inmutable porque sigue siendo catalog-priced (TASK-502).

## Follow-ups

- Si quotes legacy sufren con el nuevo modelo, se crea TASK de migración on-read dedicada.
- Mapping humanizado de `appliedReason` puede venir en TASK de polish del catálogo de addons.
