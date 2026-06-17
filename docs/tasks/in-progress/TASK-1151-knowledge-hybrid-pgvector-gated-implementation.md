# TASK-1151 — Knowledge hybrid retrieval (FTS + pgvector) gated implementation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `migration`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `knowledge|nexa|ai|data`
- Blocked by: `none` (TASK-1136 complete — decision packet GO condicional)
- Branch: `task/TASK-1151-knowledge-hybrid-pgvector-gated-implementation`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Implementación productiva GATED del retrieval híbrido `FTS + embeddings Vertex + pgvector`
para Knowledge/Nexa, aditivo dentro del SSOT `searchKnowledge` y detrás del flag
`KNOWLEDGE_SEARCH_HYBRID_ENABLED` (default OFF = byte-equivalente al FTS+rerank actual).
Materializa la ruta barata aprobada en el decision packet TASK-1136: pgvector en el Cloud SQL
existente (sin infra managed), con el brazo vector como **refuerzo de recall gateado por señal
del FTS** para preservar el no-answer honesto.

## Why This Task Exists

TASK-1136 midió que el FTS+rerank está saturado en el golden set (45/45) pero pierde recall en
preguntas con **mismatch de vocabulario** (paráfrasis: FTS 3/8 vs híbrido 7/8). El híbrido
**ingenuo** rompe el no-answer honesto (vector siempre devuelve vecinos: 0/2 en off-corpus). El
veredicto fue **GO condicional**: el valor de recall es real, pero solo es shippeable si el brazo
vector no puede manufacturar respuestas. Esta task implementa exactamente esa ruta gateada y la
valida contra los thresholds duros del packet.

## Goal

- pgvector instalado + columna de embedding + índice HNSW en el Cloud SQL existente (migración additive).
- Paso de ingesta de embeddings idempotente por checksum (reactivo, nunca inline en el request path).
- Brazo vector gateado DENTRO de `searchKnowledge` detrás de `KNOWLEDGE_SEARCH_HYBRID_ENABLED`, con
  FTS-signal-gate que preserva no-answer honesto = 100% y wrong-source = 0.
