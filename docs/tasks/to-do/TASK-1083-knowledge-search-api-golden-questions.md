# TASK-1083 — Knowledge Search API + Golden Questions

## Delta 2026-06-11

Cerrado por **TASK-1080** (alineado, sin cambio estructural):

- Búsqueda V1 = **full-text Postgres + filtros fuertes de metadata** (`audience`, `sensitivity`, `publication_status`, `agentic_policy`, `owner_domain`). Embeddings/vector **fuera** del MVP (decisión explícita; substrato vector se evalúa después con la calidad medida aquí).
- El filtrado pre-LLM debe respetar las **dos dimensiones**: nunca retornar chunks `agent_excluded` ni `quarantined` para retrieval agéntico.
- Golden questions: TASK-1080 difirió aquí el set final + su approver (por dominio del doc).

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform|api|nexa|content`
- Blocked by: `TASK-1081`
- Branch: `task/TASK-1083-knowledge-search-api`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear `knowledge_search` como contrato read-only con full-text search + filtros fuertes de metadata, citation packet y eval harness de golden questions. Esta task entrega la base que luego consumen UI humana, Nexa y MCP.

## Why This Task Exists

La capa agéntica necesita retrieval medible antes de conectarse a Nexa. Sin API y evals, el sistema puede parecer útil mientras cita mal, ignora permisos o responde con fuentes stale.

## Goal

- Exponer search read-only vía API Platform.
- Devolver citation packet acotado con confidence, freshness, access scope y chunks filtrados pre-LLM.
- Crear golden questions y eval harness mínimo para el corpus piloto.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Los chunks denegados se filtran antes de llegar al LLM/consumer.
- Full-text + metadata fuerte primero; embeddings quedan fuera salvo decisión explícita posterior.
- El endpoint modela resource/search, no un handler visual.

## Normative Docs

- `docs/tasks/to-do/TASK-1081-knowledge-core-schema-source-registry.md`
- `docs/tasks/to-do/TASK-1082-notion-knowledge-ingestion-mvp.md`

## Dependencies & Impact

### Depends on

- `TASK-1081` para schema.
- `TASK-1082` para corpus real recomendado, aunque puede probarse con fixtures.

### Blocks / Impacts

- Bloquea `TASK-1085` Nexa retrieval y `TASK-1086` MCP resources.
- Alimenta `TASK-1084` human search.

### Files owned

- `src/lib/knowledge/search/**`
- `src/app/api/platform/app/knowledge/search/route.ts`
- `src/app/api/platform/app/knowledge/documents/**`
- `docs/api/**`
- `docs/documentation/plataforma/knowledge-platform.md`

## Current Repo State

### Already exists

- API Platform app lane existe.
- Knowledge architecture define `KnowledgeRetrievalPacket`.

### Gap

- No hay search API ni eval harness para knowledge.

<!-- ZONE 2 — PLAN MODE: lo llena el agente que toma la task -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Search reader

- Implementar reader server-only `searchKnowledge`.
- Filtrar por tenant/user/audience/sensitivity/agent policy antes del resultado.
- Calcular confidence/freshness básico.

### Slice 2 — API Platform endpoints

- `GET /api/platform/app/knowledge/search`
- `GET /api/platform/app/knowledge/documents/:id`
- Errores sanitizados, auth first-party y payload estable.

### Slice 3 — Golden questions

- Crear fixtures/evals para preguntas esperadas, fuentes esperadas, no-answer cases y stale/deprecated cases.
- Medir retrieval correctness básico.

## Out of Scope

- Nexa response generation, MCP mapping, embeddings/vector store, UI completa.

## Detailed Spec

El response debe seguir el shape conceptual de `KnowledgeRetrievalPacket` documentado en la arquitectura. Incluir `deniedOrFilteredCount` sin exponer contenido sensible. `confidence='none'` debe ser posible y testeado.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (reader) -> Slice 2 (API) -> Slice 3 (evals). No exponer Nexa hasta tener evals mínimos.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Retrieval cita fuente equivocada | nexa/content | medium | golden questions + expected citations | `knowledge.retrieval.low_citation_rate` |
| Access leak en search | api/security | medium | pre-LLM filtering + tests de scopes | denied chunks en payload |

### Feature flags / cutover

- Endpoint puede quedar internal-only; no hay cutover visible hasta consumers downstream.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revert reader | <10 min | sí |
| 2 | deshabilitar endpoint/route | <10 min | sí |
| 3 | ajustar fixtures/evals | <10 min | sí |

### Production verification sequence

1. Tests unitarios reader + API.
2. Eval harness contra corpus piloto/fixtures.
3. Manual smoke con usuario interno.
4. Docs closure.

### Out-of-band coordination required

- Ninguna si el corpus piloto ya fue aprobado.

<!-- ZONE 4 — ACCEPTANCE & CLOSURE -->

## Acceptance Criteria

- [ ] `knowledge_search` devuelve citation packet acotado, filtrado y con confidence/freshness.
- [ ] API Platform app endpoints existen y no usan Notion live.
- [ ] Golden questions cubren fuente correcta, fuente equivocada, no-answer, stale/deprecated y sensitive escalation.
- [ ] No hay embeddings/vector dependency en esta task.
- [ ] Docs API/funcionales quedan actualizadas.

## Verification

- tests focales de `src/lib/knowledge/search`
- tests de API route
- eval harness golden questions
- `pnpm task:lint --task TASK-1083`
- `pnpm docs:closure-check --staged`

## Closing Protocol

- [ ] `Lifecycle` sincronizado con carpeta.
- [ ] `docs/tasks/README.md` actualizado.
- [ ] `Handoff.md` actualizado con endpoint/eval evidence.
- [ ] `changelog.md` actualizado.
- [ ] Chequeo de impacto sobre `TASK-1085` y `TASK-1086`.

## Follow-ups

- `TASK-1085`, `TASK-1086`.
