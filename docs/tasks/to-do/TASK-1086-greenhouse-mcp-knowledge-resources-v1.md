# TASK-1086 — Greenhouse MCP Knowledge Resources V1

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `mcp|platform|api|content`
- Blocked by: `TASK-1083`
- Branch: `task/TASK-1086-mcp-knowledge-resources`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Exponer Knowledge Platform en Greenhouse MCP/webMCP como resources/tools read-only downstream de API Platform: buscar knowledge, obtener documento y recuperar citas. No debe leer SQL ni Notion directo.

## Why This Task Exists

La capa agéntica no es solo Nexa. Greenhouse MCP debe poder entregar conocimiento publicado a agentes externos/controlados sin duplicar lógica ni saltarse permisos. La arquitectura MCP exige que todo vaya downstream de API Platform.

## Goal

- Agregar MCP resources `greenhouse://knowledge/...`.
- Agregar tools read-only `search_knowledge`, `get_knowledge_document`, `get_knowledge_citations`.
- Mantener auth, tenancy, observabilidad y access policy via API Platform.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- MCP no se adelanta a API estable.
- MCP no lee SQL directo.
- MCP no lee Notion directo como bypass.
- V1 read-only.
- No inferir tenant por nombre del cliente.

## Normative Docs

- `docs/tasks/to-do/TASK-1083-knowledge-search-api-golden-questions.md`
- `docs/tasks/to-do/TASK-1085-nexa-knowledge-retrieval-citations.md`

## Dependencies & Impact

### Depends on

- `TASK-1083` para API/search estable.

### Blocks / Impacts

- Habilita agentes MCP/webMCP a consultar knowledge publicado.

### Files owned

- `src/mcp/greenhouse/**`
- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md`
- `docs/documentation/plataforma/knowledge-platform.md`
- `docs/manual-de-uso/plataforma/knowledge-platform.md`

## Current Repo State

### Already exists

- MCP server oficial en `src/mcp/greenhouse/**`.
- Arquitectura MCP exige downstream de API Platform.

### Gap

- MCP no expone Knowledge Platform resources/tools.

<!-- ZONE 2 — PLAN MODE: lo llena el agente que toma la task -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — API client mapping

- Mapear MCP a endpoints API Platform knowledge.
- Preservar auth/config existente del MCP.

### Slice 2 — Resources

- Agregar resources `greenhouse://knowledge/document/{id}`, `greenhouse://knowledge/source/{id}`, `greenhouse://knowledge/runbook/{slug}` si el endpoint existe.

### Slice 3 — Tools

- Agregar `search_knowledge`, `get_knowledge_document`, `get_knowledge_citations`.
- Tests de payload, errors y read-only boundaries.

## Out of Scope

- Writes MCP, Notion MCP bridging, OAuth multiusuario nuevo, embeddings, authoring/editing desde MCP.

## Detailed Spec

La tool `search_knowledge` debe devolver el mismo citation packet o un mapping fiel de API Platform. Los errores deben ser sanitizados y observables. Si el API devuelve `confidence='none'`, MCP no debe inventar un documento.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (client mapping) -> Slice 2 (resources) -> Slice 3 (tools/tests). No tool sin endpoint API estable.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| MCP bypass de access policy | mcp/security | medium | downstream API only + tests | `knowledge.mcp.error_rate` |
| Tool devuelve docs stale sin metadata | mcp/content | low | preserve freshness fields | eval/manual smoke |

### Feature flags / cutover

- Puede quedar behind MCP config allowlist si el gateway lo soporta; V1 read-only.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revert mapping | <10 min | sí |
| 2 | remove resources from registry | <10 min | sí |
| 3 | remove tools from registry | <10 min | sí |

### Production verification sequence

1. Unit tests MCP tools/resources.
2. Local `pnpm mcp:greenhouse` smoke.
3. Remote gateway smoke si aplica.
4. Docs closure.

### Out-of-band coordination required

- Ninguna salvo credenciales/gateway MCP si se valida remoto.

<!-- ZONE 4 — ACCEPTANCE & CLOSURE -->

## Acceptance Criteria

- [ ] MCP expone resources/tools de knowledge read-only downstream de API Platform.
- [ ] No hay SQL directo ni Notion directo desde MCP.
- [ ] Access/freshness/citations se preservan en respuestas.
- [ ] Tests MCP cubren success, no-answer, stale y auth/error sanitizado.
- [ ] Documentación funcional/manual queda actualizada.

## Verification

- tests `src/mcp/greenhouse/**`
- smoke `pnpm mcp:greenhouse` si disponible
- `pnpm task:lint --task TASK-1086`
- `pnpm docs:closure-check --staged`

## Closing Protocol

- [ ] `Lifecycle` sincronizado con carpeta.
- [ ] `docs/tasks/README.md` actualizado.
- [ ] `Handoff.md` actualizado con MCP evidence.
- [ ] `changelog.md` actualizado.
- [ ] Chequeo de impacto sobre API Platform docs.

## Follow-ups

- Writes MCP solo con ADR/task separada.
