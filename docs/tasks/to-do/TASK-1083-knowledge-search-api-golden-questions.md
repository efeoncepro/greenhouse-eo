# TASK-1083 — Knowledge Search API + Golden Questions

## Delta 2026-06-11

Cerrado por **TASK-1080** (alineado, sin cambio estructural):

- Búsqueda V1 = **full-text Postgres + filtros fuertes de metadata** (`audience`, `sensitivity`, `publication_status`, `agentic_policy`, `owner_domain`). Embeddings/vector **fuera** del MVP (decisión explícita; substrato vector se evalúa después con la calidad medida aquí).
- El filtrado pre-LLM debe respetar las **dos dimensiones**: nunca retornar chunks `agent_excluded` ni `quarantined` para retrieval agéntico.
- Golden questions: TASK-1080 difirió aquí el set final + su approver (por dominio del doc).
- **Corpus ya ingerido (TASK-1082, 2026-06-11):** hay datos reales en `greenhouse_knowledge` en dev (11 docs publicados + 263 chunks, `periodos-de-nomina` `agent_excluded`). El connector/pipeline de ingesta + el chunker (`chunkMarkdown`, heading_path + `citation_anchor`) existen — la search API consume estos chunks. El tsvector/GIN sigue siendo de esta task (se agrega sobre `knowledge_chunks.body_text`).

## Delta 2026-06-11 — Pre-execution review (arch-architect)

TASK-1081 (schema) **y** TASK-1082 (ingesta) están **completas** → esta task está **desbloqueada** y corre contra datos reales (no fixtures). Review contra la realidad materializada + patrones canónicos (CQRS-lite read API, SSOT reader, defense-in-depth, eval-driven AI). Ajustes:

### A. Substrato full-text — DECISIÓN PINEADA (esta task lo posee)

- **Columna generada + GIN** sobre `knowledge_chunks` vía migración (`pnpm migrate:create`): `body_tsv tsvector GENERATED ALWAYS AS (setweight(to_tsvector('spanish', coalesce(array_to_string(heading_path, ' '), '')), 'A') || setweight(to_tsvector('spanish', body_text), 'B')) STORED` + `CREATE INDEX ... USING GIN (body_tsv)`.
  - **Weighted (heading A > body B):** un chunk cuyo encabezado matchea la query es más relevante; `ts_rank` lo premia. Patrón canónico de FTS de calidad.
  - **Config `'spanish'`** (corpus es-CL dominante; el stemming da recall real: `periodos`↔`periodo`, `nóminas`↔`nómina`). Términos técnicos en inglés (RpA, OTD, paths) matchean como tokens casi-exactos (el stemmer ES los deja intactos). **Tunable** (la columna generada se puede ALTERar; `pg_trgm` para acrónimos si las golden questions muestran recall pobre). El substrato vector/embeddings es la escalación diferida (TASK-1080), no este MVP.
- **`confidence`** se deriva de `ts_rank` (umbrales high/medium/low) + nº de resultados; **`confidence='none'` cuando 0 resultados** (fuerza el no-answer honesto). Resuelve el open question de "confidence básico".

### B. UN reader SSOT, DOS modos de filtrado (el ajuste más importante)

`searchKnowledge({ query, subject, mode })` es el **único** lugar que recupera; lo consumen el endpoint humano (1084), Nexa (1085) y MCP (1086). Las **dos dimensiones ortogonales** se enforzan según el modo:

| modo | capability | `agent_excluded` | `quarantined` | `publication_status` |
|---|---|---|---|---|
| `human` | `knowledge.document.read` | **SÍ visible** (humanos los ven) | nunca | published/stale/deprecated |
| `agentic` | `knowledge.agentic.retrieve` | **NUNCA** (excluido de Nexa/MCP) | nunca | published/stale (deprecated solo bajo pregunta explícita) |

Ambos modos filtran SIEMPRE por `audience`/`sensitivity`/`tenant_type` **antes** del LLM/consumer (pre-LLM filtering en SQL, no post-hoc). Los chunks denegados nunca salen del reader (solo `deniedOrFilteredCount`). MVP solo interno: `audience='internal'`; `sensitivity='restricted'` no se retorna en modo agentic.

