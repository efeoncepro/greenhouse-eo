# Task Template

Plantilla copiable para crear tasks nuevas. Para el protocolo completo (Plan Mode, Skill, Subagent, derivacion de Checkpoint/Mode, Lightweight Mode), ver [`TASK_PROCESS.md`](TASK_PROCESS.md).

> **Convivencia de formatos:** las tasks nuevas usan `TASK-###` y nacen desde esta plantilla. En el backlog existen tasks legacy creadas con el formato anterior (`CODEX_TASK_*`) que siguen vigentes hasta su cierre o migracion.

---

## Instrucciones

1. Copiar el bloque de template de abajo en un archivo nuevo: `docs/tasks/to-do/TASK-###-short-slug.md`
2. Reservar el ID en `docs/tasks/TASK_ID_REGISTRY.md`
3. Llenar Zone 0 y Zone 1 completas
4. Zone 2 no se llena al crear la task — es responsabilidad del agente que la toma
5. Llenar Zone 3 y Zone 4 con el detalle que tengas disponible
6. Para tasks `umbrella` o `policy`: Zone 3 (Detailed Spec) puede omitirse; Verification es revision manual

---

## Template

```md
# TASK-### — [Short Title]

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `[finance|hr|platform|identity|ui|data|ops|content|crm|delivery|agency]`
- Blocked by: `none`
- Branch: `task/TASK-###-short-slug`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

[Que cambia en 2-4 lineas y por que importa. Esto es lo unico que lee alguien que esta escaneando el backlog.]

## Why This Task Exists

[Problema actual, deuda, contradiccion o gap real. No repite el summary — explica la raiz.]

## Goal

- [Resultado 1]
- [Resultado 2]
- [Resultado 3]

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- [arquitectura especializada aplicable]

Reglas obligatorias:

- [regla 1]
- [regla 2]

## Normative Docs

[Solo si hay documentos adicionales que el agente DEBE leer y que no son arquitectura.]

- [doc con path real]

## Dependencies & Impact

### Depends on

- [task, tabla, schema, API o spec — con path real]

### Blocks / Impacts

- [otras tasks o superficies afectadas]

### Files owned

- `src/...`
- `docs/...`

## Current Repo State

### Already exists

- [foundation ya materializada — con paths reales]

### Gap

- [que sigue roto, faltante o ambiguo]

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — [nombre]

- [entregable concreto]
- [entregable concreto]

### Slice 2 — [nombre]

- [entregable concreto]
- [entregable concreto]

## Out of Scope

- [explicitar que NO se mezcla aqui]

## Detailed Spec

[Seccion expandible. Aqui va el detalle pesado: schemas SQL, API routes,
component specs, data flows, pseudocodigo, wireframes de referencia.

Puede omitirse si el Scope ya es suficiente o si la task es umbrella/policy.]

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] [criterio verificable]
- [ ] [criterio verificable]
- [ ] [criterio verificable]

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- [validacion manual o preview]

## Closing Protocol

[Solo items especificos de esta task. El protocolo generico de cierre
(mover archivo, actualizar README, Handoff.md, changelog.md, chequeo
de impacto cruzado) esta en CLAUDE.md § Task Lifecycle Protocol.]

- [ ] [item especifico de esta task]

## Follow-ups

- [tasks derivadas, issues pendientes, o deuda tecnica identificada]

## Delta YYYY-MM-DD

[Opcional. Registra cambios materiales a la task despues de su creacion.]

## Open Questions

[Opcional. Decisiones que no pudieron resolverse durante el diseno.]
```
