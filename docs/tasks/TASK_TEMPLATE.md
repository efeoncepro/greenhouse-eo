# TASK_TEMPLATE.md

## Objetivo
Plantilla canonica para crear y leer tasks del proyecto sin depender de memoria conversacional.

Las tasks nuevas deben usar IDs estables `TASK-###`.
Los `CODEX_TASK_*` existentes siguen vigentes como legacy hasta su migracion.

## Convencion de ID y nombre

- ID canonico para tasks nuevas: `TASK-###`
- El `###` es un identificador estable, no el orden mutable del backlog
- El orden actual de ejecucion debe vivir en `Rank` y en el panel operativo, no en renumeraciones
- Nombre de archivo recomendado:
  - `docs/tasks/to-do/TASK-003-finance-dashboard-calculation-correction.md`
  - `docs/tasks/in-progress/TASK-003-finance-dashboard-calculation-correction.md`
  - `docs/tasks/complete/TASK-003-finance-dashboard-calculation-correction.md`
- Titulo H1 recomendado:
  - `# TASK-003 - Finance Dashboard Calculation Correction`
- Titulo de issue recomendado:
  - `[TASK-003] Finance Dashboard Calculation Correction`
- Si la task nace desde un brief legacy, agregar:
  - `- Legacy ID: CODEX_TASK_Finance_Dashboard_Calculation_Correction_v1`

## Como interpretar una task rapido

Leer en este orden:

1. `## Status`
2. `## Summary`
3. `## Goal`
4. `## Dependencies & Impact`
5. `## Current Repo State`
6. `## Scope`
7. `## Acceptance Criteria`
8. `## Verification`

Regla de lectura:

- `ID` responde que task es
- `Lifecycle` responde donde vive en el pipeline (`to-do`, `in-progress`, `complete`)
- `Priority`, `Impact`, `Effort` y `Rank` responden que tan urgente y grande es
- `Dependencies & Impact` responde que bloquea y que puede romper
- `Files owned` responde donde un agente debe asumir coordinacion explicita
- `Acceptance Criteria` responde que significa cerrar la task
- `Verification` responde como comprobarla
- `GitHub Issue` y `GitHub Project` responden donde se sigue operativamente
- `TASK_ID_REGISTRY.md` responde que IDs ya están reservados y cuál sigue

## Cuando crear una task nueva

Crear una task nueva si:

- el trabajo abre una lane con objetivo propio
- necesita su propio bloque `Dependencies & Impact`
- tiene archivos owned diferenciables
- tiene criterios de aceptacion propios

Actualizar una task existente si:

- el trabajo es un slice mas de la misma lane
- el objetivo sigue siendo el mismo
- los archivos owned y dependencias no cambian de manera material

Reclasificar a spec y no dejarlo como task si:

- el documento ya no describe un backlog ejecutable
- fija arquitectura o contratos de dominio mas que slices implementables
- no tiene un gap operativo claro para ejecutar

## Campos minimos obligatorios

Toda task nueva debe incluir:

- `## Status`
- `## Summary`
- `## Why This Task Exists`
- `## Goal`
- `## Architecture Alignment`
- `## Dependencies & Impact`
- `## Current Repo State`
- `## Scope`
- `## Out of Scope`
- `## Acceptance Criteria`
- `## Verification`

Opcionales recomendados:

- `## Delta YYYY-MM-DD`
- `## Open Questions`
- `## Rollout Notes`
- `## Follow-ups`

## Semantica de Status

Usar estos campos dentro de `## Status`:

- `Lifecycle`: `to-do`, `in-progress`, `complete`
- `Priority`: `P0`, `P1`, `P2`, `P3`
- `Impact`: `Muy alto`, `Alto`, `Medio`
- `Effort`: `Bajo`, `Medio`, `Alto`
- `Status real`: `Diseño`, `Parcial`, `Avanzada`, `Cerrada`, `Referencia`
- `Rank`: posicion actual en backlog operativo
- `Domain`: modulo o area principal

Reglas:

- `TASK-###` no cambia cuando cambia el backlog
- `Rank` si puede cambiar
- `Lifecycle` cambia cuando el archivo se mueve entre `to-do/`, `in-progress/` y `complete/`
- `Status real` describe madurez de runtime, no solo estado administrativo

## Template canonico

```md
# TASK-### - [Short Title]

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `[finance|hr|platform|identity|ui|data|ops]`
- Legacy ID: `[optional]`
- GitHub Project: `[optional]`
- GitHub Issue: `[optional]`

## Summary

[Que cambia en 2-4 lineas y por que importa]

## Why This Task Exists

[Problema actual, deuda, contradiccion o gap real]

## Goal

- [Resultado 1]
- [Resultado 2]
- [Resultado 3]

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- [arquitectura especializada aplicable]

Reglas obligatorias:

- [regla 1]
- [regla 2]
- [regla 3]

## Dependencies & Impact

### Depends on

- [task, tabla, schema, API o spec]

### Impacts to

- [otras tasks o superficies afectadas]

### Files owned

- `src/...`
- `docs/...`

## Current Repo State

### Ya existe

- [foundation ya materializada]

### Gap actual

- [que sigue roto, faltante o ambiguo]

## Scope

### Slice 1 - [nombre]

- [entregable]
- [entregable]

### Slice 2 - [nombre]

- [entregable]
- [entregable]

## Out of Scope

- [explicitar que no se mezcla aqui]

## Acceptance Criteria

- [ ] [criterio verificable]
- [ ] [criterio verificable]
- [ ] [criterio verificable]

## Verification

- `pnpm lint`
- `pnpm test`
- [validacion manual o preview]
```

## Checklist para quien escribe

- El titulo deja claro el objetivo sin leer todo el documento
- La task tiene un solo objetivo principal
- `Dependencies & Impact` nombra tareas y archivos reales
- `Files owned` es lo bastante concreto como para detectar choques
- `Acceptance Criteria` permite decidir cierre sin interpretacion subjetiva
- `Out of Scope` evita mezclar refactor, infraestructura y producto en la misma lane
- Si la task contradice arquitectura, primero corregir la task o documentar la nueva decision

## Checklist para quien la toma

- Leer `project_context.md` y `Handoff.md`
- Leer la arquitectura base y la especializada aplicable
- Confirmar si la task sigue vigente en `docs/tasks/README.md`
- Moverla de carpeta si cambia `Lifecycle`
- Actualizar `Handoff.md` y `changelog.md` cuando haya impacto real
- Ejecutar chequeo de impacto cruzado al cerrarla