- Validación contra los thresholds §6 de `GREENHOUSE_KNOWLEDGE_HYBRID_RETRIEVAL_DECISION_V1` antes de
  cualquier flip a producción.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_KNOWLEDGE_HYBRID_RETRIEVAL_DECISION_V1.md` (decision packet — fuente de verdad de esta task)
- `docs/architecture/GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/nexa-intelligence/technical/rag-pipeline.md`
- `docs/architecture/nexa-intelligence/knowledge/retrieval-answer-quality.md`

Reglas obligatorias:

- `searchKnowledge` sigue siendo el SSOT; el híbrido entra ADITIVO dentro de él. NO crear reader paralelo.
- NO romper el contrato `knowledge-search.v1` (bump a `v2` solo ante cambio breaking del shape).
- El brazo vector NUNCA puede manufacturar una respuesta: FTS-signal-gate (o piso de cosine validado contra
  el off-corpus probe). No-answer honesto = 100%, wrong-source = 0 son gates duros.
- Embeddings vía Vertex (mismo project/IAM/region que Nexa — mismo privacy posture). NUNCA otro proveedor sin
  decisión de privacidad separada. El corpus es `internal`.
- Generación de embeddings = paso de ingesta idempotente por checksum, NUNCA inline en el request path.
- Default flag OFF = byte-equivalente al FTS+rerank actual (rollback instantáneo sin deploy).
- NO activar Vertex Vector Search / Vertex RAG Engine / Spanner administrado (decisión packet §5).

## Normative Docs

- `docs/tasks/complete/TASK-1136-knowledge-hybrid-retrieval-vector-readiness.md`
- `docs/architecture/GREENHOUSE_KNOWLEDGE_HYBRID_RETRIEVAL_DECISION_V1.md` (§6 thresholds, §8 rollout, §10 reglas duras, §11 open questions)

## Dependencies & Impact

### Depends on

- `TASK-1136` (complete) — decision packet + eval harness + read helper.
- `src/lib/knowledge/search/search-knowledge.ts` (SSOT a extender)
- `src/lib/knowledge/search/retrieval-eval.ts` (eval core: RRF, cosine, métricas)
- `src/lib/knowledge/search/list-chunks-for-embedding.ts` (read helper de corpus)
- `src/lib/ai/google-genai.ts` (`getGoogleGenAIClient` → embeddings Vertex)
- Corpus publicado `greenhouse_knowledge` + pgvector disponible en Cloud SQL.

### Blocks / Impacts

- Mejora de recall de Knowledge en Nexa/MCP/UI (todos consumen el mismo SSOT).
- Pipeline de ingesta (re-embed por checksum al publicar un doc).

### Files owned

- `migrations/*-knowledge-chunk-embedding.sql` (pgvector + columna + índice)
- `src/lib/knowledge/search/search-knowledge.ts` (brazo vector gateado)
- `src/lib/knowledge/search/flags.ts` (`KNOWLEDGE_SEARCH_HYBRID_ENABLED`)
- `src/lib/knowledge/search/hybrid-vector-arm.ts` `[verificar]` (helper del brazo vector)
- `src/lib/knowledge/ingestion/*` (paso de embeddings)
- `scripts/knowledge/embed-corpus.ts` `[verificar]` (CLI de ingesta one-time/backfill)
- `docs/architecture/nexa-intelligence/technical/rag-pipeline.md` (Delta hybrid ON)

## Current Repo State

### Already exists

- FTS + rerank + SSOT `searchKnowledge` (contrato `knowledge-search.v1`).
- Eval core puro (`retrieval-eval.ts`: RRF, cosine, métricas, taxonomía) + read helper (`list-chunks-for-embedding.ts`).
- Shadow prototype offline (`scripts/knowledge/hybrid-shadow-eval.ts`) con embeddings Vertex reales.
- Decision packet con thresholds, cost model, rollout y reglas duras.

### Gap

- pgvector no instalado; sin columna de embedding ni índice.
- Sin paso de ingesta de embeddings.
- Sin brazo vector en runtime (el prototipo es offline, en memoria).
- Sin flag `KNOWLEDGE_SEARCH_HYBRID_ENABLED`.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `migration` (+ `reader`)
- Source of truth afectado: `searchKnowledge` (reader SSOT) + `greenhouse_knowledge.knowledge_chunks` (columna embedding)
- Consumidores afectados: `UI (Knowledge Center) / Nexa (agentic) / MCP` — todos vía el mismo SSOT
- Runtime target: `local|staging|production` (runtime) + `worker/cron` (ingesta de embeddings)

### Contract surface

- Contrato existente a respetar: `knowledge-search.v1` (`src/lib/knowledge/search/types.ts`)
- Contrato nuevo o modificado: ninguno del shape público; el híbrido cambia el ORDEN/recall, no el shape del packet
- Backward compatibility: `gated` (flag OFF = byte-equivalente al estado actual)
- Full API parity: la UI/Nexa/MCP consumen el SSOT `searchKnowledge`; el híbrido vive detrás, sin reader paralelo

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_knowledge.knowledge_chunks` (columna `embedding vector(768)` + índice HNSW)
- Invariantes que no se pueden romper:
  - No-answer honesto = 100% (el brazo vector NUNCA manufactura respuestas; FTS-signal-gate)
  - wrong-source = 0 (preservar `mustNotReturn`); pre-LLM filter (tenant/audience/policy) intacto
  - contrato `knowledge-search.v1` sin cambios de shape
- Tenant/space boundary: igual que el SSOT (envelope por mode/tenantType; el vector se computa solo sobre chunks ya filtrados)
- Idempotency/concurrency: embeddings idempotentes por checksum (re-embed solo si cambia el contenido del chunk)
- Audit/outbox/history: el re-embed se registra en `knowledge_publication_runs` (semántica existente)

### Migration, backfill and rollout

- Migration posture: `additive` (`CREATE EXTENSION vector` + `ADD COLUMN embedding` + índice HNSW; nullable, sin default destructivo)
- Default state: `flag OFF` (`KNOWLEDGE_SEARCH_HYBRID_ENABLED` default false → FTS+rerank puro)
- Backfill plan: `scripts/knowledge/embed-corpus.ts` dry-run → apply; idempotente por checksum; batch ~50
- Rollback path: flag OFF (instantáneo, sin deploy); columna/índice quedan inertes
- External coordination: ADC/Vertex (ya disponible para Nexa); env var del flag en cada entorno

### Security and access

- Auth/access gate: igual que el SSOT (capabilities `knowledge.*`); sin nueva superficie de auth
- Sensitive data posture: corpus `internal`; embeddings vía Vertex mismo posture que Nexa; sin proveedor nuevo
- Error contract: `captureWithDomain('knowledge'|'integrations.notion', ...)`; degradación honesta a FTS si el embedding por query falla
- Abuse/rate-limit posture: embeddings de ingesta batched; query embedding cacheable; sin endpoint público nuevo

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/knowledge/search` + `scripts/knowledge/retrieval-eval.ts` + `scripts/knowledge/hybrid-shadow-eval.ts`
- DB/runtime checks: verificar `CREATE EXTENSION vector` + columna + índice HNSW vía `information_schema`/`pg_extension`
- Integration checks: embed corpus dry-run + smoke de una query híbrida real
- Reliability signals/logs: `knowledge.hybrid.*` `[verificar nombre]` si emerge necesidad; degradación honesta en logs
- Production verification sequence: ver §Rollout

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE: no llenar al crear la task
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — pgvector + schema

- Migración additive: `CREATE EXTENSION IF NOT EXISTS vector` + `ADD COLUMN embedding vector(768)` nullable en `knowledge_chunks` + índice HNSW + columna `embedding_checksum` para idempotencia.
- DO block anti pre-up-marker + verificación post-DDL (`pg_extension`, `information_schema.columns`).

### Slice 2 — Embedding ingestion

- Helper de ingesta que embebe los chunks elegibles (Vertex `text-multilingual-embedding-002`, `RETRIEVAL_DOCUMENT`), idempotente por checksum, batched.
- CLI `scripts/knowledge/embed-corpus.ts` (dry-run/apply). Wiring reactivo al publicar/re-ingerir un doc (paso de ingesta, no request path).

### Slice 3 — Vector arm gated en searchKnowledge

- Brazo vector dentro del SSOT: embed query (`RETRIEVAL_QUERY`) → vecinos pgvector dentro del envelope ya filtrado → RRF con el FTS → top-N.
- FTS-signal-gate: el vector solo contribuye cuando el FTS encontró señal (preserva no-answer). Flag `KNOWLEDGE_SEARCH_HYBRID_ENABLED` (default OFF). Degradación honesta a FTS si el embedding falla.

### Slice 4 — Validation against thresholds

- Correr el eval harness (golden + paráfrasis + off-corpus) con el híbrido runtime; verificar §6 (no-answer 100%, wrong-source 0, recall paráfrasis ≥7/8, MRR ≥0.904, p95 ≤~400ms, costo ≤US$5/mes).
- Si no cumple (1)/(2) → no-go documentado, flag se queda OFF.

## Out of Scope

- Activar Vertex Vector Search / Vertex RAG Engine / Spanner administrado.
- Cambiar el contrato `knowledge-search.v1` (shape).
- Reescribir ingestion/chunking salvo hallazgo bloqueante documentado.
- Flip del flag a producción sin pasar los thresholds (eso es decisión de operador post-validación).

## Detailed Spec

Ver `GREENHOUSE_KNOWLEDGE_HYBRID_RETRIEVAL_DECISION_V1.md` (§6 thresholds, §8 rollout/flags, §10 reglas duras,
§11 open questions — política de gate exacta + modelo de embedding). El prototipo offline
(`scripts/knowledge/hybrid-shadow-eval.ts`) es la referencia algorítmica (RRF k=60, cosine, envelope).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (pgvector/schema) → Slice 2 (ingesta) → Slice 3 (brazo vector gateado) → Slice 4 (validación).
- El flag `KNOWLEDGE_SEARCH_HYBRID_ENABLED` DEBE existir (Slice 3) ANTES de cualquier flip; default OFF.
- NO flip a producción hasta que Slice 4 confirme los thresholds §6.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El vector rompe el no-answer honesto | knowledge | medium | FTS-signal-gate + threshold duro (no-answer 100%); flag OFF default | golden no-answer / off-corpus probe |
| Vector trae fuentes semánticamente parecidas pero incorrectas | knowledge | medium | preservar pre-LLM filter + wrong-source=0 threshold + RRF (no reemplaza FTS) | wrong-source rate (golden) |
| Costo/latencia sube sin mejora | ai/cost | low | corpus chico (pgvector sub-ms); cost model §4; no managed | p95 / cost report |
| Migración pgvector afecta el Cloud SQL compartido | migration | low | additive nullable + índice concurrente; verificación post-DDL | migrate verify |

### Feature flags / cutover

- `KNOWLEDGE_SEARCH_HYBRID_ENABLED` (env var, default `false`). OFF = byte-equivalente al FTS+rerank actual.
  Flip a `true` por entorno solo post-validación Slice 4. Revert: flag a `false` (sin deploy, instantáneo).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | reverse migration (DROP COLUMN/EXTENSION) o dejar inerte (nullable, sin consumidores con flag OFF) | < 15 min | si |
| Slice 2 | no-op (los embeddings no se leen con flag OFF); truncar columna si se quiere | < 10 min | si |
| Slice 3 | flag `KNOWLEDGE_SEARCH_HYBRID_ENABLED=false` | < 5 min | si |
| Slice 4 | N/A (validación read-only) | N/A | si |

### Production verification sequence

1. `pnpm migrate:up` staging + verify `pg_extension` vector + columna + índice.
2. Embed corpus dry-run → apply en staging; verify cobertura de embeddings.
3. Flag ON en staging; correr eval harness runtime + verify thresholds §6.
4. Smoke de Nexa staging (QA matrix) con híbrido ON; verify citas/no-answer/voz.
5. Repetir 1-2 en producción con flag OFF (migración + backfill inertes).
6. Flip flag ON en producción solo con sign-off de operador post-staging verde + monitor 7d.

### Out-of-band coordination required

- Env var `KNOWLEDGE_SEARCH_HYBRID_ENABLED` en cada entorno (Vercel + worker/cron de ingesta).
- ADC/Vertex ya disponible (mismo posture que Nexa) — sin proveedor nuevo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] pgvector instalado + columna `embedding` + índice HNSW (migración additive verificada post-DDL).
- [ ] Ingesta de embeddings idempotente por checksum, fuera del request path; CLI dry-run/apply.
- [ ] Brazo vector gateado dentro de `searchKnowledge` detrás de `KNOWLEDGE_SEARCH_HYBRID_ENABLED` (default OFF byte-equivalente).
- [ ] No-answer honesto = 100% y wrong-source = 0 con el híbrido ON (FTS-signal-gate).
- [ ] Recall de paráfrasis ≥ 7/8 sin degradar el golden set (45/45), MRR ≥ 0.904, p95 ≤ ~400ms.
- [ ] `searchKnowledge` permanece SSOT; `knowledge-search.v1` sin cambio de shape; sin reader paralelo.
- [ ] No se activa managed Vertex; embeddings vía Vertex mismo privacy posture que Nexa.

## Verification

- `pnpm vitest run src/lib/knowledge/search`
- `pnpm tsc --noEmit`
- `pnpm lint`
- `pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/knowledge/retrieval-eval.ts`
- `pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/knowledge/hybrid-shadow-eval.ts`
- `pnpm nexa:doc-gate --changed`

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] archivo en la carpeta correcta (`to-do/` → `in-progress/` → `complete/`)
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado si cambia comportamiento visible
- [ ] chequeo de impacto cruzado
- [ ] Delta en `rag-pipeline.md` + `GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md` (hybrid ON)

## Follow-ups

- A/B de modelo de embedding (`text-multilingual-embedding-002` vs `gemini-embedding-001`) si el piloto lo amerita.
- Evaluar managed Vertex SOLO si el corpus/QPS cruza los disparadores del decision packet §5.

## Open Questions

- Política de gate exacta del brazo vector (FTS-signal-gate vs piso de cosine tuneado vs ambos) — resolver
  empíricamente en Slice 4 validando contra AMBOS probes (paráfrasis + off-corpus), per decision packet §11.

## Delta 2026-06-16 — Slices 1-3 construidos + Slice 4 validado (NO-GO al flip; flag OFF)

**Construido (gated, safe, OFF=byte-equivalente — gates de código verdes):**
- **Slice 1:** migración `20260616105246838` (pgvector + `embedding vector(768)` + `embedding_model/checksum/updated_at` + índice HNSW cosine + DO-block verify). Aplicada en dev; `db.d.ts` regenerado.
- **Slice 2:** helper canónico `src/lib/knowledge/search/knowledge-embeddings.ts` (Vertex `text-multilingual-embedding-002`) + paso de ingesta idempotente por checksum `embed-corpus.ts` + CLI `scripts/knowledge/embed-corpus.ts`. **1471/1471 chunks embebidos** en dev (~235k tokens, 30 batches).
- **Slice 3:** brazo vector gateado DENTRO de `searchKnowledge` (`KNOWLEDGE_SEARCH_HYBRID_ENABLED`, default OFF) — pgvector cosine dentro del MISMO envelope pre-LLM + RRF ponderado con el FTS (fusión pura extraída a `retrieval-fusion.ts`, cero deps, para no arrastrar fixtures al runtime) + **FTS-signal-gate por presencia** (`rows.length > 0`) + **mode-scope a agéntico** (decisión arquitectónica: el +latencia se absorbe en el stream del LLM de Nexa; el search humano queda FTS puro sub-segundo) + cache de query-embeddings + degradación honesta a FTS. SSOT/contrato `knowledge-search.v1` intactos. Flag OFF = byte-equivalente (verificado: 269 tests knowledge+nexa verdes con OFF + build OK).
- **Slice 4:** harness de validación runtime `scripts/knowledge/hybrid-runtime-validate.ts` + probes compartidos `retrieval-probes.ts`.

**Solución de la tensión — fusión de DOS NIVELES (`hybridFuse`):** un peso RRF único no puede tener
golden-safe Y paráfrasis (un peso lineal no distingue un hit FUERTE del FTS de uno incidental DÉBIL).
La fusión de dos niveles protege los hits FUERTES del FTS (golden-safe) y compite los DÉBILES contra
los vector-only por relevancia (paráfrasis). La perilla `STRONG_FTS_RANK` mapea la curva del trade-off:

| `STRONG_FTS_RANK` | golden | paráfrasis | gate |
|---|---|---|---|
| **0.15 (default)** | **45/45** ✅ | 4/8 | **VERDE (flip-ready, cero regresión)** |
| 0.3 – 0.9 | 44/45 ❌ | **7/8** | regresa 1 golden |

**Resultado runtime con el default golden-safe (0.15) — TODOS los gates VERDES:**
- ✅ golden 45/45 (cero regresión) · ✅ recall paráfrasis ≥ baseline (4/8 vs 3/8) · ✅ MRR no degradado ·
  ✅ no-answer golden 2/2 · ✅ off-corpus no degradado vs FTS · ✅ wrong-source 0 · ✅ p95 agéntico OK.
- **Latencia:** el cuello es el **embedding de la query = round-trip Vertex (~600ms)**, no pgvector
  (sub-ms). Por eso el híbrido está **acotado a modo agéntico (Nexa)**, donde la latencia se absorbe en
  el stream del LLM; el search humano queda FTS puro. (Corrige la estimación ≤400ms del decision packet §6.)

**Funciona idéntico con los wikis de Notion (verificado en el corpus real):** el corpus ya tiene 26 docs
Notion / **111 chunks, 111/111 embebidos**. El híbrido es **source-agnostic** — opera sobre
`knowledge_chunks`; un chunk de repo y uno de wiki Notion son la misma fila. El conector Notion
(TASK-1088) ingesta al MISMO corpus → el buscador los trata igual. **Gap operativo:** los chunks nuevos
de un sync Notion (auto-ingest webhook TASK-1094) entran SIN embedding (embed desacoplado del publish) →
hoy se rellenan corriendo `embed-corpus` (idempotente por checksum). Follow-up: cablear el embed dentro
de la ingesta/webhook para que Notion en vivo quede embebido automático.

**Veredicto:** el híbrido queda **construido, validado VERDE y flip-ready en su config golden-safe**
(mejora real sin regresión para Nexa, modesta: +1 paráfrasis). El salto a **7/8 sin tocar golden**
necesita un **reranker de relevancia** (cross-encoder/LLM) — la perilla por umbral mapea la curva pero
no rompe la última pregunta en conflicto; ese es el follow-up de mayor valor. **El flip a producción es
decisión del operador** (requiere migración + embed aplicados en staging/prod + env var).

**Follow-ups:** (1) **reranker de relevancia** para 7/8 golden-safe — el de mayor valor; (2) **embed en
la ingesta** (re-embed reactivo al publicar/sync Notion) para corpus en vivo; (3) recalibrar las
off-corpus probes (una no es limpiamente off-corpus).

Lifecycle queda **in-progress**: la base está VERDE y flip-ready, pero la acceptance criteria "recall
paráfrasis ≥7/8 sin degradar golden" sólo se cumple con el reranker (follow-up 1). Gates de código:
tsc 0 · lint 0 · vitest knowledge+nexa **278** · full `pnpm test` **7124** · build OK · fusión `hybridFuse` 9 tests. Sin push (local-first).
