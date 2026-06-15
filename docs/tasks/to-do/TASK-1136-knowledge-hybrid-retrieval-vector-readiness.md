# TASK-1136 — Knowledge hybrid retrieval evaluation + vector readiness

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `knowledge|nexa|ai|data|reliability`
- Blocked by: `TASK-1127`
- Branch: `task/TASK-1136-knowledge-hybrid-retrieval-vector-readiness`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Evaluar y preparar un substrato de retrieval hibrido para Knowledge/Nexa. Hoy RAG usa Postgres FTS +
rerank lexico/estructural; eso esta bien gobernado, pero preguntas naturales amplias pueden necesitar
embeddings/vector como capa aditiva detras del mismo `searchKnowledge` SSOT.

## Why This Task Exists

TASK-1080 difirio embeddings/vector hasta medir calidad y volumen real. TASK-1124 mejoro la sintesis,
pero no cambia el recall semantico del retrieval. Antes de agregar vector a produccion, Greenhouse
necesita evidencia: que casos falla FTS, que mejora hybrid, costo/latencia, privacidad del corpus y
si el storage debe ser `pgvector`, Vertex/BQ u otra opcion.

## Goal

- Usar los resultados de `TASK-1127` como baseline de calidad.
- Construir una evaluacion offline/shadow de retrieval hibrido sin cambiar el contrato publico.
- Decidir si vector/hybrid justifica costo y complejidad.
- Dejar una ruta de implementacion gated si el resultado es positivo.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/nexa-intelligence/technical/rag-pipeline.md`
- `docs/architecture/nexa-intelligence/knowledge/retrieval-answer-quality.md`
- `docs/architecture/nexa-intelligence/technical/data-contracts.md`

Reglas obligatorias:

- `searchKnowledge` sigue siendo el SSOT; no crear un reader paralelo para Nexa.
- No romper `knowledge-search.v1`.
- No enviar corpus sensible a un provider de embeddings sin decision de privacidad/secretos.
- Hybrid debe ser aditivo, flag-gated y comparado contra FTS baseline.

## Normative Docs

- `docs/tasks/complete/TASK-1080-knowledge-platform-acceptance-pilot-taxonomy.md`
- `docs/tasks/to-do/TASK-1127-nexa-knowledge-qa-nightly-eval-expansion.md`
- `docs/tasks/to-do/TASK-1128-knowledge-corpus-canonical-term-drift-signal.md`

## Dependencies & Impact

### Depends on

- `TASK-1127` — baseline de eval wrong-source/cross-doc.
- `src/lib/knowledge/search/search-knowledge.ts`
- `src/lib/knowledge/search/rerank-knowledge-chunks.ts`
- `src/lib/knowledge/search/golden-questions*.ts`
- Corpus publicado de `greenhouse_knowledge`.

### Blocks / Impacts

- Mejora potencial de respuestas Knowledge de Nexa.
- Informa si se abre una task de implementacion productiva de vector/hybrid.

### Files owned

- `src/lib/knowledge/search/*`
- `scripts/knowledge/*` o `scripts/nexa-*` (si aplica)
- `docs/architecture/nexa-intelligence/technical/rag-pipeline.md`
- `docs/architecture/GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- FTS con `body_tsv`, `ts_rank`, `unaccent`, OR-ify y rerank conservador.
- Golden questions y QA matrix.
- Contrato `knowledge-search.v1`.

### Gap

- No hay embeddings/vector ni eval comparativa.
- No hay decision de storage/provider para embeddings.
- No hay shadow report que cuantifique recall/precision/latencia/costo de hybrid vs FTS.

<!-- ZONE 2 — PLAN MODE: no llenar al crear la task -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Baseline and failure taxonomy

- Consumir resultados de `TASK-1127` y clasificar fallas: lexical miss, wrong-source, cross-doc,
  stale-source, corpus gap.
- Definir metricas: recall@k, MRR, citation readiness, latency, denied/filter preservation.

### Slice 2 — Shadow hybrid prototype

- Prototipo no-productivo de embeddings/vector sobre muestra gobernada.
- Comparar FTS, rerank y hybrid sobre el mismo set de golden questions.
- No cambiar runtime de `/api/home/nexa`.

### Slice 3 — Decision packet

- Documentar storage/provider recomendado, costos, privacy posture, rollout flags y rollback.
- Si no mejora suficiente, cerrar como no-go con evidencia.

### Slice 4 — Implementation scaffold if approved

- Si el decision packet aprueba, dejar task hija o scaffold gated para production implementation.

## Out of Scope

- Activar vector en produccion.
- Cambiar el contrato `knowledge-search.v1`.
- Reescribir ingestion/chunking salvo hallazgos bloqueantes documentados.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

TASK-1127 -> Slice 1 -> Slice 2 -> Slice 3 -> Slice 4.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Vector trae fuentes semanticamente parecidas pero incorrectas | knowledge | medium | eval wrong-source + policy filters pre-LLM | MRR / wrong-source rate |
| Costo/latencia sube sin mejora real | ai/cost | medium | shadow eval + no-go threshold | latency/cost report |
| Corpus sensible sale a provider no aprobado | security | low | privacy review antes de embeddings | access issue |

### Feature flags / cutover

N/A para evaluacion. Cualquier runtime futuro debe nacer behind flag.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Docs/scripts revertibles | < 10 min | si |
| Slice 2 | Eliminar shadow artifacts; no runtime impact | < 10 min | si |
| Slice 3 | Decision docs revertibles | < 10 min | si |
| Slice 4 | No implementar runtime sin task hija | N/A | si |

### Production verification sequence

N/A — no runtime production cutover en esta task.

### Out-of-band coordination required

Puede requerir decision de provider de embeddings, privacidad y presupuesto.

## Acceptance Criteria

- [ ] Existe baseline comparativo FTS/rerank/hybrid sobre golden questions.
- [ ] Existe decision packet go/no-go con costo, latencia, privacy y calidad.
- [ ] `searchKnowledge` permanece como SSOT.
- [ ] No hay cambio productivo sin flag ni task hija.

## Verification

- `pnpm vitest run src/lib/knowledge/search`
- `pnpm qa:nexa-knowledge` si el ambiente lo permite
- `pnpm nexa:doc-gate --changed`

