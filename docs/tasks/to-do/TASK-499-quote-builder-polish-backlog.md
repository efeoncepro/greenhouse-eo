# TASK-499 — Quote Builder Polish Backlog (audit remanente)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio` (acumulado de polish micro-improvements)
- Effort: `Alto` (20+ items)
- Type: `backlog`
- Status real: `Backlog agrupado`
- Rank: `Post-TASK-498`
- Domain: `ui` + `finance`
- Blocked by: `none`
- Branch: `task/TASK-499-quote-builder-polish-backlog`

## Summary

Backlog del audit profundo post-TASK-488 con items remanentes no cubiertos en Sprint 1 (TASK-496), Sprint 2 (TASK-497), ni Sprint 3 (TASK-498). Agrupado para ejecutar en batches cortos segun prioridad.

## Why This Task Exists

El audit de TASK-488 identifico ~40 mejoras. TASK-496 cubre Sprint 1 (13 items), TASK-497 Sprint 2 (autosave+RHF), TASK-498 Sprint 3 (primitives). Los 20+ items restantes son polish micro-improvements: worth doing pero no bloquean dia a dia.

## Items agrupados

### A — Context Strip (CS1–CS4)

- **CS1**: Agrupacion visual en 4 groups (Cliente | Comercial | Localizacion | Vigencia) con separadores sutiles
- **CS2**: Required asterisk → dot rojo mas visible
- **CS3**: Keyboard shortcuts por chip (`O` organizacion, `C` contacto, etc.)
- **CS4**: Chip "Sin BL" afordancia visual mejorada

### B — Line items (LI2, LI4–LI7)

- **LI2**: Tipo column: 3 chips → 1 chip combinado con tooltip expandido
- **LI4**: Quantity input con stepper `+/-`
- **LI5**: Unit dropdown hidden hasta que user clickee "Cambiar unidad"
- **LI6**: Precio unitario cell con 2 modes (display/edit) en vez de input siempre visible
- **LI7**: SKU caption → mini-chip outlined

### C — Cost stack (CST2–CST3)

- **CST2**: Border-left accent en cost stack expanded (ya hecho en Sprint 1, verificar consistencia)
- **CST3**: Sparkline mejorado con labels min/opt/max en hover

### D — Error & loading (E1–E3)

- **E1**: Retry button en error de save
- **E2**: Optimistic UI del engine con valor aproximado client-side
- **E3**: Skeleton en chip Contacto durante fetch (visual indicator en chip cerrado)

### E — Keyboard (K2–K4)

- **K2**: Tab order audit
- **K3**: Arrow-key nav entre table cells
- **K4**: Focus return verificacion tras popover close

### F — Responsive (R1–R3)

- **R1**: Mobile <900px stacked card layout por row
- **R2**: Dock edge-to-edge full-bleed en mobile
- **R3**: ContextChipStrip overflow menu (covered parcialmente por TASK-498)

### G — Microinteractions (M1, M2, M4)

- **M1**: Line add/remove stagger fade animation (respeta reduced-motion)
- **M2**: Chip commit flash (tonal→default background fade)
- **M4**: Hover feedback mas visible en tonal secondary buttons

### H — Copy / content (C2–C4)

- **C2**: Empty state icon → `tabler-file-invoice` (ya hecho en TASK-496, verificar)
- **C3**: Dock CTA disabled tooltip explicando que falta
- **C4**: Inline help tooltips (?) en chips complejos (BL, Modelo, Pais)

### I — Edit mode (EM1, EM2 y POLISH-3)

- **EM1 / POLISH-3**: Audit trail mini con createdAt/updatedAt/createdBy en edit mode
  - Requiere extender canonical store para exponer estos campos
  - Mostrar como overline caption bajo el IdentityStrip
- **EM2**: Version history (out of scope — necesita backend versioning first)

### J — Business logic (BL1–BL3)

- **BL1**: Validation quantity=0 bloquea save (UI + valibot schema)
- **BL2**: Discount fields UI (percent + fixed amount) + preview en row
- **BL3**: FX snapshot display ("USD 1 = 886.32 CLP al 19-abr") en caption del chip Moneda

### K — Admin/observability (O1, O2)

- **O1**: Engine errors → Sentry tag + Datadog log
- **O2**: Time-to-first-simulation metric

## Priorizacion interna

Ejecutar en orden de impacto × effort:

**Tier A (mayor impact)**: CS1, CS2, LI4, LI6, E1, K2, M1, C4

**Tier B (medio)**: LI2, LI5, LI7, E2, E3, R1, R2, C3, EM1

**Tier C (polish final)**: CS3, CS4, CST3, K3, K4, M2, M4, BL1, BL2, BL3, O1, O2

## Acceptance Criteria

- [ ] Cada item cerrado con sub-commit referenciado
- [ ] 3 checkpoints de review cruzado (A done, B done, C done)
- [ ] Sin regresion visual en tests de Playwright/axe cuando esten implementados
- [ ] Gates por checkpoint: tsc/lint/test/build verdes

## Out of Scope

- Version history (requiere infra backend)
- Offline mode (Service Worker)
- Multi-user concurrent edit
- Export PDF desde builder (feature separada)

## Follow-ups

- Al cerrar cada tier, actualizar `GREENHOUSE_UI_PLATFORM_V1.md` con deltas
- Considerar visual regression tests (Playwright + axe)
