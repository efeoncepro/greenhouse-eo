# TASK-1155 — Knowledge reactive embedding on ingestion (corpus en vivo, incl. Notion)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `sync`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `knowledge|nexa|ai|data`
- Blocked by: `none` (TASK-1151 construyó el substrato + el embed step)
- Branch: `task/TASK-1155-knowledge-reactive-embedding-ingestion`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Hacer que el embedding del corpus de Knowledge se rellene **automáticamente al publicar/sincronizar**
un documento (repo docs y, en especial, **wikis Notion** que auto-ingestan por webhook, TASK-1094), en
vez de depender de correr la CLI manual `embed-corpus`. Cierra el único gap operativo del híbrido
(TASK-1151) para corpus en vivo: hoy los chunks nuevos de un sync entran SIN embedding hasta que alguien
corre el paso manual.

## Why This Task Exists

TASK-1151 desacopló (a propósito) la generación de embeddings del publish, para no meter llamadas a Vertex
en el camino crítico. El embedding se rellena con `embed-corpus` (idempotente por checksum). Eso está bien
para un backfill, pero deja un gap para **corpus en vivo**: cuando un wiki Notion se edita y el auto-ingest
(TASK-1094) republica sus chunks, esos chunks quedan sin `embedding` hasta el próximo run manual → si el
flag híbrido está ON, el brazo vector no los ve (degrada honesto a FTS, pero pierde el recall nuevo para ese
doc). El fix: re-embeber reactivo, fuera del request path.

## Goal

