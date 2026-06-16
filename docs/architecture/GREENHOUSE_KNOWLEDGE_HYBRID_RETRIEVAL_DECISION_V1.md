# GREENHOUSE_KNOWLEDGE_HYBRID_RETRIEVAL_DECISION_V1

> **Tipo:** Decision packet (ADR de evaluación) — TASK-1136.
> **Estado:** Accepted (decisión de evaluación) — **GO condicional a un piloto gated**; sin cambio productivo en esta task.
> **Fecha:** 2026-06-16. **Owner:** Knowledge / Nexa / AI.
> **Código de referencia:** [`search-knowledge.ts`](../../src/lib/knowledge/search/search-knowledge.ts), [`rerank-knowledge-chunks.ts`](../../src/lib/knowledge/search/rerank-knowledge-chunks.ts), [`retrieval-eval.ts`](../../src/lib/knowledge/search/retrieval-eval.ts), [`list-chunks-for-embedding.ts`](../../src/lib/knowledge/search/list-chunks-for-embedding.ts).
> **Scripts de evidencia (offline):** [`scripts/knowledge/retrieval-eval.ts`](../../scripts/knowledge/retrieval-eval.ts), [`scripts/knowledge/hybrid-shadow-eval.ts`](../../scripts/knowledge/hybrid-shadow-eval.ts).

---

## 1. Decisión

**GO condicional a un piloto gated** de retrieval híbrido `FTS + embeddings Vertex + pgvector` sobre el **Cloud SQL existente**, detrás de flag, aditivo al SSOT `searchKnowledge` — **PERO** solo si el piloto resuelve la condición dura: **el brazo vector es un refuerzo de recall que NO puede manufacturar respuestas; el no-answer honesto se preserva**. La implementación productiva NO se hace en TASK-1136 (queda como task hija — Slice 4).

**Rechazado en esta etapa:**
- ❌ **Híbrido ingenuo (FTS ⊕ vector sin gate)** — la evidencia muestra que **rompe el no-answer honesto** (regresión real, ver §3). No es shippeable.
- ❌ **Managed Vertex Vector Search / Vertex RAG Engine / Spanner administrado como runtime** — introduce costo fijo always-on de cientos de USD/mes para un corpus de 1471 chunks y QPS interno mínimo. No justificado por volumen (§4). Queda como alternativa comparada, no recomendada.
- ❌ **No-go total** — los datos de paráfrasis (7/8 vs 3/8) muestran valor real de recall que sería un error descartar.

**Una línea:** el corpus es chico → el costo de embeddings es ruido; el riesgo real es (a) infra managed always-on y (b) que el vector rompa la honestidad del no-answer. La ruta barata (pgvector en el Cloud SQL actual) elimina (a); el gate FTS-señal elimina (b). Eso es lo que el piloto debe demostrar.

---

## 2. Contexto y baseline (Slice 1)

El RAG actual es **FTS Postgres (`body_tsv` + `ts_rank`, accent-insensitive, OR-ify) + rerank conservador** (TASK-1124), detrás del SSOT `searchKnowledge` (contrato `knowledge-search.v1`). TASK-1080 difirió embeddings hasta tener evidencia de calidad/volumen. TASK-1127 dejó el baseline (golden questions con wrong-source + cross-doc).

**Baseline medido contra el corpus real** (45 golden questions, `pnpm tsx scripts/knowledge/retrieval-eval.ts`):

| Arm | Pass | Recall | Precision@1 | MRR | Cross-doc | No-answer | Wrong-src | Latencia p95 |
|---|---|---|---|---|---|---|---|---|
| FTS | 45/45 (100%) | 100% | 100% | 0.900 | 100% | 2/2 | 0 | ~321ms |
| FTS+rerank | 45/45 (100%) | 100% | 100% | 0.904 | 100% | 2/2 | 0 | ~328ms |

**El baseline está saturado en el golden set.** Implicación dura: el híbrido **no puede "mejorar" un set que ya pasa 100%** en estas métricas; su único aporte posible es (a) MRR marginal, (b) recall en preguntas con **mismatch de vocabulario** (que el golden set no estresa), y (c) trae un **riesgo** de no-answer. Por eso el Slice 2 agrega probes que el golden set no cubre.

