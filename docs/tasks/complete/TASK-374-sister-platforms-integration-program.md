# TASK-374 — Sister Platforms Integration Program

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `umbrella`
- Status real: `Completada`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-374-sister-platforms-integration-program`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Formalizar y bajar a backlog ejecutable la integracion de Greenhouse con plataformas hermanas del ecosistema Efeonce. Esta umbrella ya queda cerrada como task de programa: deja el contrato marco, el anexo Kortex, la secuencia de follow-ons y el reality check del repo actual para que `TASK-375`, `TASK-376` y `TASK-377` arranquen sin supuestos rotos. Debe dejar la puerta abierta para futuras apps como Verk sin duplicar el trabajo base.

## Why This Task Exists

Greenhouse ya reconoce a Kortex como repo hermano, ya tiene un preset visual reusable y ya tiene una direccion de API/MCP para exponer operational intelligence. Lo que faltaba era un contrato transversal que ordene la relacion con apps hermanas como peer systems y no como modulos embebidos. Sin una umbrella, la implementacion posterior tenderia a abrir lanes aisladas de API, auth, MCP y mapping sin una secuencia defendible ni reusable para futuras plataformas.

## Goal

- Coordinar la materializacion Greenhouse-side del contrato de sister platforms.
- Ejecutar primero la foundation reusable y despues el primer carril Kortex.
- Dejar la base lista para que futuras plataformas del ecosistema, por ejemplo Verk, entren por el mismo marco sin reabrir la arquitectura base.
- Cerrar la umbrella como artefacto de programa y no como task de runtime.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `docs/architecture/GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`

Reglas obligatorias:

- Greenhouse y las sister platforms se integran como peer systems.
- Runtime isolation sigue siendo la regla por defecto.
- Ningun follow-on puede asumir write access cross-platform sin contrato especifico adicional.
- La foundation reusable debe preceder a cualquier integracion Kortex-specific.

## Normative Docs

- `docs/tasks/to-do/TASK-039-data-node-architecture-v1.md`
- `docs/tasks/to-do/TASK-040-data-node-architecture-v2.md`
- `docs/tasks/to-do/TASK-265-greenhouse-nomenclature-dictionary-kortex-copy-contract.md`
- `docs/architecture/GREENHOUSE_KORTEX_VISUAL_PRESET_V1.md`

## Dependencies & Impact

### Depends on

- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `docs/architecture/GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`
- `docs/tasks/to-do/TASK-039-data-node-architecture-v1.md`
- `docs/tasks/to-do/TASK-040-data-node-architecture-v2.md`

### Blocks / Impacts

- `TASK-375`
- `TASK-376`
- `TASK-377`
- futuras annexes o onboarding contracts para sister platforms como Verk

### Files owned

- `docs/tasks/complete/TASK-374-sister-platforms-integration-program.md`
- `docs/tasks/to-do/TASK-375-sister-platforms-identity-tenancy-binding-foundation.md`
- `docs/tasks/to-do/TASK-376-sister-platforms-read-only-external-surface-hardening.md`
- `docs/tasks/to-do/TASK-377-kortex-operational-intelligence-bridge.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `docs/architecture/GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md` ya reconoce a `kortex` como repo hermano operativo.
- `docs/architecture/GREENHOUSE_KORTEX_VISUAL_PRESET_V1.md` ya formaliza la capa visual institucional reusable.
- `TASK-265` ya deja planteado el copy contract reusable para Kortex.
- `TASK-039` y `TASK-040` ya plantean el carril read API + MCP downstream para consumers externos.
- El repo ya tiene una surface externa real en `/api/integrations/v1/*` con auth M2M y snapshots tenant/capability.
- El repo ya tiene foundations fuertes de tenant/session/access y bindings externos parciales (`SCIM`, `Notion`) reutilizables para el programa.

### Gap

- Antes de esta task no existia una umbrella que ordenara la implementacion reusable de sister-platform integration.
- No existia una lectura explícita de la realidad actual del repo: `/api/v1/*` y MCP siguen sin runtime real; la surface viva hoy es `/api/integrations/v1/*`.
- No estaba separado con suficiente claridad que `TASK-374` es coordinación documental/programática, mientras que el runtime pertenece a `TASK-375`, `TASK-376` y `TASK-377`.

## Audit Delta

