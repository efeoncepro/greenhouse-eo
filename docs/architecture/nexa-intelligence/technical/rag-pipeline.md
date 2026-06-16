# Técnico — Pipeline RAG (Retrieval-Augmented Generation)

> **Código:** [`search-knowledge.ts`](../../../../src/lib/knowledge/search/search-knowledge.ts), [`rerank-knowledge-chunks.ts`](../../../../src/lib/knowledge/search/rerank-knowledge-chunks.ts), [`nexa-tools.ts`](../../../../src/lib/nexa/nexa-tools.ts), [`conversational-evidence.ts`](../../../../src/lib/nexa/conversational-evidence.ts).
> **Corpus / ingesta:** [`GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md`](../../GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md).

Nexa hace **RAG** sobre el corpus gobernado de Greenhouse Knowledge: recupera evidencia publicada y
**sintetiza** una respuesta citada, en vez de contestar de memoria. El RAG de Greenhouse es
**retrieval-grounded** (no fine-tuning): el modelo solo ve lo que el retrieval le pasa por turno.

## End-to-end

```text
[Ingesta — offline, ops]
  Notion / repo docs → connector → normalize (chunker heading-pathed + checksum)
    → sanitize-before-chunk (fail-closed: secretos/PII/prompt-injection → quarantined)
    → publish chunks a greenhouse_knowledge (idempotente por checksum)

[Retrieval — runtime, por turno]
  pregunta del usuario
   → classifyNexaIntent = knowledge → tool search_knowledge (modo agentic)
   → searchKnowledge (SSOT, knowledge-search.v1):
       1. tsquery: websearch_to_tsquery('spanish', unaccent(q)) + OR-ify ('&'→'|')
       2. FTS sobre body_tsv (GIN; heading weight A > body B) con ts_rank
       3. pre-LLM filter en SQL: tenant/audience/publication_status/agentic_policy/sensitivity
       4. piso de relevancia (MIN_RANK_FLOOR) → no-answer honesto si nada matchea
       5. cuenta (no trae) los chunks denegados por política → deniedOrFilteredCount
   → rerankKnowledgeChunks (flag): reordena el top-N (mismo set) por rank FTS + heading match +
       freshness + diversidad por documento
   → packet knowledge-search.v1 { chunks[], confidence, freshness, deniedOrFilteredCount }

[Augmentation — grounding]
  buildKnowledgeGroundingSummary / buildKnowledgeEvidenceBrief (flag):
    agrupa por documento + dedupe (preserva [n]) + contexto de sección (headingPath)
    + strip de Markdown estructural (##) del contexto LLM-facing
  → se inyecta como tool result en la 2da pasada del provider

[Generation — síntesis citada]
  el modelo (Gemini local / Claude staging-prod) sintetiza cruzando la evidencia
    + cita [n] inline ligado al fragmento + gap honesto si confianza none

[Evidence — UI]
  nexaToolResultToConversationalEvidence → nexa-evidence.v1
    → panel de Fuentes (excerpt limpiado con toPlainExcerpt) + procedencia/trazabilidad
```

## Substrato de retrieval

- **Full-text search (FTS) de Postgres**: columna `body_tsv tsvector GENERATED` (config `spanish`,
  accent-insensitive vía `unaccent`, heading peso `A` > body `B`) + índice GIN. `ts_rank` ordena.
- **OR-ify de la query**: las preguntas naturales traen verbos/ruido que no están en el chunk; con
  AND (default de `websearch`) ningún chunk tiene TODOS los términos → recall pobre. Con OR cualquier
  término matchea y `ts_rank` prioriza. El no-answer honesto sigue siendo 0 resultados.
- **Vector / embeddings (híbrido)**: **construido y gated (TASK-1151)** sobre la evaluación de TASK-1136.
  Brazo vector aditivo DENTRO del SSOT `searchKnowledge` (`KNOWLEDGE_SEARCH_HYBRID_ENABLED`, **default OFF** =
  byte-equivalente al FTS+rerank). `embedding vector(768)` en `knowledge_chunks` + índice HNSW cosine en el
  Cloud SQL existente (**NO** managed Vertex Vector Search/RAG Engine — corpus chico); embeddings Vertex
  `text-multilingual-embedding-002` como **paso de ingesta idempotente por checksum** (`embed-corpus.ts`), NUNCA
  en el request path. Runtime: **mode-scope a agéntico** (la latencia del embedding de la query ~600ms se
  absorbe en el stream del LLM; el search humano queda FTS puro) + **FTS-signal-gate** (vector solo si el FTS
  encontró algo → no-answer honesto intacto) + **fusión de dos niveles `hybridFuse`** (protege hits FUERTES del
  FTS = golden-safe; compite los débiles vs vector-only = recall de paráfrasis) + degradación honesta a FTS.
  **Source-agnostic:** opera sobre `knowledge_chunks` → idéntico para repo-docs y wikis Notion. Validado VERDE
  golden-safe (golden 45/45 + paráfrasis 4/8, cero regresión); el salto a 7/8 sin tocar golden = **reranker de
  relevancia** (follow-up). Decisión/evidencia/cost-model/thresholds: [`GREENHOUSE_KNOWLEDGE_HYBRID_RETRIEVAL_DECISION_V1.md`](../../GREENHOUSE_KNOWLEDGE_HYBRID_RETRIEVAL_DECISION_V1.md). Flip a prod = decisión del operador.

## Reranking (señales)

Sobre el top-N de FTS (no amplía el pool): rank FTS (dominante) × (1 + heading match boost +
freshness adj) × diversity decay por documento. Determinista, no muta `chunk.score`. Anti
wrong-source: un heading específico que matchea la pregunta gana a un heading genérico que matcheó
por ruido del cuerpo. Detalle: [`../07-knowledge-retrieval-answer-quality.md`](../knowledge/retrieval-answer-quality.md).

## Calidad / evaluación

- **Golden questions** (`golden-questions.live.test.ts`): eval offline del retrieval (recall/precisión).
- **QA matrix** (`pnpm qa:nexa-knowledge`): eval live de la respuesta (síntesis, citas, sin "Fuentes:",
  regresión `##`, voz).
- **Data quality del corpus**: una respuesta incorrecta pero citada ⇒ la fuente del corpus tiene el
  error ⇒ corregir el doc + re-ingestar (no parchear el prompt).

## Reglas duras

- ❌ NUNCA queryear las tablas del corpus directo (lint `no-direct-knowledge-chunk-query`); pasar por `searchKnowledge`.
- ❌ NUNCA un LLM call sin retrieval para una respuesta de conocimiento.
- ❌ NUNCA romper el contrato `knowledge-search.v1` sin bumpear versión.
- ✅ El contenido denegado por política se cuenta, nunca se trae (pre-LLM filtering en SQL).