Corpus real (no el piloto de 11 docs de la spec): **105 documentos, 1471 chunks vigentes (~197k–235k tokens), 100% `internal`, 30 chunks `agent_excluded`.** pgvector está **disponible pero no instalado** en Cloud SQL (`pg_available_extensions` lo lista; `CREATE EXTENSION vector` es una migración, soportada por Cloud SQL — sin infra nueva).

---

## 3. Shadow prototype (Slice 2) — evidencia con embeddings Vertex reales

`pnpm tsx scripts/knowledge/hybrid-shadow-eval.ts` — embeddings **Vertex `text-multilingual-embedding-002`** (768d, corpus 100% es-CL), fusión **RRF (k=60)**, piso de cosine 0.55, 1471 chunks embebidos (~235k tokens), cacheados en artifact efímero gitignored. Mismo stack/IAM/region/project que Nexa hoy.

### 3.1 Golden questions (45)

| Arm | Pass | Recall | Precision@1 | MRR | Cross-doc | **No-answer** | Wrong-src |
|---|---|---|---|---|---|---|---|
| FTS | 45/45 | 100% | 100% | 0.916 | 100% | 2/2 | 0 |
| FTS+rerank | 45/45 | 100% | 100% | 0.904 | 100% | 2/2 | 0 |
| **Hybrid (ingenuo)** | **43/45** | 100% | 100% | 0.914 | 100% | **0/2** ⚠️ | 0 |

**El híbrido ingenuo es una regresión** en el golden set: el brazo vector devuelve vecinos para preguntas off-corpus (cosine nunca da "sin match") → **rompe el no-answer honesto** (0/2). MRR no mejora de forma material. Sobre el set curado, híbrido ingenuo < FTS+rerank.

### 3.2 Probe paráfrasis — mismatch de vocabulario (donde el vector gana)

8 preguntas reformuladas **sin** el término léxico del doc correcto (lenguaje natural de un operador):

| | FTS+rerank | Hybrid |
|---|---|---|
| Aciertos | **3/8** | **7/8** |

Recuperaciones que **solo** el híbrido logra: Portal Cliente, Payroll/honorarios, Account 360, Integraciones. Aquí el vector **gana fuerte**: recupera 4 casos que el FTS pierde por léxico puro. **Este es el valor real del híbrido** — preguntas naturales que no comparten vocabulario con el corpus.

### 3.3 Probe no-answer risk — off-corpus (el riesgo del vector)

4 preguntas off-corpus (Saturno, ceviche, mundial 86, clima Antártida):

| | Resultado |
|---|---|
| Vecinos devueltos sin piso | 4/4 (el vector SIEMPRE devuelve algo) |
| Brechas de honestidad con piso 0.55 | **2/4** (Saturno 0.560, ceviche 0.558) |

**Un piso de cosine fijo NO es suficiente:** los vecinos off-corpus alcanzan ~0.56, solapando el rango de matches legítimos. Subir el piso a ciegas mataría recuperaciones válidas. **La condición de diseño correcta es gatear el brazo vector por señal del FTS** (el vector solo refuerza/reordena cuando el FTS ya encontró algo dentro de su envelope), de modo que una pregunta genuinamente off-corpus (FTS = no-answer) nunca llegue a que el vector manufacture una respuesta. Ese gate es exactamente lo que el piloto debe validar contra **ambos** probes.

---

## 4. Modelo de costo (separado por componente)

Supuestos: corpus 1471 chunks / ~235k tokens; ~2k preguntas/mes internas; query ~30 tokens. Las **tarifas unitarias** están marcadas `[verificar tarifa vigente]`; lo decisivo es la **magnitud relativa**, robusta a cualquier precio plausible.

