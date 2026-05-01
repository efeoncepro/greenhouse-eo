# TASK-569 — Typography Visual Regression + Figma Alignment + Skills/Docs Cleanup

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto` (~1-2 días)
- Type: `implementation` + `policy`
- Epic: `EPIC-004`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `ui` + `platform` + `content`
- Blocked by: `TASK-566` + `TASK-567` + `TASK-568`
- Branch: `task/TASK-569-typography-regression-figma-docs`

## Summary

Task de cierre del programa tipográfico. Valida el cambio `DM Sans -> Inter`, alinea Figma, actualiza skills/documentación operativa y cierra el drift que hoy todavía empuja al repo hacia la postura vieja o hacia el draft `Geist`.

## Why This Task Exists

El cambio no termina cuando el theme compila. Hoy el repo todavía tiene:

- skills que dicen explícitamente “no Inter”
- checks de UI review escritas para `DM Sans + Poppins`
- documentación y prompts que podrían empujar a futuros agentes a reconstruir el baseline viejo

Además, las tasks draft anteriores mencionaban skills que no existen exactamente así en el repo. Esta task debe trabajar sobre el inventario real.

## Goal

- regresión visual verde en surfaces críticas
- Figma alineada a `Poppins + Inter`
- skills reales del repo alineadas al nuevo contrato
- docs operativas sin instrucciones contradictorias

## Architecture Alignment

- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`
- `docs/ui/GREENHOUSE_VISUAL_VALIDATION_METHOD_V1.md`
- `docs/tasks/to-do/TASK-566-typography-foundation-geist-poppins-theme.md`
- `docs/tasks/to-do/TASK-567-typography-code-sweep-eslint-rule.md`
- `docs/tasks/to-do/TASK-568-typography-email-pdf-font-registration.md`

## Files / Artifacts Owned

- `tests/e2e/**` para visual regression
- Figma design library de Greenhouse
- `.claude/skills/modern-ui/SKILL.md`
- `.claude/skills/greenhouse-ui-review/SKILL.md`
- `.claude/skills/greenhouse-email/skill.md`
- `CLAUDE.md` si contiene reglas tipográficas
- docs de arquitectura/UI que sigan mencionando `DM Sans` o el draft `Geist`

## Current Repo State

- `.claude/skills/modern-ui/SKILL.md` todavía fija “DM Sans + Poppins only” y además prohíbe Inter
- `.claude/skills/greenhouse-ui-review/SKILL.md` sigue auditando con el baseline viejo
- existen referencias documentales que podrían empujar a `Geist`

## Scope

### Slice 1 — Visual regression

- agregar o extender spec Playwright para tipografía
- cubrir Home, Finance, Agency, Payroll, Admin, People y Login
- resolver wraps/overflow detectados
- incluir chequeos UX/readability del cambio:
  - títulos siguen siendo escaneables en primer fold
  - tablas y KPIs no pierden legibilidad
  - zoom alto / wraps densos no rompen CTA ni metadata crítica

### Slice 2 — Figma

- swap DM Sans -> Inter
- conservar Poppins solo en estilos display
- no agregar una familia mono nueva salvo que el código final la haya necesitado realmente

### Slice 3 — Skills cleanup

Actualizar el inventario real del repo:

- `.claude/skills/modern-ui/SKILL.md`
- `.claude/skills/greenhouse-ui-review/SKILL.md`
- `.claude/skills/greenhouse-email/skill.md`
- Cualquier otra skill se toca **solo si grep demuestra** que todavía empuja `DM Sans`, `Geist` o una regla contradictoria sobre `Inter`

### Slice 4 — Docs cleanup

- remover menciones normativas a `DM Sans` como baseline
- remover instrucciones que sigan diciendo “no migrar a Inter”
- limpiar referencias al draft `Geist` que ya no apliquen

## Out of Scope

- no reabrir foundation theme
- no rediseñar componentes más allá de fixes de absorción
- no inventar skills nuevas salvo que falte una pieza crítica de governance

## Acceptance Criteria

- [ ] Playwright visual regression cubre surfaces críticas y pasa
- [ ] Figma queda alineada a `Poppins + Inter`
- [ ] `.claude/skills/modern-ui/SKILL.md` deja de prohibir Inter en Greenhouse
- [ ] `.claude/skills/greenhouse-ui-review/SKILL.md` audita con el baseline nuevo
- [ ] `.claude/skills/greenhouse-email/skill.md` deja de modelar `EMAIL_FONTS.body` sobre DM Sans
- [ ] grep de `DM Sans` y del draft normativo `no Inter` queda limpio en skills/docs activas del programa

## Verification

- `pnpm test:e2e`
- grep documental
- revisión manual de Figma

## Open Questions

- Si al cerrar `TASK-568` emerge una tercera familia por necesidad técnica real en PDF, esta task debe reflejarla en Figma/skills/docs solo si ya quedó aprobada como excepción explícita del epic.
