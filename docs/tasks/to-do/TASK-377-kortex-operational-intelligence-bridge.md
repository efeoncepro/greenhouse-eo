# TASK-377 — Kortex Operational Intelligence Bridge

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `policy`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `TASK-375`, `TASK-376`
- Branch: `task/TASK-377-kortex-operational-intelligence-bridge`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Definir el primer bridge operativo concreto entre Greenhouse y Kortex sobre la nueva foundation reusable. La task debe traducir el anexo Kortex a un plan ejecutable Greenhouse-side: que lee Kortex, con que auth, con que tenancy binding, bajo que governance y con que fases de adopcion.

## Why This Task Exists

Kortex ya es sister platform activa del ecosistema y ya tiene doc propia que lo posiciona como peer system de Greenhouse. Tambien existe una vision clara de `Greenhouse as operational intelligence provider` en `TASK-039`, pero todavia no hay una task que aterrice ese bridge concreto sin mezclarlo con la foundation reusable ni con la implementacion del repo Kortex. Hace falta una lane que conecte ambos lados con un contrato operativo defendible.

## Goal

- Bajar el anexo Kortex a una policy ejecutable de integracion Greenhouse-side.
- Definir el primer set de capabilities Greenhouse que Kortex debe consumir.
- Dejar el handoff multi-repo listo para la implementacion posterior en Greenhouse y en Kortex.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `docs/architecture/GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`
- `docs/tasks/to-do/TASK-039-data-node-architecture-v1.md`

Reglas obligatorias:

- Kortex se trata como peer system, no como modulo de Greenhouse.
- El primer bridge Kortex debe ser read-only.
- La task no puede depender de DB shared ni secrets shared.
- El output debe servir como handoff bilateral sin tocar el repo Kortex desde esta lane.

## Normative Docs

- `docs/architecture/GREENHOUSE_KORTEX_VISUAL_PRESET_V1.md`
- `docs/tasks/to-do/TASK-265-greenhouse-nomenclature-dictionary-kortex-copy-contract.md`
- `docs/tasks/to-do/TASK-375-sister-platforms-identity-tenancy-binding-foundation.md`
- `docs/tasks/to-do/TASK-376-sister-platforms-read-only-external-surface-hardening.md`

## Dependencies & Impact

### Depends on

- `TASK-375`
- `TASK-376`
- `docs/architecture/GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`

### Blocks / Impacts

- future Greenhouse -> Kortex MCP/read-surface implementation
- future cross-repo tasking in `efeoncepro/kortex`
- later annexes for sister platforms that want to emulate the Kortex pattern

### Files owned

- `docs/tasks/to-do/TASK-377-kortex-operational-intelligence-bridge.md`
- `docs/architecture/GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`

## Current Repo State

### Already exists

- Kortex ya esta reconocido como repo hermano operativo.
- Existe preset visual reusable Greenhouse -> Kortex.
- Existe framing de API/MCP downstream para que Greenhouse exponga contexto operativo.
- El anexo Kortex ya define el split de ownership y el pattern recomendado.

### Gap

- No existe todavia una policy ejecutable de que consume primero Kortex desde Greenhouse.
- No esta definido el onboarding Greenhouse-side del consumer Kortex.
- No existe handoff multi-repo canonico para pasar de anexo arquitectonico a implementacion bilateral.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — First Kortex consumer profile

- Definir el perfil concreto del consumer Kortex desde Greenhouse:
  - audience
  - auth
  - tenancy binding
  - allowed scopes
  - observabilidad minima

### Slice 2 — Capability intake

- Definir que capabilities Greenhouse expone primero a Kortex:
  - kpis operativos
  - proyectos y health resumida
  - ciclos/sprints
  - follow-ons de assigned team o capacity cuando maduren

### Slice 3 — Multi-repo handoff

- Dejar handoff explicito para la implementacion posterior en Greenhouse y Kortex.
- Explicitar que parte queda de este lado y que parte vive aguas afuera en `efeoncepro/kortex`.

## Out of Scope

- Implementar el bridge runtime en el repo Kortex.
- Abrir writes Kortex -> Greenhouse.
- Expandir el carril a una app futura como Verk en esta misma task.

## Detailed Spec

La task debe cerrar una policy bilateral minima:

1. como Kortex se identifica frente a Greenhouse
2. que binding usa
3. que surface lee
4. que capabilities consume primero
5. que no puede hacer
6. que follow-on queda del lado Kortex

El output debe ser suficientemente concreto para que luego se abran tasks espejo en Kortex sin re-diseñar el contrato.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un consumer profile inicial de Kortex definido desde Greenhouse.
- [ ] Queda explicitado el primer set de capabilities Greenhouse -> Kortex.
- [ ] La policy deja claro el split Greenhouse-side vs Kortex-side.
- [ ] El bridge inicial sigue siendo read-only y tenant-safe.

## Verification

- Revisión manual del anexo Kortex contra esta policy.
- Revisión manual de consistencia con `TASK-375`, `TASK-376` y `TASK-039`.

## Closing Protocol

- [ ] Dejar explicitado en `Handoff.md` si la siguiente acción natural vive en Greenhouse o en Kortex.
- [ ] Si la policy cambia el anexo Kortex, actualizar el doc antes de cerrar la task.

## Follow-ups

- Tasks espejo en el repo `efeoncepro/kortex` para consumir la surface Greenhouse una vez que la foundation exista.
- Future consumer patterns para sister platforms posteriores como Verk.

## Open Questions

- Si el primer consumer Kortex debe vivir solo en operator console/server-side o si los agents entran en la misma ola.