Reality check ejecutado antes del cierre de la umbrella:

- `TASK-039` debe leerse como spec legacy de visión; la baseline técnica real para follow-ons es `TASK-040`.
- El repo **no** tiene todavía `src/app/api/v1/*` implementado ni server MCP. Los follow-ons deben partir desde `/api/integrations/v1/*` y desde las foundations de `tenant access`.
- El repo **sí** tiene foundations reutilizables que reducen riesgo para el programa:
  - `src/lib/tenant/access.ts`
  - `src/lib/tenant/get-tenant-context.ts`
  - `src/lib/tenant/authorization.ts`
  - `src/lib/integrations/integration-auth.ts`
  - `src/lib/integrations/greenhouse-integration.ts`
  - `src/lib/scim/provisioning.ts`
- El schema real **no** tiene todavía una tabla canónica de `sister-platform bindings`; ese gap queda derivado a `TASK-375`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Foundation reusable

- Coordinar `TASK-375` como foundation de identity and tenancy binding cross-platform.
- Coordinar `TASK-376` como foundation de read surface y consumer auth para sister platforms.

### Slice 2 — First consumer

- Coordinar `TASK-377` como primer carril Kortex-specific sobre la foundation reusable.
- Dejar explícito que Verk entra despues como future annex y no como branch paralela de la foundation base.

## Out of Scope

- Implementar el runtime de las child tasks dentro de esta umbrella.
- Modificar el repo `efeoncepro/kortex`.
- Abrir una annex de Verk antes de tener repo o baseline real equivalente.
- Abrir `API v1` o `MCP` solo para “cerrar” esta umbrella.

## Detailed Spec

La umbrella debe leerse con esta secuencia:

1. contrato marco
2. anexo Kortex
3. reality check del repo actual
4. identity and tenancy binding foundation
5. read-only external surface hardening
6. Kortex operational bridge

Reality check mínimo que esta umbrella deja explícito:

- hoy la surface externa viva es `/api/integrations/v1/*`
- `API v1` sister-platform-neutral sigue pendiente
- `MCP` sigue downstream de una API estable y no debe adelantarse

Verk o cualquier future sister platform deben consumir la misma foundation de los pasos 4 y 5 antes de abrir anexos o bridges propios.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] La umbrella deja explícita la secuencia entre foundation reusable y consumer Kortex.
- [x] Las child tasks cubren binding, read surface y bridge Kortex sin solaparse.
- [x] La relación con futuras sister platforms como Verk queda expresamente prevista sin abrir implementación prematura.
- [x] La umbrella deja explícita la diferencia entre runtime existente (`/api/integrations/v1/*`) y runtime todavía pendiente (`/api/v1/*`, `MCP`).
- [x] La umbrella queda cerrada como task de programa y deja el runtime a los follow-ons correctos.

## Verification

- Revisión manual de consistencia entre contrato marco, anexo Kortex y child tasks.
- Revisión manual de no-solapamiento con `TASK-039`, `TASK-040`, `TASK-265` y `TASK-372`.
- Auditoría del repo real sobre:
  - tenancy/access
  - surfaces de integración externas
  - schema snapshot y bindings existentes

## Closing Protocol

- [x] Mantener visible en `docs/tasks/README.md` que `TASK-375` a `TASK-377` continúan como follow-ons activos del programa.
- [x] Si se crea una annex futura para otra sister platform, derivarla desde esta umbrella o explicitar por qué no.
- [x] Mover `TASK-374` a `complete` una vez formalizado el programa y corregidos los supuestos del repo actual.

## Follow-ups

- Future annex para Verk cuando exista baseline de repo/arquitectura equivalente.
- Event bridge, analytical exchange y deep-link contracts despues del read-path base.
- `TASK-375` para binding canónico sister-platform -> Greenhouse.
- `TASK-376` para hardening de read surface y auth externa por consumer/scope.
- `TASK-377` para el primer carril Greenhouse -> Kortex sobre la foundation reusable.

## Open Questions

- Si el primer binding cross-platform debe vivir enteramente en Greenhouse o como contrato bilateral con ownership dual.
- Cuanto de la lane `TASK-039` puede ejecutarse como foundation sister-platform sin esperar consumers externos publicos.
- Si la future `API v1` debe nacer como evolución de `/api/integrations/v1/*` o como carril nuevo con auth y shape distintos.
