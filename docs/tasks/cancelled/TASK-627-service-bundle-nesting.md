# TASK-627 — Service Bundle Nesting (CANCELLED — absorbida en TASK-620.3 v1.8)

## Status

- Lifecycle: `cancelled`
- Cancelled date: `2026-04-25`
- Cancelled by: `Julio + Claude (RESEARCH-005 v1.8)`
- Replaced by: `TASK-620.3 (Service Module Composer with Native Nesting)`
- Domain: `data` / `ui`

## Why Cancelled

Tras conversacion 2026-04-25 con owner sobre el composer de service bundles, se decidio que **servicios anidados son una capacidad de dia 1** — no un feature avanzado opcional como lo planteaba esta task originalmente.

La decision tecnica robusta es construir el composer **una sola vez** con soporte nesting nativo desde la primera version, en vez de:

1. Construir composer flat primero
2. Refactorizar 3-4 dias despues para agregar nesting

Esto evita ~3 dias de refactor + tests duplicados + riesgo de bugs introducidos al refactorizar UI estable.

## What Replaces This Task

**TASK-620.3 — Service Module Composer with Native Nesting** absorbe completamente el alcance de esta task:

- Schema `service_module_children` + cycle detection se crean en **TASK-620** (no aqui)
- Composer recursivo con depth max 3 + cycle detection UI en **TASK-620.3**
- Constraints `cross_subservice` + `whole_tree` (que solo son posibles con nesting) en **TASK-620.3**
- Override pricing pct per child sub-service en **TASK-620.3**
- Optional flag per child en **TASK-620.3**

## Context Original

Esta task fue creada en RESEARCH-005 v1.1 (2026-04-24) como feature P2 fase 5 ("scale, diferible") con racional "feature avanzada que rara vez se usa". El owner clarifico el 2026-04-25 que el modelo de Efeonce **requiere nesting** desde dia 1 para casos como:

```
Brand Launch Premium (parent)
├─ Brand Foundation Package (sub-service)
├─ Content Production Package (sub-service)
└─ Launch Campaign Package (sub-service)
```

Sin nesting cada quote de "Brand Launch Premium" requeriria listar 15+ line items planos manualmente.

## Closing Protocol

- [x] `Lifecycle` cambiado a `cancelled`
- [x] Movido de `to-do/` a `cancelled/`
- [x] `TASK_ID_REGISTRY.md` actualizado con status `cancelled` + nota
- [x] `docs/research/RESEARCH-005-cpq-gap-analysis-and-hardening-plan.md` Delta v1.8 documenta la absorcion
