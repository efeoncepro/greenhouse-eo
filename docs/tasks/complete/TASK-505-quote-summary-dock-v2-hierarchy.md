# TASK-505 — Quote Summary Dock v2: Enterprise Hierarchy + Primitives Extraction

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto` (dock visible en 100% de quotes en create y edit)
- Effort: `Medio`
- Type: `refactor` + `ux` + `platform`
- Status real: `En implementación`
- Rank: `Post-TASK-503`
- Domain: `ui` + `finance` + `platform`
- Blocked by: `none`
- Branch: `task/TASK-505-quote-summary-dock-v2`

## Summary

Rediseño del `QuoteSummaryDock` con jerarquía visual enterprise y extracción de 3 primitives reusables al platform (`src/components/greenhouse/primitives/`).

El dock actual tiene densidad plana: save state, subtotal, total, factor, IVA, margen, addons y 2 CTAs compiten en una sola fila de 80px. El ojo rebota. Post-TASK-488 el Quote Builder alcanzó el bar enterprise en todas las otras áreas; el dock queda como la última deuda visible.

## Why This Task Exists

Audit conjunto con `modern-ui`, `greenhouse-ux` y `microinteractions-auditor` identificó 6 blockers y 4 issues modern-bar. Resumen:

1. **Redundancia Subtotal + Total side-by-side**: son el mismo número en la mayoría de quotes (sin IVA, factor=1). Viola restraint.
2. **Margen chip sin label**: "49.4%" + ícono es cryptic. Falla color-only-state.
3. **Total usa `color=primary.main`**: roba foco a la CTA. El azul de marca debe reservarse para acciones.
4. **Save state como 8px dot**: under-comunica.
5. **Jerarquía plana**: 3+ elementos con peso similar.
6. **CTA copy cargando estado ("Calculando pricing…")**: debe ser disabled + spinner, no copy-swap.

## Goal

1. Layout de 3 zonas con Grid: Estado (md=3) / Totals ladder (md=5) / Acciones (md=4).
2. Total como texto `h4` `text.primary` (no brand accent). La única primary.main del dock es la CTA.
3. Subtotal/Factor/IVA colapsan a una ladder compacta (caption muted) debajo del Total. Se ocultan cuando el Total equivale al Subtotal.
4. Margen chip con label explícito ("Margen · 49,4% · Óptimo") + icon + color semantic. Tooltip con tier range.
5. Save state gana segunda línea informativa (change count, relative time).
6. 3 primitives nuevos en `src/components/greenhouse/primitives/` reusables para invoice/PO/contract builders futuros:
   - `SaveStateIndicator`
   - `MarginHealthChip`
   - `TotalsLadder`
7. Motion: AnimatedCounter 0.4s → 0.25s; save dot pulsing en saving (respeta reduced-motion).

## Acceptance Criteria

- [ ] Dock renderiza 3 zonas horizontales en md+: Estado / Totals / Acciones.
- [ ] Total visible en `text.primary` (no `primary.main`).
- [ ] Subtotal ladder se oculta cuando `subtotal === total && (factor ?? 1) === 1 && !ivaAmount`.
- [ ] Margen chip con copy "Margen · N,N% · Óptimo/Atención/Crítico" + icon + color semantic.
- [ ] Save state muestra 2 líneas: dot + label principal + caption con changeCount/lastSavedAt.
- [ ] AnimatedCounter baja a 0.25s.
- [ ] 3 primitives en `primitives/` con tests unitarios de render básico.
- [ ] Gates tsc/lint/test/build verdes.
- [ ] Smoke staging: jerarquía, responsive 960/600/320, reduced-motion.

## Scope

### Nuevos primitives en `src/components/greenhouse/primitives/`

**`SaveStateIndicator`** (`SaveStateIndicator.tsx` + export):
- Props: `{ state: 'clean' | 'dirty' | 'saving' | 'saved', changeCount?: number, lastSavedAt?: Date | null }`
- Render: Stack vertical. Dot + label principal (body2) + caption muted.
- Dot semantics: gray (clean) / warning (dirty) / info pulsing (saving) / success (saved).
- reduced-motion: saving dot es opacity fija en vez de pulse.

**`MarginHealthChip`** (`MarginHealthChip.tsx` + export):
- Props: `{ classification: 'healthy' | 'warning' | 'critical', marginPct: number, tierRange?: { min, opt, max, tierLabel? } | null }`
- Render: Tonal chip (icon + label + %). Tooltip con tier range en hover.
- `aria-label` completo para screen reader.

**`TotalsLadder`** (`TotalsLadder.tsx` + export):
- Props: `{ subtotal, factor, ivaAmount, total, currency, loading, reducedMotion? }`
- Render: overline "Total {currency}" + h4 total value (tabular-nums) + caption con subtotal ladder (si hay ajustes).
- Lógica: si subtotal == total y factor ∈ {null, 1} y !ivaAmount → solo muestra total.

### Refactor de `QuoteSummaryDock`

- Reemplaza el Stack flat actual por `<Grid container columnSpacing={3}>`.
- Usa los 3 primitives nuevos.
- Preserva error alert y emptyStateMessage arriba.
- CTAs: Cancel (tonal secondary) + Primary (contained). El copy del primary NO cambia durante saving/simulating; el estado se comunica vía `disabled` + `loading` (spinner).

### Nomenclatura

- Nuevo `GH_PRICING.summaryDock.marginChip(pct, classification)` → "Margen · 49,4% · Óptimo".
- Nuevo `GH_PRICING.summaryDock.saveStateLabels` con keys `clean/dirty/saving/saved`.
- `addonsChip(n)` ya simplificado en TASK-503.

## Out of Scope

- PO / Contract / Invoice builders (esta task solo prepara los primitives, no los consume ahí).
- Cambios al motor de pricing.
- Persistir lastSavedAt en DB (se deriva del save transition local).

## Follow-ups

- TASK-498 ya planifica la extracción de primitives platform-wide; los 3 de aquí se suman al registry.
- Cuando PO/Contract builders entren, consumen los primitives sin re-implementar.
