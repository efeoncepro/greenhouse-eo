# TASK-569 — Typography Visual Regression + Figma Alignment + Skills/Docs Cleanup

## Delta 2026-05-01 (tarde) — pivot a Geist

Tras cerrar TASK-566 con Inter y validar visualmente, el usuario decidió pivotar a **Geist Sans** como product UI base. Esta task ahora valida y propaga el contrato `Poppins + Geist`, no `Poppins + Inter`. Cambios concretos sobre el cuerpo:

- Donde dice "Inter" como destino canónico, leer "Geist Sans"
- `.claude/skills/modern-ui/SKILL.md` debe quitar la regla "no Inter" (ya invalidada por TASK-566) y agregar nota de baseline `Poppins + Geist`
- Figma debe alinearse a `Poppins + Geist`, no `Poppins + Inter`
- El grep de cleanup ahora barre `'DM Sans'`, `var(--font-dm-sans)`, `var(--font-inter)`, `'Inter'` literal y referencias a `Geist Mono`
- Visual regression valida que NO hay regresiones de first fold, wraps o clipping al pasar el theme a Geist (mismos casos de uso pero contra Geist en /home, /finance/quotes/new, /hr/payroll, /admin)
- Mockup de referencia de la decisión visual: `docs/mockups/typography-inter-vs-geist-mockup.html`

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
- cierre documental suficiente para que un agente nuevo no reabra el baseline viejo por error

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
- incluir al menos una validación de dark mode y una de viewport estrecho en las surfaces más densas

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
- dejar explícito qué referencias legacy pueden sobrevivir solo como contexto histórico

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
- [ ] La validación visual incluye al menos un caso en dark mode, uno en mobile/viewport estrecho y uno con zoom alto sobre surface densa
- [ ] La task deja cerrado qué menciones legacy pueden seguir existiendo por valor histórico para evitar “grep cleanup” destructivo

## Verification

- `pnpm test:e2e`
- grep documental
- revisión manual de Figma

## Open Questions

- Si al cerrar `TASK-568` emerge una tercera familia por necesidad técnica real en PDF, esta task debe reflejarla en Figma/skills/docs solo si ya quedó aprobada como excepción explícita del epic.
