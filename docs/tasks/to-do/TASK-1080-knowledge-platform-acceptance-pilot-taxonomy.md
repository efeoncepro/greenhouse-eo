# TASK-1080 — Knowledge Platform Acceptance + Pilot Taxonomy

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `policy`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform|content|nexa|mcp`
- Blocked by: `none`
- Branch: `task/TASK-1080-knowledge-platform-acceptance`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Aceptar o ajustar la propuesta de Knowledge Platform antes de implementar runtime: confirmar nombre/ruta, corpus piloto, audience inicial, owners, approvers, estados editoriales, policy `agent_excluded`, capabilities y secuencia de rollout. Esta task convierte el ADR `Proposed` en una decisión ejecutable o deja explícito qué falta para aceptarla.

## Why This Task Exists

La arquitectura ya define la dirección: Notion como authoring y Greenhouse como runtime gobernado para humanos, Nexa y MCP. Falta cerrar las decisiones pequeñas que, si se dejan abiertas, harían que la implementación se fragmente: qué corpus entra primero, quién aprueba, qué queda fuera de Nexa, cómo se nombra la surface humana y qué permisos gobiernan lectura/publicación.

## Goal

- Decidir el MVP interno de Knowledge Platform sin crear una mega-ingesta de Notion.
- Aceptar o ajustar el ADR y la arquitectura para que las tasks `TASK-1081..1086` sean ejecutables.
- Dejar una taxonomía inicial de fuentes, audiences, document types, estados y gates de publicación.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_KNOWLEDGE_PLATFORM_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- No implementar runtime en esta task.
- No crear corpus masivo ni prometer que todo Notion entra al MVP.
- Cualquier decisión sensible de finance, payroll, legal, security o access debe declarar approver domain-specific.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `Handoff.md`
- `project_context.md`

## Dependencies & Impact

### Depends on

- ADR y arquitectura Knowledge Platform ya propuestos.

### Blocks / Impacts

- Bloquea `TASK-1081` a `TASK-1086`.

### Files owned

- `docs/architecture/GREENHOUSE_KNOWLEDGE_PLATFORM_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/tasks/to-do/TASK-1080-knowledge-platform-acceptance-pilot-taxonomy.md`

## Current Repo State

### Already exists

- ADR `Status: Proposed`.
- Arquitectura `Draft / proposed`.
- Candidate task titles documentados sin runtime.

### Gap

- No hay decisión aceptada de pilot corpus, naming, publication policy ni capability model.

<!-- ZONE 2 — PLAN MODE: policy task, no se llena al crear -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Decision closure

- Resolver naming tentativo de la surface humana (`Knowledge`, `Academy`, `Manual`, `Learn`).
- Definir si el primer audience es solo interno o incluye cliente.
- Confirmar si el ADR pasa a `Accepted` o queda `Proposed` con blockers explícitos.

### Slice 2 — Pilot taxonomy

- Definir 10-20 documentos/categorías candidatas para el MVP.
- Definir document types iniciales, states, owners, approvers y review cadence.
- Definir criterios `agent_allowed`, `agent_excluded`, `quarantined`, `stale` y `deprecated`.

### Slice 3 — Access and capability sketch

- Proponer view/capability names para lectura, publicación, administración y agentic retrieval.
- Definir si el MVP necesita client-safe docs o queda internal-only.

## Out of Scope

- DDL, APIs, UI, Notion sync, Nexa runtime, embeddings o MCP tools.

## Detailed Spec

La salida debe ser una decisión pequeña pero ejecutable: una tabla de pilot corpus, una tabla de states/policies, una tabla de owners/approvers y un delta al ADR/arquitectura. Si una decisión queda abierta, debe tener owner y condición de cierre.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (decision closure) -> Slice 2 (taxonomy) -> Slice 3 (access sketch). Las tasks downstream no deben empezar implementación hasta cerrar esta task o documentar excepción.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Aceptar una taxonomía demasiado amplia | content | medium | limitar MVP a 10-20 docs internos | scope creep en task downstream |
| Saltarse aprobación domain-specific | finance/payroll/security | medium | approvers explícitos por dominio sensible | documentos sensibles sin owner |

### Feature flags / cutover

- N/A — docs/policy only, no runtime.

### Rollback plan per slice

| Slice | Rollback | Reversible? |
|---|---|---|
| 1 | revertir delta documental | sí |
| 2 | ajustar pilot taxonomy antes de implementar | sí |
| 3 | ajustar sketch de capabilities antes de DDL | sí |

### Production verification sequence

- `pnpm docs:closure-check --staged`
- `pnpm task:lint --task TASK-1080`
- Revisión manual de ADR/arquitectura.

### Out-of-band coordination required

- Confirmación humana de naming, pilot corpus y approvers.

<!-- ZONE 4 — ACCEPTANCE & CLOSURE -->

## Acceptance Criteria

- [ ] ADR/arquitectura declaran si la decisión queda `Accepted` o qué la bloquea.
- [ ] Pilot corpus inicial y audience quedan documentados.
- [ ] Estados editoriales y gates `agent_allowed`/`agent_excluded`/`quarantined` quedan definidos.
- [ ] Capabilities/views iniciales quedan propuestas para implementación downstream.
- [ ] `TASK-1081..1086` quedan desbloqueadas o con blockers explícitos.

## Verification

- `pnpm task:lint --task TASK-1080`
- `pnpm docs:closure-check --staged`
- Revisión manual contra `GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md`.

## Closing Protocol

- [ ] `Lifecycle` sincronizado con carpeta.
- [ ] `docs/tasks/README.md` actualizado.
- [ ] `Handoff.md` actualizado con decisiones y próximos pasos.
- [ ] `changelog.md` actualizado si cambia el contrato.
- [ ] Chequeo cruzado sobre `TASK-1081..1086`.

## Follow-ups

- `TASK-1081` a `TASK-1086`.

## Open Questions

- Nombre final de la surface humana.
- Corpus piloto exacto y approvers.
