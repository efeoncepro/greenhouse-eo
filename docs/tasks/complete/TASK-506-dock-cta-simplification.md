# TASK-506 — Quote Builder Dock: CTA Simplification + Addons Chip Amount

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio` (mental model cleanup + visible en 100% de quotes)
- Effort: `Bajo`
- Type: `ux` + `refactor`
- Status real: `En implementación`
- Rank: `Post-TASK-505`
- Domain: `ui` + `finance`
- Blocked by: `none`
- Branch: `task/TASK-506-dock-cta-simplification`

## Summary

Post-TASK-505 el dock quedó con layout enterprise pero heredó de TASK-504 dos CTAs ("Guardar y cerrar" + "Guardar y emitir") que con zona 3 (md=4) wrapean verticalmente, rompen el rhythm del dock y colisionan cognitivamente al empezar ambos con "Guardar".

Adicionalmente el builder tiene **3 saves en toda la página**:
- Header: `Guardar borrador` (tonal primary).
- Dock: `Guardar y cerrar` (tonal).
- Dock: `Guardar y emitir` (contained primary).

Esta task limpia el mental model: el dock queda con **una sola CTA primaria** (`Guardar y emitir` = acción terminal del builder). El "Guardar borrador" del header absorbe el rol de "persist sin cerrar". "Guardar y cerrar" del dock se elimina (redundante).

## Why This Task Exists

Audit cruzado con `modern-ui` + `greenhouse-ux` + `microinteractions-auditor`:

- **Cognitive collision**: 2 CTAs con prefijo "Guardar" obligan a parsear el diferenciador. Viola restraint.
- **Vertical wrap**: zona 3 del Grid (md=4) no aguanta 2 CTAs side-by-side → `flexWrap='wrap'` los apila → dock crece de ~80px a ~110px.
- **Disabled state confuso**: "Guardar y cerrar" deshabilitado se ve casi igual que un contained inactivo.
- **3 saves en la página**: fragmenta el modelo mental del usuario.

Adicional: el chip de addons muestra solo el count ("1 addon") sin el monto aplicado al total. El usuario quiere saber cuánto aporta ese addon sin hacer matemática mental.

## Goal

1. Dock queda con **una sola CTA primaria**: `Guardar y emitir`.
2. "Guardar y cerrar" eliminado del dock (shell deja de pasar `secondaryCtaLabel`/`onSecondaryClick`).
3. Header mantiene `Cancelar` + `Guardar borrador` — sin cambio.
4. Grid zones ajustadas: 3 / 6 / 3 (zone 2 gana ancho para la total ladder, zone 3 suficiente para addons chip + primary CTA horizontal).
5. Addons chip muestra `N addons · ${appliedTotal}` cuando hay addons aplicados, con `+${suggestionsDelta}` adicional si hay sugerencias no aplicadas.
6. `SaveStateIndicator` recibe `changeCount` desde el shell (derivado del diff fingerprint).

## Acceptance Criteria

- [ ] Dock muestra solo 1 CTA primaria `Guardar y emitir`. Sin CTA secundaria.
- [ ] Dock altura constante ~80px (no grows vertical por wrap).
- [ ] Grid zones 3/6/3 en md+.
- [ ] Addons chip:
  - Count (`1 addon` / `N addons`).
  - `$applied` cuando hay addons aplicados en el snapshot.
  - `+$delta` cuando hay sugerencias no aplicadas (adicional).
- [ ] `SaveStateIndicator` muestra "N cambios" en `dirty` cuando hay cambios pendientes.
- [ ] Gates tsc/lint/test/build verdes.
- [ ] Smoke staging: jerarquía del dock respetada, chip addons con ambos montos legibles.

## Scope

### Shell (`QuoteBuilderShell.tsx`)

- Remover `secondaryCtaLabel={GH_PRICING.builderSaveAndClose}`, `secondaryCtaDisabled`, `onSecondaryClick` del JSX del dock. El prop sigue existiendo en el wrapper para consumers futuros (invoice/PO docks).
- Computar `appliedAddonsTotal: number` sumando `simulation.lines[i].suggestedBillRate.totalBillOutputCurrency` para las líneas con `metadata.pricingV2LineType === 'overhead_addon'`.
- Pasar `appliedAddonsTotal` al dock.
- Verificar que `saveState.changeCount` se deriva del diff entre `initialLines` y `linesSnapshot` (contar cambios en items + context + descripción + overrides).

### `QuoteSummaryDock.tsx`

- Grid: `{ xs: 12, md: 3 }` / `{ xs: 12, md: 6 }` / `{ xs: 12, md: 3 }`.
- Prop nueva `appliedAddonsTotal?: number | null`. Si > 0, el chip muestra `{count} addon{s} · ${applied}`.
- `addonTotalDelta` sigue siendo el preview de sugerencias no aplicadas; cuando > 0 se muestra como `+${delta}` adicional.

### Nomenclature

- `GH_PRICING.summaryDock.addonsChipWithAmount(count, amount)` → `"1 addon · $44.316"` (nuevo).
- Reglas de formato: cuando hay applied > 0 usa `addonsChipWithAmount(n, applied)`; cuando applied === 0 usa el current `addonsChip(n)`.

## Out of Scope

- Split button pattern (Opción B del audit) — si aparece necesidad real, TASK futura.
- Micro-animación post-save.
- Rediseño de los CTAs del header.

## Follow-ups

- Si el usuario decide que "Guardar y cerrar" debe reaparecer en un dropdown, TASK dedicada con split button.
- Actualizar `cotizador.md` (v3.4) + arch spec (v2.29) + `GREENHOUSE_UI_PLATFORM_V1.md` — documentar el cambio.