### C. El packet mapea a columnas materializadas

`KnowledgeRetrievalPacket` (arch §12.3) se construye desde el schema real: `text`=`body_text`; `headingPath`=`heading_path[]`; `citationLabel` desde `heading_path` + `citation_anchor`; `humanUrl`=`knowledge_documents.human_url` + `#${citation_anchor}`; `freshness`/`sensitivity`/`agenticPolicy` denormalizados en el chunk; `title`=`knowledge_documents.title`.

### D. Corrección de signal (estaba mal ubicado)

`knowledge.retrieval.low_citation_rate` mide **respuestas de Nexa** (cuántas citan) → **pertenece a TASK-1085**, no aquí (en 1083 todavía no hay "respuesta"). La **quality gate de esta task es el eval harness offline** (golden questions: fuente correcta/equivocada/no-answer/stale). Runtime signal de search en V1: no se requiere (opcional `knowledge.search.zero_result_rate` si se quiere observabilidad; YAGNI hasta tener tráfico).

### E. Golden questions = fixtures TS versionadas

El set de golden questions vive como **fixtures TS** en el repo (versionado, revisable, corre en CI), NO una tabla DB (YAGNI). Cada caso: `{ query, mode, expectedAnchors[], mustNotReturn[], expectNoAnswer? }`. El approver del set lo difirió TASK-1080 (por dominio del doc) — al menos cubrir los 11 docs ingeridos.

### Files owned (adicional)

- `migrations/*task-1083*knowledge-search*.sql` (columna `body_tsv` + GIN).

### 4-pillar

- **Safety:** pre-LLM filtering en SQL (chunks denegados nunca salen del reader); dos modos con capability distinta; agentic nunca retorna `agent_excluded`/`quarantined`/`restricted`; tests de scope. Read-only (sin write path).
- **Robustness:** `confidence='none'` testeado (no-answer honesto); reader SSOT (cero recompute en consumers); columna generada = el tsvector no puede desincronizarse del body.
- **Resilience:** eval harness como regresión (eval-driven); degradación honesta si el índice falta (`baseline`/error sanitizado, no falso 0).
- **Scalability:** GIN sobre tsvector escala a miles de chunks; vector es escalación aditiva, no rework; full-text antes de comprometer un substrato vectorial sin medir.

## Delta 2026-06-11 — Full API Parity hardening (pre-execution)