| Componente | Cantidad | Costo (magnitud) | Notas |
|---|---|---|---|
| **Embedding one-time (corpus)** | ~235k tokens, 1 vez | **centavos** (< US$0.05) `[tarifa vigente]` | Re-embed solo al cambiar/ingerir un doc (incremental por checksum) |
| **Embedding por query (runtime)** | ~30 tok × 2k/mes = ~60k tok/mes | **centavos/mes** `[tarifa vigente]` | Cacheable por query normalizada |
| **Storage propio / pgvector** | 1471 × 768 × 4B ≈ **4.5 MB** + índice HNSW | **~0 incremental** | Vive en el Cloud SQL existente; sin infra nueva |
| **Vertex Vector Search (managed)** | índice + **endpoint always-on** | **cientos de US$/mes** `[verificar]` | Nodo desplegado 24/7 — el costo trampa para un corpus chico |
| **Vertex RAG Engine (managed)** | vector store administrado (Spanner/RagManagedDb) | **costo fijo mensual** `[verificar]` | Mismo problema: infra always-on antes de tener volumen |
| **LLM final (síntesis Nexa)** | sin cambio | igual que hoy | El híbrido cambia el retrieval, no la generación |

**Conclusión de costo:** para este corpus, embeddings + pgvector = ruido contable. El único costo material es **managed always-on**, que el corpus/QPS no justifican.

---

## 5. Comparación de las 3 rutas (decision-only)

| Ruta | Calidad esperada | Costo | Complejidad / infra | Veredicto |
|---|---|---|---|---|
| **FTS/rerank actual** | Excelente en golden (100%), débil en paráfrasis (3/8) | ~0 | nula (ya en prod) | Base sólida; deja recall de paráfrasis sobre la mesa |
| **FTS + Vertex embeddings + pgvector** (gated) | +4 recuperaciones de paráfrasis; preserva golden si gateado | centavos | 1 migración (`CREATE EXTENSION vector` + columna + índice HNSW); sin infra nueva | ✅ **Ruta recomendada para el piloto** |
| **Managed Vertex Vector Search / RAG Engine** | Igual o marginal vs pgvector a este volumen | cientos/mes always-on | endpoint/servicio administrado nuevo | ❌ No justificado hasta tener QPS/corpus que lo pidan |

Disparadores para reconsiderar managed (no antes): corpus ≫ 100k chunks, QPS sostenido que sature pgvector, o necesidad multi-región. Ninguno aplica hoy.

---

## 6. Thresholds go/no-go (para la task hija)

El piloto pasa a producción **solo si**, contra el corpus real:

1. **No-answer honesto = 100%** (los casos off-corpus + golden no-answer NO se rompen). **Hard gate, no negociable.**
2. **Wrong-source violations = 0** (el vector no trae fuentes semánticamente parecidas pero incorrectas; preservar `mustNotReturn`).
3. **Recall de paráfrasis ≥ híbrido shadow** (no perder las recuperaciones; objetivo ≥ 7/8) **sin** degradar el golden set (mantener 45/45).
4. **MRR ≥ baseline** (0.904) en el golden set.
5. **Latencia p95 dentro de presupuesto.** ⚠️ **Corrección post-validación runtime (TASK-1151):** el ≤400ms original solo contó pgvector (sub-ms); la validación runtime midió **p95 ~920ms** porque el **embedding de la query es un round-trip Vertex (~600ms)**. El ≤400ms es inalcanzable por query novel sin cache de query-embeddings. Budget revisado: aceptable en el path Nexa (el LLM ya tarda segundos) con cache; para el search UI sub-400ms requiere un embedding local/más rápido o cache agresivo. Este es el blocker dominante del flip.
6. **Costo mensual incremental ≤ US$5** para el runtime pequeño (embeddings + pgvector). Si exige managed always-on → no-go automático del piloto.

Si (1) o (2) no se cumplen con el gate diseñado → **no-go** documentado, FTS+rerank se queda como estado canónico.

---

## 7. Privacy posture

El corpus es 100% `internal`. Los embeddings se generan en **Vertex AI, mismo project/IAM/region (`efeonce-group`) que Nexa ya usa** — **no se introduce un proveedor nuevo ni sale data a un tercero no aprobado**. Es el mismo posture de privacidad vigente para la generación de Nexa. La ruta preferida de la spec (Vertex-first para embeddings) queda **aprobada** por esta equivalencia. Cualquier proveedor de embeddings distinto a Vertex requeriría una decisión de privacidad/secretos separada (no contemplada).

---

## 8. Rollout flags + rollback (para la task hija, NO en TASK-1136)

