# TASK-498 — Greenhouse UI Primitives Platform Extraction (Sprint 3)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto` (afecta futuros builders — invoice, PO, contract)
- Effort: `Alto`
- Type: `refactor` + `platform`
- Status real: `Backlog`
- Rank: `Post-TASK-497`
- Domain: `ui` + `platform`
- Blocked by: `none`
- Branch: `task/TASK-498-ui-primitives-platform`

## Summary

Sprint 3 del programa Quote Builder. Extrae 4 componentes del quote builder a primitives reusables del platform (`src/components/greenhouse/primitives/`) para habilitar consumo por invoice builder, PO builder, contract builder, y cualquier entity-form futuro.

## Why This Task Exists

El Quote Builder tiene 4 componentes enterprise-grade que DEBEN ser primitives reusables. Hoy viven bajo `src/components/greenhouse/pricing/` con nombres `Quote*` pero la logica es generica. Mantenerlos quote-specific crea deuda: el equipo re-implementara cuando construya invoice/PO/contract builders.

## Goal

1. `EntitySummaryDock` (extract de `QuoteSummaryDock`) — generic sticky-bottom floating dock con totales + addons chip + CTAs + save state + empty state.
2. `CardHeaderWithBadge` (extract del pattern usado en `QuoteLineItemsEditor`) — CardHeader con title + CustomChip badge + avatar + action.
3. `FormSectionAccordion` (extract del accordion "Detalle y notas") — primitive accordion para form sections con variant=form.
4. `ContextChipStrip` overflow menu — extender el primitive existente con "+N mas" dropdown cuando hay chips que no caben.

## Acceptance Criteria

- [ ] `EntitySummaryDock` en `src/components/greenhouse/primitives/`. Quote builder migra a consumirlo.
- [ ] `CardHeaderWithBadge` en primitives. Quote line items editor lo usa.
- [ ] `FormSectionAccordion` en primitives. Detail accordion usa.
- [ ] `ContextChipStrip` recibe prop `overflowAfter={n}` con dropdown al pasar el limite.
- [ ] Los 4 primitives tienen testid + a11y labels + variants documentadas.
- [ ] `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` actualizado con la seccion de nuevos primitives.
- [ ] Quote builder sigue funcionando post-migracion (no regresion visual).
- [ ] Gates: tsc/lint/test/build verdes.

## Scope

### Slice 1 — `EntitySummaryDock`

Generalizar props:
- `totals: Array<{ label, value, variant, format }>` en lugar de subtotal/factor/iva hardcoded
- `primaryCta` / `secondaryCta` (generics)
- `chipAction` (generic addons slot)
- `saveState` (generic save indicator)
- `emptyStateMessage`
- `contextualIndicator` (generic slot for margin chip o cualquier tier indicator)

### Slice 2 — `CardHeaderWithBadge`

- Props: `title`, `badgeValue`, `badgeColor`, `subtitle`, `avatarIcon`, `avatarColor`, `action`
- Render: CardHeader con title = Stack(h6 + CustomChip)

### Slice 3 — `FormSectionAccordion`

- Props: `title`, `icon`, `defaultExpanded`, `summaryCount?`, `children`
- Aplicar borderRadius.lg, border divider, theme consistency

### Slice 4 — `ContextChipStrip` overflow

- Prop `overflowAfter?: number` (default null = all inline)
- Cuando `children.length > overflowAfter`, renderiza los primeros N + un chip "+M" que abre menu con los restantes
- Util para builders con 15+ context fields

### Slice 5 — Migration

- Refactor quote builder para usar los 4 primitives
- Update `GREENHOUSE_UI_PLATFORM_V1.md` con la nueva seccion

## Out of Scope

- Crear invoice/PO/contract builders (solo primitives para ellos)
- Cambios de comportamiento en quote builder (solo refactor)

## Follow-ups

- TASK-499 resto del audit backlog
- Usar los primitives en el proximo builder que se construya
