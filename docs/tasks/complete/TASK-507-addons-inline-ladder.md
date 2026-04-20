# TASK-507 — Addons inline en la Total Ladder (zone 3 = CTA-only)

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio` (resuelve overlap visual del chip sobre el CTA + modernización)
- Effort: `Bajo`
- Type: `ux` + `refactor`
- Status real: `En implementación`
- Rank: `Post-TASK-506`
- Domain: `ui` + `platform`
- Blocked by: `none`
- Branch: `task/TASK-507-addons-inline-ladder`

## Summary

Post-TASK-506 el dock quedó con layout 3/6/3 y una sola CTA, pero el chip de addons en zone 3 (md=3) no cabe horizontal al lado del CTA y wrapea por encima — visualmente parece sentado sobre el botón. El user reporta mala experiencia.

Root cause: el chip de addons **no pertenece a la zona de acciones**. Los addons son ajustes al total, no una acción independiente. Patrón enterprise (Stripe Billing / Linear / Notion): acciones contextuales viven con sus datos, no flotan como chips aparte.

Fix: **integrar los addons como segmento interactivo dentro de la Total ladder** (zone 2). Zone 3 queda 100% para la CTA.

## Why This Task Exists

Audit post-TASK-506 identificó que el problema del chip wrapeando sobre el CTA no se resuelve con más ancho — el chip está en la zona equivocada. El concepto de "addon" es matemático (modifica el total), no operacional (no es una acción del usuario sobre la cotización como guardar/emitir). Colocarlo en la ladder del Total respeta la semántica y libera la zona de acciones para el único CTA terminal.

## Goal

1. `TotalsLadder` primitive acepta nuevo prop opcional `addonsSegment?: { count, amount, onClick, ariaExpanded }`.
2. Cuando se pasa, renderiza inline entre los segmentos existentes (Subtotal · addon · Factor · IVA) con el mismo peso visual (`caption` muted, `tabular-nums`) pero con affordance de botón: hover → primary color + underline, focus visible, aria-expanded.
3. `QuoteSummaryDock` elimina el chip redondo + Badge de zone 3. El popper sigue viviendo en el dock pero el anchor se captura desde el inline button de la ladder.
4. Zone 3 (md=3) contiene únicamente la CTA `Guardar y emitir`.
5. Reducida motion respetada — hover transitions fallback a color-only sin underline animada.

## Acceptance Criteria

- [ ] Zona 3 del dock contiene solo `<Button>` primary, sin chip flotante.
- [ ] Segmento de addons aparece entre Subtotal y Factor en la ladder, con separador `·` nativo.
- [ ] Click al segmento abre el popper del panel de addons, anclado al segmento.
- [ ] Cuando `addonsSegment` no se pasa, la ladder funciona igual que antes (backwards-compat).
- [ ] Hover + focus-visible + aria-expanded implementados.
- [ ] Gates tsc/lint/test/build verdes.
- [ ] Smoke staging: chip deja de aparecer en zone 3, addon aparece en ladder, popper funciona.

## Scope

### Primitive `TotalsLadder` (`src/components/greenhouse/primitives/TotalsLadder.tsx`)

- Nueva prop:
  ```ts
  addonsSegment?: {
    count: number
    amount: number
    onClick: (event: ReactMouseEvent<HTMLElement>) => void
    ariaExpanded?: boolean
  } | null
  ```
- Cuando `addonsSegment && addonsSegment.count > 0`, agregar un segmento inline en la ladder (después de Subtotal, antes de Factor si existe). Render como `<Box component='button'>` con:
  - Icono `tabler-sparkles` (14px).
  - Copy: `{count} addon{s} {formatMoney(amount)}`.
  - Hover: `color: primary.main` + `textDecoration: underline`.
  - Focus-visible: outline 2px primary.
  - `aria-label` full-sentence.
  - `aria-expanded` reflejando el popover state.

### Dock (`QuoteSummaryDock.tsx`)

- `addonsSegment` en los datos derivados del `appliedAddonsTotal` + `addonCount`.
- Zone 3 render simplificado: solo CTAs.
- Popper se mueve fuera del bloque de zone 3 — ahora vive como sibling del Grid; anchor state consumido por el segmento inline de la ladder.
- El trigger del popper pasa al inline button en la ladder (via callback).

### Shell

- Sin cambios estructurales — sigue pasando `addonContent`, `addonCount`, `appliedAddonsTotal`, `addonTotalDelta`.

## Out of Scope

- Desplazar el popper a otra ubicación; sigue siendo top-end anclado al segmento.
- Redesign del AddonSuggestionsPanel (contenido del popper) — se mantiene.
- Cambiar el dropdown de Addons en mobile (responsive ya heredado).

## Follow-ups

- TASK-508 (polish backlog) — resto de las mejoras modern-bar del módulo.