Aplicando el principio canónico **Full API Parity** (`GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`; arch-architect decisión #16: la UI es un cliente de contratos gobernados, no el source of truth). 5 endurecimientos para que la búsqueda nazca como **plataforma** (consumible por UI, Nexa, MCP, partners), no como un buscador acoplado a una pantalla:

1. **Browse/list endpoint (la UI no puede bypassear el contrato).** Además de `search` + `documents/:id`, exponer `GET /api/platform/app/knowledge/documents` (list por `documentType`/`audience`/`publicationStatus`/`agenticPolicy`/`ownerDomain`, paginado). El Human Center (1084) **navega y filtra el corpus por este contrato**, nunca queryeando `knowledge_documents` directo. Reusa `listKnowledgeDocumentsByMetadata` (TASK-1081). Sin esto, 1084 forka su propia query → rompe parity + duplica el access control.

2. **El reader es el ÚNICO punto de query del índice (access control centralizado = SSOT + seguridad).** `searchKnowledge` + los readers de documents son el único lugar que toca `knowledge_chunks`/`knowledge_documents` para lectura agéntica/búsqueda. NINGÚN consumer (1084 UI, 1085 Nexa, 1086 MCP) queryea las tablas directo — el **pre-LLM filtering vive en un solo lugar** (si se duplica, alguien lo olvida → fuga). Lint rule `greenhouse/no-direct-knowledge-chunk-query` (warn→error tras 1084/1085) que bloquee `SELECT ... knowledge_chunks` fuera de `src/lib/knowledge/search/**`. Defense-in-depth (#5) + Full API Parity (#16).

3. **Contrato versionado `knowledge-search.v1`.** El packet declara `contractVersion: 'knowledge-search.v1'` (patrón TASK-672 Platform Health V1). Nexa/MCP/partners dependen de una forma estable; un cambio breaking de shape → `v2`, nunca mutación silenciosa. Sin versión, cada consumer machine se rompe ante cualquier ajuste del packet.

4. **Path programático de consumers machine — declarado explícito (Full API Parity exige el path planificado).** Lane `app` (first-party: humano + agent session) = **esta task**. Lane `ecosystem` (`/api/platform/ecosystem/knowledge/*`, server-to-server / MCP) = **TASK-1086**, thin wrapper del **mismo** reader (cero lógica nueva). Por eso el reader se diseña **lane-agnóstico**: recibe `subject` (no `request`), retorna el packet — el endpoint (app o ecosystem) es solo el transporte.

5. **Feedback como contrato compartido (no UI-only).** `knowledge.feedback.submit` (capability seedeada TASK-1081) → declarar `POST /api/platform/app/knowledge/feedback` (consume `recordKnowledgeFeedback`). El Human Center (1084) **y** Nexa (1085) capturan feedback **por el mismo contrato**, no cada uno el suyo. Se implementa donde primero se necesite (aquí o en 1084), pero el path queda declarado ahora (no nace UI-only).

> Estos 5 + los 5 ajustes del Delta de revisión arquitectónica (substrato FTS, reader 2-modos, packet→columnas, signal a 1085, golden questions fixtures) son el contrato endurecido con el que arranca la implementación.

## Delta 2026-06-11 — Visual contract input from Answer Trace Studio

El mockup `/knowledge/mockup/answer-trace` de `TASK-1084` define el target visual para el output de esta API: el usuario ve una respuesta trazable, source chips, excerpts, `KnowledgeRetrievalPacket`, `deniedOrFilteredCount`, confidence/freshness y un bloque de evals/golden questions. Este delta **no implementa** `searchKnowledge`, endpoints ni GIN; solo fija cómo debe sentirse el packet cuando lo consuman humanos, Nexa y MCP.

Implicaciones para esta task:

- Mantener `KnowledgeRetrievalPacket` legible y estable para UI y machine consumers (`contractVersion: 'knowledge-search.v1'`).
- Incluir suficiente metadata para renderizar tabs `Fuentes | Packet | Evals` sin queries extra desde la view.
- Soportar no-answer honesto (`confidence='none'`) y freshness/gap explícitos.
- Exponer `deniedOrFilteredCount` como señal de filtrado sin revelar contenido denegado.
- Los golden questions deben poder explicar fuente correcta, fuente equivocada, no-answer y stale/deprecated con evidencia revisable.

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

- `migrations/*task-1083*knowledge-search*.sql` (columna generada `body_tsv` + GIN sobre `knowledge_chunks`)
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

- `GET /api/platform/app/knowledge/search` (packet versionado `knowledge-search.v1`)
- `GET /api/platform/app/knowledge/documents` (browse/list por metadata, paginado — Delta Full API Parity #1)
- `GET /api/platform/app/knowledge/documents/:id`
- `POST /api/platform/app/knowledge/feedback` (contrato compartido humano+Nexa — Delta Full API Parity #5; implementar aquí o donde primero se necesite)
- Lint rule `greenhouse/no-direct-knowledge-chunk-query` (reader = único query path — Delta Full API Parity #2)
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
| Retrieval cita fuente equivocada | nexa/content | medium | golden questions + expected citations (eval harness offline) | eval harness en rojo (`knowledge.retrieval.low_citation_rate` mide respuestas de Nexa → es de TASK-1085, ver Delta D) |
| Access leak en search | api/security | medium | pre-LLM filtering en SQL + tests de scopes (modo human vs agentic, Delta B) | denied chunks en payload |

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

- [ ] `knowledge_search` devuelve citation packet acotado, filtrado y con confidence/freshness, versionado `knowledge-search.v1`.
- [ ] API Platform app endpoints existen (search + browse/list + document/:id + feedback) y no usan Notion live.
- [ ] El reader es el único query path del índice: la UI/Nexa/MCP consumen el contrato, no `knowledge_chunks` directo (Full API Parity #2; lint rule activa).
- [ ] El reader es lane-agnóstico (recibe `subject`, no `request`) → TASK-1086 lo envuelve para `ecosystem`/MCP sin lógica nueva (Full API Parity #4).
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
