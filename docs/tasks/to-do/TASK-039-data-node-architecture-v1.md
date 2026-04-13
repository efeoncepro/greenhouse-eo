# TASK-039 — Data Node Product Vision (Legacy Reference)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `policy`
- Status real: `Referencia legacy de vision; no ejecutar literalmente`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-039-data-node-product-vision`
- Legacy ID: `Greenhouse_Data_Node_Architecture_v1`
- GitHub Issue: `none`

## Summary

Conservar la visión comercial y estratégica de `Greenhouse as Data Node` como referencia de producto, sin usar este documento como baseline técnica de implementación. `TASK-039` explica el porqué del Data Node y su valor para retención, switching cost y ASaaS, pero cualquier ejecución nueva debe aterrizarse desde `TASK-040` y desde el runtime real del repo.

## Why This Task Exists

La `v1` sigue siendo valiosa porque captura la tesis de negocio correcta: Greenhouse no solo como dashboard, sino como fuente operativa exportable hacia BI, reports, APIs y tooling externo del cliente. Ese framing sigue siendo útil para producto, partnership y narrativa comercial.

El problema es que técnicamente quedó vieja:

- proponía `BigQuery` como control plane de configuración y logs
- asumía `/api/v1/*` y `middleware.ts` como carril base
- justificaba servicios/repos extra demasiado temprano
- no partía del runtime que hoy sí existe en el repo: `/api/integrations/v1/*`, auth helpers, delivery layer y sister-platform bindings

Por eso esta task ya no debe leerse como backlog ejecutable, sino como referencia de visión.

## Goal

- Preservar la visión de producto del Data Node sin seguir empujando supuestos técnicos obsoletos.
- Dejar explícito que la baseline implementable es `TASK-040`.
- Servir como documento de contexto para futuros follow-ons de export, reports, API externa y MCP.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/MULTITENANT_ARCHITECTURE.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `docs/tasks/to-do/TASK-040-data-node-architecture-v2.md`

Reglas obligatorias:

- `TASK-039` no es baseline técnica ni task de implementación directa.
- Si `TASK-039` contradice la arquitectura vigente o `TASK-040`, prevalece la arquitectura viva y `TASK-040`.
- La visión comercial del Data Node se conserva; los supuestos técnicos de `v1` no.
- Ningún agente debe abrir nuevas lanes de runtime citando `TASK-039` sin pasar por `TASK-040` o por un follow-on canónico derivado.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/complete/TASK-374-sister-platforms-integration-program.md`
- `docs/tasks/complete/TASK-376-sister-platforms-read-only-external-surface-hardening.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/to-do/TASK-040-data-node-architecture-v2.md`
- `docs/tasks/complete/TASK-374-sister-platforms-integration-program.md`
- `docs/tasks/complete/TASK-376-sister-platforms-read-only-external-surface-hardening.md`

### Blocks / Impacts

- framing de producto para Data Node
- narrativa de exports / reports / API / MCP
- sister platforms y consumers externos como follow-ons del modelo

### Files owned

- `docs/tasks/to-do/TASK-039-data-node-architecture-v1.md`
- `docs/tasks/to-do/TASK-040-data-node-architecture-v2.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`

## Current Repo State

### Already exists

- `TASK-040` ya existe como baseline técnica posterior y corrige el diseño sobre runtime vivo.
- `TASK-374` dejó explícito que `TASK-039` debe leerse como spec legacy de visión.
- `TASK-376` ya endureció una parte del carril externo real en `/api/integrations/v1/*`.

### Gap

- `TASK-039` seguía figurando como task `to-do` sin decir con suficiente claridad que ya no es ejecutable literalmente.
- El repo necesitaba una distinción más explícita entre:
  - visión comercial / producto
  - baseline técnica
  - runtime ya materializado

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     Las tasks `policy` no requieren plan ejecutable.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Preserve the vision

- conservar el framing comercial del Data Node:
  - export
  - reports programados
  - API externa
  - MCP downstream
- mantener buyer persona mapping y tesis de switching cost como referencia de producto

### Slice 2 — Redirect implementation safely

- explicitar que toda implementación nueva debe partir desde `TASK-040`
- marcar `TASK-039` como supporting spec / legacy reference
- evitar que esta task compita como backlog ejecutable independiente

## Out of Scope

- implementar export, reports, API o MCP desde esta misma task
- definir schema o rutas runtime nuevas
- reabrir BigQuery como control plane del Data Node
- crear servicios o repos adicionales basados en esta `v1`

## Acceptance Criteria

- [ ] `TASK-039` deja explícito que es referencia legacy de visión y no baseline técnica
- [ ] Queda explícito que `TASK-040` es la referencia de implementación vigente
- [ ] La task preserva la tesis de producto del Data Node sin empujar supuestos técnicos obsoletos
- [ ] La documentación del backlog deja de tratar `TASK-039` como lane ejecutable independiente

## Verification

- revisión manual de consistencia con:
  - `docs/tasks/to-do/TASK-040-data-node-architecture-v2.md`
  - `docs/tasks/complete/TASK-374-sister-platforms-integration-program.md`
  - `docs/tasks/complete/TASK-376-sister-platforms-read-only-external-surface-hardening.md`
- `git diff --check`

## Closing Protocol

- [ ] Mantener `TASK-039` visible solo como supporting spec / referencia de visión
- [ ] No derivar implementación desde esta task sin un follow-on canónico o sin pasar por `TASK-040`

## Follow-ups

- `TASK-040` como baseline operable del Data Node
- follow-ons ejecutables de export, reports, read API y MCP downstream

## Delta 2026-04-13

- `TASK-039` se rescata como referencia legacy de visión.
- Se explicita que no debe ejecutarse literalmente.
- `TASK-040` pasa a ser la baseline técnica vigente para cualquier implementación nueva del Data Node.
