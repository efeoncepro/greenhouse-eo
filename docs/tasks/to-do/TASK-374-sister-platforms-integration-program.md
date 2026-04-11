# TASK-374 — Sister Platforms Integration Program

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `umbrella`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-374-sister-platforms-integration-program`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Formalizar y bajar a backlog ejecutable la integracion de Greenhouse con plataformas hermanas del ecosistema Efeonce. El contrato marco ya queda definido a nivel arquitectonico; esta umbrella coordina los follow-ons para tenancy binding, read surfaces, governance y el primer consumer real: Kortex. Debe dejar la puerta abierta para futuras apps como Verk sin duplicar el trabajo base.

## Why This Task Exists

Greenhouse ya reconoce a Kortex como repo hermano, ya tiene un preset visual reusable y ya tiene una direccion de API/MCP para exponer operational intelligence. Lo que faltaba era un contrato transversal que ordene la relacion con apps hermanas como peer systems y no como modulos embebidos. Sin una umbrella, la implementacion posterior tenderia a abrir lanes aisladas de API, auth, MCP y mapping sin una secuencia defendible ni reusable para futuras plataformas.

## Goal

- Coordinar la materializacion Greenhouse-side del contrato de sister platforms.
- Ejecutar primero la foundation reusable y despues el primer carril Kortex.
- Dejar la base lista para que futuras plataformas del ecosistema, por ejemplo Verk, entren por el mismo marco sin reabrir la arquitectura base.

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

### Blocks / Impacts

- `TASK-375`
- `TASK-376`
- `TASK-377`
- futuras annexes o onboarding contracts para sister platforms como Verk

### Files owned

- `docs/tasks/to-do/TASK-374-sister-platforms-integration-program.md`
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

### Gap

- No existia una umbrella que ordene la implementacion reusable de sister-platform integration.
- No esta secuenciado el paso entre contrato arquitectonico y foundation runtime.
- No existe todavia una lane clara para pasar de Kortex como repo hermano reconocido a Kortex como consumer formal de operational intelligence Greenhouse.

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

## Detailed Spec

La umbrella debe leerse con esta secuencia:

1. contrato marco
2. anexo Kortex
3. identity and tenancy binding foundation
4. read-only external surface hardening
5. Kortex operational bridge

Verk o cualquier future sister platform deben consumir la misma foundation de los pasos 3 y 4 antes de abrir anexos o bridges propios.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La umbrella deja explícita la secuencia entre foundation reusable y consumer Kortex.
- [ ] Las child tasks cubren binding, read surface y bridge Kortex sin solaparse.
- [ ] La relación con futuras sister platforms como Verk queda expresamente prevista sin abrir implementación prematura.

## Verification

- Revisión manual de consistencia entre contrato marco, anexo Kortex y child tasks.
- Revisión manual de no-solapamiento con `TASK-039`, `TASK-040`, `TASK-265` y `TASK-372`.

## Closing Protocol

- [ ] Mantener el bloque `TASK-374` a `TASK-377` visible en `docs/tasks/README.md`.
- [ ] Si se crea una annex futura para otra sister platform, derivarla desde esta umbrella o explicitar por qué no.

## Follow-ups

- Future annex para Verk cuando exista baseline de repo/arquitectura equivalente.
- Event bridge, analytical exchange y deep-link contracts despues del read-path base.

## Open Questions

- Si el primer binding cross-platform debe vivir enteramente en Greenhouse o como contrato bilateral con ownership dual.
- Cuanto de la lane `TASK-039` puede ejecutarse como foundation sister-platform sin esperar consumers externos publicos.
