# TASK-1136 — Knowledge hybrid retrieval evaluation + vector readiness

## Delta 2026-06-16

- **Dependencia desbloqueada — TASK-1127 (complete).** El baseline de calidad que esta task necesita ya
  existe: las golden questions se ampliaron con casos **wrong-source** (`expectFirstTitleIncludes`: el doc
  específico debe rankear primero) y **cross-document** (`expectDistinctDocumentsAtLeast`: ≥2 documentos
  distintos), validados 45/45 contra el corpus real, más un **nightly** de la QA matrix contra staging
  (`nexa-knowledge-qa-nightly.yml`). Eso es la **regresión del retrieval FTS+rerank actual** contra la cual
  TASK-1136 debe medir si vector/híbrido mejora. `Blocked by` puede cambiarse de `TASK-1127` a `none`.

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
embeddings/vector como capa aditiva detras del mismo `searchKnowledge` SSOT. La ruta preferida para
esta evaluacion es **Vertex-first para embeddings**, no Vertex RAG Engine-first para runtime: aprovechar
el stack Vertex ya usado por Nexa, manteniendo storage propio/Cloud SQL como primera opcion de costo
controlado.

## Why This Task Exists

TASK-1080 difirio embeddings/vector hasta medir calidad y volumen real. TASK-1124 mejoro la sintesis,
pero no cambia el recall semantico del retrieval. Antes de agregar vector a produccion, Greenhouse
necesita evidencia: que casos falla FTS, que mejora hybrid, costo/latencia, privacidad del corpus y
si el storage debe ser `pgvector`, Vertex/BQ u otra opcion. El riesgo de costo no esta principalmente
en generar embeddings sobre un corpus pequeno/mediano, sino en activar infraestructura administrada
siempre encendida (`Vertex Vector Search`, `Vertex RAG Engine`/Spanner administrado) antes de tener
evidencia de calidad, QPS y necesidad operacional.

## Goal

- Usar los resultados de `TASK-1127` como baseline de calidad.
- Construir una evaluacion offline/shadow de retrieval hibrido sin cambiar el contrato publico.
- Decidir si vector/hybrid justifica costo y complejidad.
- Estimar costo incremental por etapa: eval offline, runtime pequeno, runtime medio y alternativa
  administrada Vertex.
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
- Usar Vertex embeddings como opcion preferida para la evaluacion si privacy/IAM/region quedan aprobados,
  porque Nexa ya opera sobre Vertex AI en el proyecto GCP de Efeonce.
- No enviar corpus sensible a ningun provider de embeddings sin decision de privacidad/secretos.
- Hybrid debe ser aditivo, flag-gated y comparado contra FTS baseline.
- No activar Vertex RAG Engine, Vertex Vector Search o Spanner administrado como runtime por defecto en
  esta task; deben aparecer solo como alternativa comparada en el decision packet.

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
- No hay modelo de costo que separe: embedding one-time, embedding por query, storage propio,
  infraestructura administrada y costo LLM final.

<!-- ZONE 2 — PLAN MODE: no llenar al crear la task -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Baseline and failure taxonomy

- Consumir resultados de `TASK-1127` y clasificar fallas: lexical miss, wrong-source, cross-doc,
  stale-source, corpus gap.
- Definir metricas: recall@k, MRR, citation readiness, latency, denied/filter preservation.

### Slice 2 — Shadow hybrid prototype

- Prototipo no-productivo de embeddings/vector sobre muestra gobernada usando Vertex embeddings como
  primera opcion, salvo bloqueo de privacidad/IAM/region.
- Guardar resultados del prototipo en storage propio o artifact efimero; no crear dependencia runtime
  con Vertex RAG Engine.
- Comparar FTS, rerank y hybrid sobre el mismo set de golden questions.
- No cambiar runtime de `/api/home/nexa`.

### Slice 3 — Decision packet

- Comparar explicitamente estas rutas:
  - `FTS/rerank actual` sin vector.
  - `FTS + Vertex embeddings + storage propio/pgvector` como ruta barata preferida.
  - `Vertex Vector Search` o `Vertex RAG Engine` solo si QPS, corpus o operacion administrada lo justifican.
- Documentar storage/provider recomendado, costos, privacy posture, rollout flags y rollback.
- Incluir tabla de costos con supuestos minimos: volumen de corpus, chunks, tokens promedio por chunk,
  preguntas/mes, embedding-query cache hit, latencia p95 y costo mensual incremental.
- Definir thresholds de go/no-go: mejora minima de recall/MRR/citation readiness, costo mensual maximo
  aceptable para runtime pequeno y condicion para evaluar managed Vertex.
- Si no mejora suficiente, cerrar como no-go con evidencia.

### Slice 4 — Implementation scaffold if approved

- Si el decision packet aprueba, dejar task hija o scaffold gated para production implementation.

## Out of Scope

- Activar vector en produccion.
- Activar Vertex RAG Engine, Vertex Vector Search o Spanner administrado como parte del runtime.
- Cambiar el contrato `knowledge-search.v1`.
- Reescribir ingestion/chunking salvo hallazgos bloqueantes documentados.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

TASK-1127 -> Slice 1 -> Slice 2 -> Slice 3 -> Slice 4.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Vector trae fuentes semanticamente parecidas pero incorrectas | knowledge | medium | eval wrong-source + policy filters pre-LLM | MRR / wrong-source rate |
| Costo/latencia sube sin mejora real | ai/cost | medium | Vertex embeddings primero + storage propio + shadow eval + no-go threshold | latency/cost report |
| Managed Vertex introduce costo fijo antes de volumen suficiente | ai/cost | medium | Prohibir runtime managed en esta task; comparar como alternativa decision-only | monthly cost estimate |
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

Puede requerir decision de provider de embeddings, privacidad, presupuesto y aprobacion explicita si el
decision packet recomienda managed Vertex.

## Acceptance Criteria

- [ ] Existe baseline comparativo FTS/rerank/hybrid sobre golden questions.
- [ ] El prototipo usa Vertex embeddings o documenta por que no pudo usarlos.
- [ ] Existe decision packet go/no-go con costo, latencia, privacy y calidad.
- [ ] El decision packet separa costo de embeddings, storage/vector DB, infraestructura administrada y
      LLM final.
- [ ] La ruta barata (`FTS + Vertex embeddings + storage propio/pgvector`) se compara contra
      `Vertex Vector Search`/`Vertex RAG Engine` antes de recomendar managed runtime.
- [ ] `searchKnowledge` permanece como SSOT.
- [ ] No hay cambio productivo sin flag ni task hija.

## Verification

- `pnpm vitest run src/lib/knowledge/search`
- `pnpm qa:nexa-knowledge` si el ambiente lo permite
- `pnpm nexa:doc-gate --changed`
