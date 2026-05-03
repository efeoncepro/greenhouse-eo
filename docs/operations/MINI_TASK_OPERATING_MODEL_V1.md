# Greenhouse EO — Mini Task Operating Model V1

> Version: 1.0
> Created: 2026-04-13
> Audience: agents, developers, maintainers capturing small planned improvements

## Purpose

Formalizar una lane liviana para cambios pequeños que no deben ejecutarse "al vuelo", pero que tampoco justifican una `TASK-###` completa ni describen una falla reactiva como `ISSUE-###`.

Aunque sea liviana, una mini-task no autoriza parches fragiles. Si durante discovery aparece causa raiz compartida, contrato roto o necesidad de resiliencia/seguridad/escalabilidad, aplicar `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md` y promover a `TASK-###`.

## Canonical Locations

- Tracker: `docs/mini-tasks/README.md`
- Template: `docs/mini-tasks/MINI_TASK_TEMPLATE.md`
- ID registry: `docs/mini-tasks/MINI_TASK_ID_REGISTRY.md`
- Pipeline:
  - `docs/mini-tasks/to-do/`
  - `docs/mini-tasks/in-progress/`
  - `docs/mini-tasks/complete/`

## When To Create A Mini Task

Crear una `MINI-###` cuando el trabajo es:

- pequeño y claramente acotado
- planificado, no reactivo
- local a una surface, copy, validación o ajuste de data quality
- lo bastante importante para dejar trazabilidad y verificación mínima

Ejemplos típicos:

- dropdown o autocomplete local en un form
- helper text o microcopy de una sola surface
- default o validación puntual
- pequeño fix de consistencia visual o UX

## When Not To Use This Lane

No usar `MINI-###` cuando:

- hay un bug real de runtime, regresión, problema de datos, seguridad o disponibilidad
  - usar `ISSUE-###`
- el trabajo toca arquitectura, múltiples módulos, rollout visible o una foundation reusable significativa
  - usar `TASK-###`
- la incertidumbre es alta y el cambio podría crecer rápido
  - preferir `TASK-###`

## Minimum Contents

Toda mini-task debe capturar:

- resumen breve del cambio
- por qué es mini y no issue/task
- estado actual
- cambio propuesto
- criterios de aceptación
- verificación mínima
- paths o referencias útiles

## Lifecycle

### 1. To Do

Crear el archivo bajo `docs/mini-tasks/to-do/`, registrarlo en el tracker y reservar el ID.

### 2. In Progress

Cuando alguien toma la mini-task:

- mover el archivo a `docs/mini-tasks/in-progress/`
- actualizar `docs/mini-tasks/README.md`
- dejar nota breve en `Handoff.md` si el cambio toca una zona sensible o queda pendiente

### 3. Complete

Cuando el cambio queda aplicado y verificado:

- mover el archivo a `docs/mini-tasks/complete/`
- actualizar `docs/mini-tasks/README.md`
- registrar verificación real ejecutada
- actualizar `Handoff.md` y `changelog.md` si el cambio afecta workflow o comportamiento visible

## Promotion Rules

Promover `MINI-###` a `TASK-###` si durante discovery o ejecución ocurre cualquiera de estas señales:

- aparece dependencia cross-module
- se necesita nueva API, schema o contrato reusable
- el blast radius deja de ser claramente bajo
- la verificación deja de ser local y requiere rollout coordinado
- el cambio local seria solo un parche sobre una causa raiz compartida

Al promover:

- mantener la mini-task como referencia histórica
- enlazar la nueva `TASK-###`
- aclarar en el tracker que la mini-task fue absorbida

## Relationship With Tasks And Issues

Usar esta regla:

- `ISSUE-###` cuando el artefacto principal es un problema real ya observado
- `TASK-###` cuando el artefacto principal es trabajo planificado de alcance medio/alto
- `MINI-###` cuando el artefacto principal es una mejora chica, planificada y local
