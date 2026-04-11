# TASK-377 — Kortex Operational Intelligence Bridge

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `policy`
- Status real: `Cerrada`
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
- `docs/architecture/GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`
- `docs/tasks/to-do/TASK-039-data-node-architecture-v1.md`
- `docs/tasks/to-do/TASK-040-data-node-architecture-v2.md`

Reglas obligatorias:

- Kortex se trata como peer system, no como modulo de Greenhouse.
- El primer bridge Kortex debe ser read-only.
- La task no puede depender de DB shared ni secrets shared.
- El output debe servir como handoff bilateral sin tocar el repo Kortex desde esta lane.

## Normative Docs

- `docs/architecture/GREENHOUSE_KORTEX_VISUAL_PRESET_V1.md`
- `docs/tasks/to-do/TASK-265-greenhouse-nomenclature-dictionary-kortex-copy-contract.md`
- `docs/tasks/complete/TASK-375-sister-platforms-identity-tenancy-binding-foundation.md`
- `docs/tasks/complete/TASK-376-sister-platforms-read-only-external-surface-hardening.md`
- `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.md`

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

- `docs/tasks/complete/TASK-377-kortex-operational-intelligence-bridge.md`
- `docs/architecture/GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`

## Current Repo State

### Already exists

- Kortex ya esta reconocido como repo hermano operativo.
- Existe preset visual reusable Greenhouse -> Kortex.
- Existe framing de API/MCP downstream para que Greenhouse exponga contexto operativo.
- La foundation sister-platform ya esta materializada en runtime:
  - `greenhouse_core.sister_platform_bindings`
  - `greenhouse_core.sister_platform_consumers`
  - `greenhouse_core.sister_platform_request_logs`
  - lane endurecido `/api/integrations/v1/sister-platforms/*`
- El anexo Kortex ya define el split de ownership y el pattern recomendado.

### Gap

- No existe todavia una policy ejecutable de que consume primero Kortex desde Greenhouse.
- No esta definido el onboarding Greenhouse-side del consumer Kortex.
- No existe handoff multi-repo canonico para pasar de anexo arquitectonico a implementacion bilateral.
- No existe todavia un runtime Kortex-specific dentro de `src/app`; el bridge real hoy es solo foundation reusable + namespace `kortex`.

## Audit Delta

Reality check ejecutado antes de implementar:

- `TASK-039` se conserva como vision de producto, pero no debe implementarse literalmente; la baseline tecnica vigente es `TASK-040`.
- `docs/architecture/schema-snapshot-baseline.sql` no incluye aun las tablas sister-platform nuevas. Para esta lane, la fuente viva actual es:
  - `migrations/20260411192943501_sister-platform-bindings-foundation.sql`
  - `migrations/20260411201917370_sister-platform-read-surface-hardening.sql`
  - `src/types/db.d.ts`
- La base reutilizable ya existe; el trabajo real de `TASK-377` no es abrir otra foundation sino cerrar:
  - consumer profile inicial de Kortex
  - capabilities prioritarias por madurez real
  - split Greenhouse-side vs Kortex-side

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

Decision cerrada en esta task:

1. Primera ola Kortex:
   - `operator console`
   - servicios server-to-server asociados
2. Auth:
   - consumer dedicado en `greenhouse_core.sister_platform_consumers`
   - lane endurecido `/api/integrations/v1/sister-platforms/*`
3. Binding recomendado:
   - `external_scope_type = 'portal'`
   - `external_scope_id = <hubspot_portal_id o portal_id canonico>`
   - `installation_id` y metadata relacionada quedan como complemento, no como raíz del binding
4. Greenhouse scope allowlist inicial:
   - `client`
   - `space`
   - `organization` solo por excepción explícita
   - `internal` fuera de la primera ola
5. Capability intake por madurez real:
   - ola 1:
     - `delivery / ICO`
     - `project health`
     - `organization / space summaries`
   - ola 2:
     - `sprints / cycles summary`
   - ola 3:
     - `assigned team / capacity summary`
6. Queda diferido:
   - MCP
   - writes Kortex -> Greenhouse
   - payloads narrativos o advisory que no dependan de serving maduro

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Existe un consumer profile inicial de Kortex definido desde Greenhouse.
- [x] Queda explicitado el primer set de capabilities Greenhouse -> Kortex.
- [x] La policy deja claro el split Greenhouse-side vs Kortex-side.
- [x] El bridge inicial sigue siendo read-only y tenant-safe.

## Verification

- Revisión manual del anexo Kortex contra esta policy.
- Revisión manual de consistencia con `TASK-375`, `TASK-376` y `TASK-039`.

## Closing Protocol

- [x] Dejar explicitado en `Handoff.md` si la siguiente acción natural vive en Greenhouse o en Kortex.
- [x] Si la policy cambia el anexo Kortex, actualizar el doc antes de cerrar la task.

## Follow-ups

- Tasks espejo en el repo `efeoncepro/kortex` para consumir la surface Greenhouse una vez que la foundation exista.
- Future consumer patterns para sister platforms posteriores como Verk.

## Open Questions

- Resuelto en esta task: la primera ola queda limitada a `operator console / server-side`; `agents` y `MCP` pasan a follow-on posterior.

## Delta 2026-04-11 — cierre real

- Se corrigió la task para usar como baseline técnica `TASK-040` y el runtime sister-platform ya materializado por `TASK-375` / `TASK-376`.
- Se cerró el primer handoff Greenhouse-side para Kortex con estas decisiones:
  - consumer inicial `operator console / server-side`
  - bridge `read-only`
  - binding inicial por `portal`
  - allowlist inicial `client` + `space`, con `organization` solo por excepción
  - capability intake por madurez real:
    - `delivery / ICO`
    - `project health`
    - `organization / space summaries`
    - `sprints` después
    - `assigned team / capacity` como resumen posterior
- No se implementó runtime Kortex-specific en este repo porque la foundation reusable actual ya cubre el contrato base y esta task es `policy + architecture + handoff`, no un nuevo lane de código.
- El follow-on natural queda dividido así:
  - Greenhouse: declarar consumer/bindings piloto y abrir payloads operativos read-only estables
  - Kortex: implementar el consumer real y componer el contexto en operator console / CRM reasoning
