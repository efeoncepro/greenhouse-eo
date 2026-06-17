# 07 — Knowledge Retrieval + Calidad de Respuesta

> **Capa:** retrieval del corpus + calidad de respuesta. **Código:** [`nexa-tools.ts`](../../../../src/lib/nexa/nexa-tools.ts), [`search-knowledge.ts`](../../../../src/lib/knowledge/search/search-knowledge.ts), [`rerank-knowledge-chunks.ts`](../../../../src/lib/knowledge/search/rerank-knowledge-chunks.ts), [`scripts/nexa-knowledge-qa-matrix.mjs`](../../../../scripts/nexa-knowledge-qa-matrix.mjs).
> **Detalle técnico del RAG:** [`technical/rag-pipeline.md`](../technical/rag-pipeline.md).

## De "pegar un fragmento" a "respuesta sintetizada"

La meta de esta capa: que una respuesta respaldada por Knowledge sea una **respuesta propia que
cruza los documentos**, no un copy-paste del primer pasaje. Las piezas (todas detrás de flag,
default OFF byte-equivalente):

### 1. Search SSOT

`searchKnowledge` (modo `agentic` para Nexa) es el **único** punto de retrieval. Pre-LLM filtering
en SQL (tenant/audience/publication/policy) ANTES de armar el packet. Contrato `knowledge-search.v1`.
Nadie queryea las tablas del corpus directo (lint `no-direct-knowledge-chunk-query`).

### 2. Evidence brief sintetizable — `buildKnowledgeEvidenceBrief`

Flag `NEXA_KNOWLEDGE_SYNTHESIS_BRIEF_ENABLED`. En vez de pasarle al modelo líneas de excerpt sueltas,
arma un **brief**: agrupa los fragmentos **por documento**, **deduplica** excerpts casi idénticos
(preservando todos los marcadores `[n]` — los fusiona), agrega **contexto de sección** (`headingPath`)
y le instruye sintetizar cruzando documentos. El `[n]` sigue ligado al índice del chunk (consistencia
UI ↔ modelo). Sanea encabezados Markdown (`stripMarkdownHeadings`) del contexto LLM-facing.

### 3. Rerank conservador — `rerankKnowledgeChunks`

Flag `KNOWLEDGE_SEARCH_RERANK_ENABLED` (capa search SSOT → afecta Nexa + MCP + UI). Reordena el
**top-N ya recuperado por FTS** (mismo set → `confidence`/`freshness`/`deniedCount` intactos; default
OFF byte-equivalente). Mezcla: rank FTS (dominante) + **match de encabezado** (anti wrong-source: un
chunk con heading específico gana a uno con heading genérico que matcheó por ruido del cuerpo) +
freshness + **diversidad por documento**. Determinista; NO muta `chunk.score`.

### 4. Hygiene de evidencia

Se removió el post-procesador que anexaba "Fuentes: [n]=…"; el grounding del tool ya no pide "cierra
con Fuentes:"; se sanean los `##` crudos. (Detalle en [`06-evidence-and-citations.md`](evidence-and-citations.md).)

## QA de calidad de respuesta

`pnpm qa:nexa-knowledge -- --env=local|staging` corre la matriz gobernada contra `/api/home/nexa`
con agent-session. Además de routing/citas/no-answer, asserta sobre el texto crudo del modelo:
**síntesis** (no copia), **sin volcado "Fuentes:"**, **regresión `##`**, **voz** (🍏, voseo) y, en temas
sensibles, el **cierre de validación humana** (`sensitiveValidation`).

> **Gate K6 — cierre de validación en temas sensibles (TASK-1140 follow-up):** el caso K6 (nómina)
> fallaba consistente, pero el root cause **no era el prompt** (la regla ya existía): la respuesta se
> **truncaba** a ~500 tokens ANTES del cierre (fix → `maxOutputTokens: 1024` en el provider Gemini, ver
> [`../technical/llm-models.md`](../technical/llm-models.md)). Además el regex del assert solo aceptaba el
> **infinitivo** ("validar con") y la voz de Nexa usa el **tuteo imperativo** ("valida con People") → falso
> negativo; ahora acepta ambos + "antes de actuar, valida …". Con los dos fixes K6 pasa 3/3 y la respuesta
> cierra con "Antes de actuar, valida con People y Finanzas." (evidencia viva, 2993 chars completos).

El eval de **retrieval** (golden questions) vive aparte, offline: `golden-questions.live.test.ts`
(correctitud del recall/precisión del FTS). Son complementarios: uno mide la respuesta, el otro la búsqueda.