- Los chunks nuevos/cambiados de un documento publicado quedan embebidos automáticamente (sin correr CLI).
- Funciona igual para repo docs y wikis Notion (auto-ingest webhook).
- Sigue fuera del request path (paso de ingesta / reactivo), idempotente por checksum, degradación honesta.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_KNOWLEDGE_HYBRID_RETRIEVAL_DECISION_V1.md` (§8 rollout, embeddings = ingesta)
- `docs/architecture/GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/nexa-intelligence/technical/rag-pipeline.md`

Reglas obligatorias:

- Embeddings NUNCA en el request path; es paso de ingesta / reactivo.
- Idempotente por checksum (no re-embeber lo que no cambió).
- Degradación honesta: si Vertex falla, el publish NO falla (el embedding se reintenta luego); el híbrido cae a FTS.
- Vertex `text-multilingual-embedding-002` (mismo privacy posture que Nexa). No otro proveedor.
- NO bloquear el webhook de auto-ingest (Notion timeout corto) con llamadas a Vertex inline.

## Normative Docs

- `docs/tasks/in-progress/TASK-1151-knowledge-hybrid-pgvector-gated-implementation.md` (substrato + `embed-corpus`)
- `docs/tasks/complete/TASK-1094-notion-knowledge-webhook-auto-ingest.md` (auto-ingest reactivo)
- `docs/tasks/complete/TASK-1082-notion-knowledge-ingestion-mvp.md` (`ingestOne` / pipeline)

## Dependencies & Impact

### Depends on

- `TASK-1151` — columna `embedding`, helper `knowledge-embeddings.ts`, `embed-corpus.ts`.
- `src/lib/knowledge/ingestion/pipeline.ts` (`ingestOne` / `runKnowledgeIngestion`).
- `src/lib/sync/projections/*` (patrón reactivo si se hace por outbox).

### Blocks / Impacts

- Mantiene fresco el corpus embebido del híbrido (TASK-1151) para Notion en vivo.

### Files owned

- `src/lib/knowledge/ingestion/pipeline.ts` (hook de embed post-publish, o emisión de evento)
- `src/lib/knowledge/search/embed-corpus.ts` (reuso del helper por-doc)
- `src/lib/sync/projections/knowledge-embed-on-publish.ts` `[verificar]` (si reactivo por outbox)

## Current Repo State

### Already exists

- Substrato vector + `embedding`/`embedding_checksum` (TASK-1151).
- `embedKnowledgeCorpus` (idempotente por checksum) + CLI `embed-corpus`.
- Pipeline `ingestOne` + auto-ingest por webhook (TASK-1094).

### Gap

- El embed solo corre manual (CLI). No hay re-embed automático al publicar/sincronizar.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `sync`
- Source of truth afectado: `greenhouse_knowledge.knowledge_chunks.embedding`
- Consumidores afectados: el brazo vector de `searchKnowledge` (TASK-1151)
- Runtime target: `worker/cron` (ingesta) — NUNCA request path

### Contract surface

- Contrato existente a respetar: `embedKnowledgeCorpus` / `knowledge-embeddings.ts` (no cambiar shape)
- Contrato nuevo o modificado: hook/consumer reactivo de embed post-publish
- Backward compatibility: `compatible` (additive; sin re-embed automático el sistema ya funciona vía CLI)
- Full API parity: el embed es un paso de ingesta, no una superficie de usuario

### Data model and invariants

- Entidades afectadas: `knowledge_chunks` (UPDATE de `embedding`/`embedding_model`/`embedding_checksum`)
- Invariantes: idempotente por checksum; NUNCA en request path; el publish NO falla si Vertex falla
- Tenant/space boundary: corpus interno (sin tenant scope)
- Idempotency/concurrency: checksum por chunk; re-correr es no-op para lo ya embebido
- Audit/outbox/history: reusar `knowledge_publication_runs` o un evento `knowledge.embed.*` si reactivo

### Migration, backfill and rollout

- Migration posture: `none` (la columna ya existe por TASK-1151)
- Default state: el embed reactivo puede nacer detrás de flag si se prefiere gradual
- Backfill plan: `embed-corpus --apply` cubre el histórico (ya corrido en dev)
- Rollback path: desactivar el hook/consumer (vuelve al embed manual)
- External coordination: ADC/Vertex (ya disponible)

### Security and access

- Auth/access gate: paso de ingesta (sin superficie nueva)
- Sensitive data posture: corpus interno; embeddings Vertex mismo posture que Nexa
- Error contract: `captureWithDomain(err, 'knowledge', ...)`; el fallo de embed NO rompe el publish
- Abuse/rate-limit posture: batch + idempotente; respetar rate limit Vertex

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/knowledge`
- DB/runtime checks: publicar/editar un doc → verificar que sus chunks quedan con `embedding` poblado
- Integration checks: editar un wiki Notion (auto-ingest) → verificar embed automático
- Reliability signals/logs: signal opcional `knowledge.embedding.stale_chunks` (chunks vigentes sin embedding)
- Production verification sequence: dev → staging; verificar embed automático tras un sync Notion

<!-- ZONE 2 — PLAN MODE: no llenar al crear la task -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Embed reactivo post-publish

- Hook en `ingestOne` (o consumer reactivo por outbox) que, tras publicar una versión, encola/embebe los
  chunks nuevos de ese doc (reusando el helper por-doc de `knowledge-embeddings`/`embedKnowledgeCorpus`).
- Idempotente por checksum; fuera del request path; el publish NO falla si Vertex falla.

### Slice 2 — Señal de chunks sin embedding (opcional)

- Reliability signal `knowledge.embedding.stale_chunks` (chunks de versión vigente sin `embedding`) para
  detectar drift si el embed reactivo falla. Steady=0.

## Out of Scope

- Cambiar el algoritmo del híbrido o la fusión (eso es TASK-1151 / el reranker follow-up).
- Activar el flag híbrido en producción (decisión del operador).
- Reescribir el pipeline de ingesta.

## Detailed Spec

Reusar `embedKnowledgeCorpus` (idempotente por checksum) acotado al doc recién publicado, o extraer un
`embedKnowledgeDocument(documentId)` del helper existente. El disparo puede ser inline-async no-bloqueante
al final de `ingestOne` o un consumer reactivo del outbox (preferido si ya hay evento de publish). Patrón
fuente: TASK-771 (proyección reactiva) + TASK-1151 (`embed-corpus`).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (embed reactivo) → Slice 2 (señal opcional). Slice 2 puede ir en paralelo.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Vertex falla y bloquea el publish | knowledge | low | embed fuera del commit del publish + degradación honesta | logs / captureWithDomain |
| Webhook Notion timeout por embed inline | integrations.notion | medium | embed async/reactivo, NUNCA inline en el handler | webhook latency |
| Chunks vigentes quedan sin embedding | knowledge | low | señal `stale_chunks` + `embed-corpus` idempotente de respaldo | knowledge.embedding.stale_chunks |

### Feature flags / cutover

- Opcional: flag para el embed reactivo (gradual). Sin flag = additive, el CLI sigue como respaldo.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | desactivar el hook/consumer (vuelve a embed manual) | < 10 min | si |
| Slice 2 | quitar la señal | < 10 min | si |

### Production verification sequence

1. Dev: editar un doc → verificar que sus chunks quedan embebidos automáticamente.
2. Dev: editar un wiki Notion (auto-ingest) → verificar embed automático.
3. Staging: repetir tras un sync Notion real.

### Out-of-band coordination required

N/A — repo + ADC/Vertex ya disponibles.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Al publicar/sincronizar un doc, sus chunks nuevos/cambiados quedan embebidos automáticamente.
- [ ] Funciona igual para repo docs y wikis Notion (auto-ingest webhook).
- [ ] Embed fuera del request path; el publish/webhook NO falla si Vertex falla.
- [ ] Idempotente por checksum (no re-embebe lo que no cambió).
- [ ] (Opcional) señal `knowledge.embedding.stale_chunks` en steady=0.

## Verification

- `pnpm vitest run src/lib/knowledge`
- `pnpm tsc --noEmit`
- `pnpm lint`
- `pnpm nexa:doc-gate --changed`

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` → `complete`)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado si cambia comportamiento visible
- [ ] chequeo de impacto cruzado
- [ ] Delta en `rag-pipeline.md` (embed reactivo) + cerrar el gap anotado en TASK-1151

## Follow-ups

- Reranker de relevancia (el OTRO follow-up de TASK-1151, para 7/8 golden-safe) — task separada.

## Open Questions

- ¿Inline-async al final de `ingestOne` vs consumer reactivo por outbox? Resolver en Discovery según si ya
  existe un evento de publish reutilizable.
