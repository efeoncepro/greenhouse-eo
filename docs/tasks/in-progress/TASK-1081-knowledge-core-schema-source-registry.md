# TASK-1081 — Knowledge Core Schema + Source Registry

## Delta 2026-06-11

Aceptación cerrada por **TASK-1080** (ADR `Accepted (direction)`). Ajustes que esta task debe respetar:

- **Estado editorial = DOS columnas ortogonales** (no un enum mezclado): `publication_status` (`draft | review | published | stale | deprecated`, + `quarantined` como bloqueo que gana sobre todo) **y** `agentic_policy` (`agent_allowed | agent_excluded`), independientes. Un doc `published` puede ser `agent_excluded`. El schema NO debe meter `agent_excluded` dentro del enum de lifecycle.
- `sensitivity`: `internal | restricted` en el MVP (`client_safe` diferido a fase cliente; MVP es **solo interno** → `audience='internal'`).
- **Capabilities a sembrar aquí** (módulo `knowledge`, con grant en `runtime.ts` en el mismo PR — invariante TASK-873/935): `knowledge.document.read`, `knowledge.document.publish`, `knowledge.source.admin`, `knowledge.agentic.retrieve`, `knowledge.feedback.submit`. viewCode `plataforma.knowledge` (routeGroup `internal`, solo roles internos).
- Detalle: `GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md` → `## Delta 2026-06-11` (tablas A-G).

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform|data|content|nexa`
- Blocked by: `TASK-1080`
- Branch: `task/TASK-1081-knowledge-core-schema`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear la foundation persistente de Knowledge Platform: schema `greenhouse_knowledge`, registry de fuentes, documentos, versiones, chunks, publicación, feedback y eventos mínimos de auditoría. Esta task no sincroniza Notion ni construye UI; deja el core listo para ingesta y búsqueda.

## Why This Task Exists

Nexa y la capa humana no pueden depender de Notion live ni de documentos sueltos. Necesitan un runtime versionado, filtrable y auditable dentro de Greenhouse. La arquitectura propone `greenhouse_knowledge`; esta task lo materializa como foundation compacta.

## Goal

- Materializar el schema y tablas mínimas para sources, documents, versions, chunks, feedback y sync/publication runs.
- Crear tipos/readers/commands server-only base en `src/lib/knowledge/`.
- Dejar tests y documentación técnica/funcional/manual mínimos para la capability foundation.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_KNOWLEDGE_PLATFORM_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- No leer Notion en esta task.
- No exponer API pública todavía.
- El schema debe modelar `publication_status` (`draft`/`review`/`published`/`stale`/`deprecated` + `quarantined`) y `agentic_policy` (`agent_allowed`/`agent_excluded`) como **dos columnas ortogonales** (ver Delta 2026-06-11), más owner, audience, sensitivity y review cadence desde V1.

## Normative Docs

- `docs/tasks/to-do/TASK-1080-knowledge-platform-acceptance-pilot-taxonomy.md`
- `docs/tasks/TASK_PROCESS.md`

## Dependencies & Impact

### Depends on

- `TASK-1080` para naming, policy, states y pilot taxonomy.

### Blocks / Impacts

- Bloquea `TASK-1082`, `TASK-1083`, `TASK-1084`, `TASK-1085`, `TASK-1086`.

### Files owned

- `migrations/*task-1081*knowledge*.sql`
- `src/lib/knowledge/**`
- `docs/architecture/GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md`
- `docs/documentation/plataforma/knowledge-platform.md`
- `docs/manual-de-uso/plataforma/knowledge-platform.md`

## Current Repo State

### Already exists

- Arquitectura define schema conceptual `greenhouse_knowledge`.
- No existen tablas ni helpers `src/lib/knowledge/`.

### Gap

- No hay runtime persistente para documentos publicados, versiones, chunks, feedback ni registry de fuentes.

<!-- ZONE 2 — PLAN MODE: lo llena el agente que toma la task -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — DDL foundation

- Crear schema `greenhouse_knowledge`.
- Crear tablas mínimas: `knowledge_sources`, `knowledge_documents`, `knowledge_document_versions`, `knowledge_chunks`, `knowledge_publication_runs`, `knowledge_feedback`.
- Agregar constraints para states, sensitivity, audience y agentic policy.

### Slice 2 — Server-only core

- Crear `src/lib/knowledge/` con tipos, constants, validators ligeros y readers/commands base.
- Commands mínimos: registrar source, crear versión publicada, marcar quarantine/stale/deprecated.
- Readers mínimos: obtener source/document/version/chunks por metadata.

### Slice 3 — Documentation triple layer

- Actualizar arquitectura con schema real.
- Crear doc funcional y manual/runbook mínimos para operar la foundation.

## Out of Scope

- Notion sync, search ranking, API Platform endpoints, UI humana, Nexa integration, MCP.

## Detailed Spec

El DDL debe ser additive-only, con claves estables, timestamps, actor/publisher cuando aplique y columnas suficientes para auditar publicación. `knowledge_chunks` debe guardar `heading_path`, `citation_anchor`, `token_estimate`, `allowed_scopes`, `audience`, `sensitivity`, `freshness` y `agent_policy`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (DDL) -> Slice 2 (server-only core) -> Slice 3 (docs). No escribir ingesta antes de tener schema aplicado.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Schema insuficiente para agentic filtering | data/nexa | medium | mapear contra architecture checklist antes de migrar | tests de metadata fallan |
| Mezclar Notion delivery metrics con knowledge | data | medium | schema separado `greenhouse_knowledge` y docs explícitas | imports cruzados indebidos |

### Feature flags / cutover

- Sin flag — additive schema + helpers no consumidos por runtime hasta tasks downstream.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | migration down si no hay datos productivos | <10 min | sí antes de uso |
| 2 | revert commit | <10 min | sí |
| 3 | revert docs | <10 min | sí |

### Production verification sequence

1. Aplicar migration en staging/dev.
2. Verificar tablas/constraints.
3. Ejecutar tests focales de `src/lib/knowledge`.
4. Validar docs closure.

### Out-of-band coordination required

- Ninguna para foundation additive.

<!-- ZONE 4 — ACCEPTANCE & CLOSURE -->

## Acceptance Criteria

- [ ] `greenhouse_knowledge` existe con tablas mínimas y constraints de states/audience/sensitivity/agent policy.
- [ ] `src/lib/knowledge/` tiene tipos y helpers server-only cubiertos por tests.
- [ ] No hay lectura Notion ni endpoints API en esta task.
- [ ] Documentación técnica, funcional y manual/runbook quedan creadas o actualizadas.

## Verification

- `pnpm task:lint --task TASK-1081`
- tests focales `src/lib/knowledge`
- `pnpm docs:closure-check --staged`

## Closing Protocol

- [ ] `Lifecycle` sincronizado con carpeta.
- [ ] `docs/tasks/README.md` actualizado.
- [ ] `Handoff.md` actualizado con migration/runtime state.
- [ ] `changelog.md` actualizado.
- [ ] Chequeo de impacto sobre `TASK-1082..1086`.

## Follow-ups

- `TASK-1082`, `TASK-1083`.
