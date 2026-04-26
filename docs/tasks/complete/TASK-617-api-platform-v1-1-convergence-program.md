# TASK-617 — API Platform V1.1 Convergence Program

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `umbrella`
- Epic: `[optional EPIC-###]`
- Status real: `Cerrada documentalmente; child tasks 617.1-617.4 completas`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-617-api-platform-v1-1-convergence-program`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

Programa de convergencia de la `API platform` después de `TASK-616`. Ordena cuatro follow-ups inmediatos y dependientes entre sí: hardening REST, lane first-party para app móvil React Native, event control plane y developer documentation pública. Su objetivo es evitar que el siguiente tramo de la plataforma crezca como tareas aisladas o que `MCP` se adelante a contratos todavía inmaduros.

## Why This Task Exists

`TASK-616` ya dejó foundation runtime y una primera lane `ecosystem` read-only operativa, pero la arquitectura nueva también dejó explícitas varias brechas que no conviene resolver de forma dispersa:

- la lane nueva todavía necesita hardening REST real
- la app móvil first-party `React Native` ya es un consumer previsto de la plataforma
- webhooks/event delivery existen en runtime, pero todavía no convergen como control plane de `api/platform/*`
- existe un primer intento de portal público `/developers/api`, pero sigue atado a `integrations/v1`

Si estos follow-ups se abren sin coordinación, Greenhouse corre el riesgo de:

- abrir writes antes de endurecer contratos base
- documentar surfaces que todavía no son canónicas
- conectar mobile a rutas internas web por conveniencia
- o empezar `MCP` sobre una plataforma todavía a medio converger

## Goal

- Coordinar el tramo `V1.1` de la `API platform` como programa explícito y secuenciado.
- Mantener `MCP` downstream de contratos ya endurecidos.
- Alinear runtime, developer docs y first-party app surface con la arquitectura canónica ya aprobada.

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
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`

Reglas obligatorias:

- `TASK-616` sigue siendo la foundation runtime ya implementada; este programa la expande, no la reabre.
- La `API platform` debe servir no solo a `ecosystem`, sino también a first-party app consumers como la futura app móvil `React Native`.
- `webhooks / event delivery` deben converger como parte de `api/platform/*`, no seguir viviendo solo como capability operativa separada.
- La documentación pública para developers debe montarse sobre la plataforma nueva, no quedar anclada a `integrations/v1` como source of truth.
- `MCP` sigue downstream de este programa; el siguiente slice ejecutable debe ser read-only y montado sobre `api/platform/ecosystem/*`.

## Normative Docs

- `docs/documentation/plataforma/api-platform-ecosystem.md`
- `docs/api/GREENHOUSE_API_REFERENCE_V1.md`
- `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.md`
- `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.openapi.yaml`
- `project_context.md`
- `Handoff.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-616-api-platform-foundation-ecosystem-read-surface-v1.md`
- `src/lib/api-platform/**`
- `src/app/api/platform/ecosystem/**`
- `src/app/(blank-layout-pages)/developers/api/page.tsx`
- `src/lib/webhooks/**`
- `src/app/api/webhooks/**`

### Blocks / Impacts

- follow-ups de writes platform-wide
- formalización de la surface móvil first-party
- convergencia del portal `/developers/api`
- foundation futura de `MCP`

### Files owned

- `docs/tasks/complete/TASK-617-api-platform-v1-1-convergence-program.md`
- `docs/tasks/complete/TASK-617.1-api-platform-rest-hardening.md`
- `docs/tasks/complete/TASK-617.2-api-platform-first-party-app-surface-foundation.md`
- `docs/tasks/complete/TASK-617.3-api-platform-event-control-plane.md`
- `docs/tasks/complete/TASK-617.4-developer-api-documentation-portal.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `Handoff.md`

## Current Repo State

### Already exists

- `TASK-616` ya dejó una lane `ecosystem` read-only y foundation `src/lib/api-platform/**`.
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` ya define REST hardening, lane `app`, event control plane, developer docs públicas y relación downstream con `MCP`.
- `src/app/(blank-layout-pages)/developers/api/page.tsx` ya existe como primer intento público para developers.
- `src/lib/webhooks/**` y `src/app/api/webhooks/**` ya implementan inbound/outbound webhook runtime.
- `TASK-617.1` cerró el REST hardening de `api/platform/ecosystem/*`.
- `TASK-617.2` cerró la foundation first-party `api/platform/app/*`.
- `TASK-617.3` cerró el event control plane bajo `api/platform/ecosystem/*`.
- `TASK-617.4` cerró el portal público `/developers/api` y los artefactos derivados de API Platform.

### Gap

- el programa V1.1 ya está cerrado; los gaps residuales pasan a follow-ups explícitos
- todavía falta una task ejecutable para el MCP read-only downstream
- todavía falta una task separada para idempotencia transversal antes de abrir writes MCP o business writes amplios

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

### Slice 1 — REST hardening

- Ejecutar `TASK-617.1` para endurecer la lane `ecosystem` ya implementada.

### Slice 2 — First-party app surface

- Ejecutar `TASK-617.2` para abrir la lane `app` y la estrategia de consumer first-party móvil.

### Slice 3 — Event control plane

- Ejecutar `TASK-617.3` para converger `webhooks / event delivery` dentro de `api/platform/*`.

### Slice 4 — Developer documentation portal

- Ejecutar `TASK-617.4` para evolucionar `/developers/api` y la documentación derivada hacia la plataforma nueva.

## Out of Scope

- Implementar `MCP` dentro de este programa.
- Abrir una `public API` general con billing/governance completos.
- Mezclar refactors masivos de módulos legacy no relacionados con la plataforma API.

## Detailed Spec

El orden canónico de este programa es:

1. `TASK-617.1` — REST hardening
2. `TASK-617.2` — first-party app surface
3. `TASK-617.3` — event control plane
4. `TASK-617.4` — developer documentation portal

La intención es que Greenhouse llegue a un punto donde:

- `api/platform/ecosystem/*` esté endurecida y sea referencia externa controlada
- `api/platform/app/*` quede planteada como backend contract de la app `React Native`
- `webhooks` ya no queden solo como runtime de transporte, sino como control plane convergido
- la experiencia pública para developers deje de ser un snapshot legacy

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Existen child tasks registradas y secuenciadas para REST hardening, first-party app surface, event control plane y developer docs públicas.
- [x] La secuencia deja explícito que `MCP` sigue downstream de este programa.
- [x] La relación entre `TASK-616` y estos follow-ups queda documentada sin reabrir la foundation ya implementada.

## Verification

- revisión manual de consistencia documental
- verificación de referencias cruzadas entre task, arquitectura y registry

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [x] las child tasks `TASK-617.1` a `TASK-617.4` quedaron alineadas con la arquitectura vigente

## Follow-ups

- `TASK-617.1` — API Platform REST Hardening — complete
- `TASK-617.2` — API Platform First-Party App Surface Foundation — complete
- `TASK-617.3` — API Platform Event Control Plane — complete
- `TASK-617.4` — Developer API Documentation Portal — complete
- `TASK-647` — Greenhouse MCP Read-Only Adapter V1

## Delta 2026-04-26

- `TASK-617` se cierra documentalmente porque sus cuatro child tasks ya están completas y sincronizadas con runtime, docs públicos y arquitectura.
- El siguiente paso queda separado como `TASK-647`: MCP read-only downstream sobre `api/platform/ecosystem/*`.
- Los writes MCP quedan explícitamente fuera hasta que exista idempotencia transversal en `src/lib/api-platform/**` y command endpoints suficientemente maduros.