> **Nightly contra staging (TASK-1127):** `.github/workflows/nexa-knowledge-qa-nightly.yml` corre la QA
> matrix toda las noches contra staging (provider real → Claude) con `--min-pass=9`. El **umbral** tolera
> la flakiness conocida del LLM (tool-routing K4/G1/K7) para no volverse ruidoso (lección del
> production-release-watchdog) — pero si varios casos core caen, el job FALLA = alerta honesta. Es
> `tooling` (GitHub Actions, no async-critical, no Vercel cron). Skip honesto si faltan los secrets de
> staging. **El nightly ya probó su valor:** detectó que el gate K6 fallaba en staging (Claude truncaba
> a 700 tokens) cuando el fix de Gemini solo cubría local.

> **Baseline de retrieval ampliado (TASK-1127):** las golden questions suman dos clases que faltaban —
> **wrong-source** (`expectFirstTitleIncludes`: el doc específico debe rankear PRIMERO sobre un end-to-end
> genérico que matcheó por ruido) y **cross-document** (`expectDistinctDocumentsAtLeast`: una respuesta que
> cruza ≥2 manuales trae ≥2 documentos distintos). Son la **regresión real del rerank** (heading boost +
> diversidad) y el **baseline de calidad que consume TASK-1136** (evaluación de retrieval híbrido/vector).

> **Local vs staging:** `/api/home/nexa` resuelve **Gemini** localmente; en staging/prod el auto-router
> manda las preguntas de conocimiento a **Claude**. Una compliance de voz/cita puede variar — la
> verificación viva canónica es en staging con V2 + auto-router ON.

## Calidad del corpus (data quality)

Si Nexa responde algo incorrecto pero **citado**, casi siempre la fuente del corpus tiene el error
(no es alucinación). Fix de raíz: corregir el documento del corpus + **re-ingestar**
(`pnpm` ingest, dry-run revisado → apply). Caso real: RpA "Revisions per Asset" → "Rounds per Asset"
en `motor-ico-metricas-operativas.md`.

## Flags de esta capa

| Flag | Efecto | Default |
|---|---|---|
| `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED` | habilita la política/tool de knowledge | OFF |
| `NEXA_KNOWLEDGE_SYNTHESIS_BRIEF_ENABLED` | grounding como brief sintetizable | OFF |
| `KNOWLEDGE_SEARCH_RERANK_ENABLED` | rerank del top-N FTS | OFF |
| `KNOWLEDGE_SEARCH_HYBRID_ENABLED` | brazo vector híbrido (FTS + pgvector), agéntico-only, FTS-signal-gated (TASK-1151) | OFF |

ON en local + Vercel **staging**; **producción gated por sign-off del operador**.

### Híbrido FTS + pgvector (TASK-1151) — gated, agéntico-only

Brazo vector aditivo dentro del SSOT `searchKnowledge` (`KNOWLEDGE_SEARCH_HYBRID_ENABLED`, default OFF =
byte-equivalente). pgvector + HNSW cosine en el Cloud SQL existente (NO managed Vertex); embeddings Vertex
`text-multilingual-embedding-002` como **paso de ingesta idempotente por checksum** (`embed-corpus.ts`), NUNCA
en el request path. Acotado a **modo agéntico** (la latencia del embedding de la query ~600ms se absorbe en el
stream del LLM; el search humano queda FTS puro). **FTS-signal-gate** (vector solo si el FTS encontró algo →
no-answer honesto intacto) + **fusión de dos niveles `hybridFuse`** (protege hits FUERTES del FTS = golden-safe;
compite los débiles vs vector-only = recall de paráfrasis) + degradación honesta a FTS. **Source-agnostic** →
funciona idéntico con repo-docs y wikis Notion (un chunk es un chunk en `knowledge_chunks`). Validado VERDE
golden-safe (golden 45/45 + paráfrasis 4/8, cero regresión); el salto a 7/8 sin tocar golden = **reranker de
relevancia** (follow-up). Decisión/evidencia: [`GREENHOUSE_KNOWLEDGE_HYBRID_RETRIEVAL_DECISION_V1.md`](../../GREENHOUSE_KNOWLEDGE_HYBRID_RETRIEVAL_DECISION_V1.md).

## Reglas duras

- ❌ NUNCA queryear el corpus directo; pasar por `searchKnowledge`.
- ❌ NUNCA un LLM call sin retrieval para una respuesta de conocimiento.
- ❌ NUNCA responder un **dato operativo en vivo** (nómina, pago propio, OTD, capacidad, cuentas) desde Knowledge — rutear a su **tool operativo**. El pago propio del colaborador ("cuánto cobré y por qué") → `explain_my_pay` (TASK-1146, member-self, regime-aware, anti-oracle por `context.memberId`), NUNCA `search_knowledge`.
- ✅ El rerank reordena el set, no lo amplía; no muta `chunk.score`.
- ✅ Corpus incorrecto → corregir el doc + re-ingestar, no parchear el prompt.