- Flag canónico nuevo `KNOWLEDGE_SEARCH_HYBRID_ENABLED` (default OFF → byte-equivalente al FTS+rerank actual). Patrón `process.env.X === 'true'`.
- El híbrido entra **detrás del mismo SSOT `searchKnowledge`** (aditivo; no se crea reader paralelo; contrato `knowledge-search.v1` intacto).
- Generación de embeddings del corpus = paso de ingesta (reactivo/idempotente por checksum), NUNCA inline en el request path.
- Rollback = flag OFF (instantáneo, sin deploy). La columna/índice pgvector quedan inertes con el flag OFF.

---

## 9. 4-pilar (arch-architect)

- **Safety:** el riesgo central (vector manufacturando respuestas / wrong-source semántico) se gatea por señal del FTS + thresholds duros (1, 2 en §6). Corpus `internal`, Vertex mismo posture. El flag default OFF mantiene el estado seguro vigente.
- **Robustness:** el SSOT no cambia; el contrato `knowledge-search.v1` no cambia; el pre-LLM filter (tenant/audience/policy) se preserva (el read helper replica el mismo envelope). Embeddings idempotentes por checksum. Fusión RRF determinista (testeada).
- **Resilience:** flag OFF = rollback inmediato byte-equivalente. pgvector vive en el Cloud SQL existente (mismo perfil de disponibilidad). Sin dependencia runtime de servicios managed always-on. Degradación honesta: si el embedding por query falla, el híbrido cae a FTS.
- **Scalability:** pgvector HNSW absorbe 10× el corpus sin rediseño; el costo crece linealmente en centavos. El umbral para managed (§5) está declarado. QPS interno mínimo.

---

## 10. Reglas duras (anti-regresión)

- **NUNCA** shippear híbrido sin preservar el **no-answer honesto** (gate FTS-señal o equivalente validado contra el off-corpus probe). El híbrido ingenuo rompe 0/2 — está prohibido en producción.
- **NUNCA** crear un reader de retrieval paralelo al SSOT `searchKnowledge`. El híbrido entra detrás del mismo SSOT, aditivo, flag-gated; contrato `knowledge-search.v1` intacto.
- **NUNCA** activar Vertex Vector Search / Vertex RAG Engine / Spanner administrado como runtime sin volumen/QPS que lo justifique (§5) + decisión explícita de presupuesto. A este volumen, pgvector en el Cloud SQL actual es la ruta canónica.
- **NUNCA** enviar el corpus a un proveedor de embeddings distinto de Vertex sin una decisión de privacidad/secretos separada.
- **NUNCA** generar embeddings inline en el request path; es un paso de ingesta idempotente por checksum.
- **SIEMPRE** que el híbrido se evalúe o ajuste, correr AMBOS probes (paráfrasis = no perder recall; off-corpus = no romper no-answer). Uno sin el otro da una conclusión falsa.

---

## 11. Open questions (deliberadamente no decididas)

- **Política de gate exacta** del brazo vector (FTS-signal-gate vs piso de cosine tuneado vs ambos): es la decisión central que el piloto debe settlear empíricamente, validada contra los dos probes simultáneamente. La evidencia sugiere FTS-signal-gate como la más robusta, pero el dato exacto (¿los aciertos de paráfrasis tuvieron señal FTS no nula?) lo cierra el piloto.
- **Modelo de embedding** definitivo: `text-multilingual-embedding-002` (usado, 768d) vs `gemini-embedding-001` (más nuevo, multilingüe, dimensión configurable). El piloto puede A/B-ear; el corpus es chico, re-embed es trivial.
- **Granularidad del índice** (chunk vs documento, heading-aware): el prototipo embebió `título+heading+body`; el piloto puede medir variantes.

---

## 12. Slice 4 — scaffold

Resultado de TASK-1136 = **GO condicional**. Se abre task hija de implementación productiva gated (no incluida aquí): `CREATE EXTENSION vector` + columna de embedding + índice HNSW + paso de ingesta de embeddings + brazo vector gateado dentro de `searchKnowledge` detrás de `KNOWLEDGE_SEARCH_HYBRID_ENABLED` + validación contra los thresholds §6. Hasta entonces, **FTS+rerank sigue siendo el estado canónico** y no hay cambio productivo.
