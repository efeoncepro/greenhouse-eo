# TASK-1094 — Notion Knowledge Webhook Auto-Ingest + Freshness

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Alto`
- Type: `implementation`
- Epic: `none`
- Status real: `En implementacion (develop, sin branch — override operador)`
- Rank: `TBD`
- Domain: `platform|content|integrations.notion|knowledge`
- Blocked by: `TASK-1088 (complete)`
- Branch: `develop (override operador — sin branch)`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Mantener el corpus de conocimiento (`greenhouse_knowledge`) **al día automáticamente** cuando alguien publica/edita/borra un artículo en las Wikis Notion declaradas, vía **webhook** (no cron). Cierra el gap operativo que TASK-1088 dejó: hoy la ingesta es manual (re-correr el comando). El webhook detecta el cambio y dispara la re-ingesta **de ese artículo**; el borrado en Notion deprecia el doc en la base.

## Why This Task Exists

TASK-1088 construyó el **conector** (lee páginas + Wikis Notion → markdown → pipeline) y se verificó en vivo (Buyer Personas: 21 docs). Pero la ingesta es **manual**: agregar un artículo en Notion no se refleja en Nexa hasta re-correr `ingest --source=notion --apply`. Además, **los borrados no se propagan** (el doc viejo queda publicado). Esta task automatiza la frescura por webhook + cierra el gap de borrados, reusando el patrón canónico de webhooks Notion ya en producción (TASK-912) + outbox→consumer reactivo (TASK-771/773).

Decisión del operador (2026-06-12): **webhook-first, sin cron** (experiencia previa: crons no rinden para estos casos). El at-most-once de los webhooks Notion se cubre con una **señal de drift** + **reconcile on-demand**, no con un job programado.

## Goal

- Webhook `notion-knowledge` que, ante `page.created/content_updated/properties_updated/deleted` + `data_source.content_updated` de una Wiki/página **declarada**, dispara re-ingesta dirigida.
- Borrado en Notion (`page.deleted`) → deprecar el doc en `greenhouse_knowledge` (cierra el gap).
- Frescura observable sin cron: señal de drift + comando de reconcile on-demand.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md` (ingesta + boundary Notion).
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` (bus inbound + HMAC + endpoint registry).
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` (outbox → consumer reactivo + recovery).
- CLAUDE.md: "Knowledge ingestion invariants (TASK-1082)" + "Notion Integrations Registry" + patrón webhook Notion (TASK-912).
- skill `notion-platform` (webhooks-canonical: event types, at-most-once, HMAC, re-fetch pattern) + skill `arch-architect` (4-pillar).

Reglas obligatorias (5-pillar Notion + invariantes Greenhouse):

- **NUNCA** confiar el payload del webhook — siempre **re-fetch** la página (source of truth).
- **NUNCA** re-ingerir una página fuera del corpus declarado (gate de gobernanza: el parent `data_source` debe matchear un `notionDataSourceId` declarado, o el page id un `notionPageId` declarado).
- **NUNCA** hacer la ingesta inline en el webhook handler — emitir outbox + responder 200 (timeout corto de Notion; la ingesta es lenta).
- **NUNCA** reusar el secret HMAC ni el token de otra integración (delivery/TASK-912, demo). Secret de webhook **propio** de knowledge + el token scoped `notion-integration-token-greenhouse-knowledge` (TASK-1088).
- **NUNCA** `Sentry.captureException` directo — `captureWithDomain(err, 'knowledge', ...)`.
- Kill-switch flag `NOTION_KNOWLEDGE_WEBHOOK_ENABLED` default OFF; verification handshake ACK siempre (pre-flag, pre-HMAC).
- Sin echo-loop concern: knowledge **NO** escribe a Notion (solo lee).

## Normative Docs

- `docs/tasks/in-progress/TASK-1088-notion-knowledge-connector.md` (conector + pipeline que esta task reusa).
- `docs/tasks/complete/TASK-1082-notion-knowledge-ingestion-mvp.md` (pipeline sanitize/quarantine/chunk).
- `docs/tasks/complete/TASK-912-...` (patrón webhook Notion productivo a espejar).

## Dependencies & Impact

### Depends on

- **TASK-1088** — el conector (`NotionKnowledgeConnector`, modos page + data_source), el client (`fetchBlockTree`/`fetchPageProvenance`/`queryDataSourcePages`), el corpus declarado, el pipeline de ingesta. Esta task **reusa** todo eso; el re-ingest por artículo ya funciona (un `load()` por page id).
- Bus de webhooks (`processInboundWebhook` + `webhook_endpoints` + `/api/webhooks/[endpointKey]`).
- Outbox + reactive consumer (`publishOutboxEvent` + `registerProjection`).
- Secret HMAC nuevo del webhook de knowledge (operator-provisioned) + config de la suscripción en la integración "Greenhouse KNOW" (operator-side en Notion).

### Blocks / Impacts

- Frescura del corpus que consumen TASK-1083 (search) / TASK-1085 (Nexa retrieval) / TASK-1086 (MCP).

### Files owned

- `src/lib/webhooks/handlers/notion-knowledge.ts`
- `src/lib/sync/projections/knowledge-notion-ingest.ts`
- `src/lib/knowledge/notion/reconcile.ts` (reconcile on-demand + deprecación)
- `src/lib/reliability/queries/knowledge-notion-freshness.ts`
- `scripts/knowledge/reconcile.ts` (CLI reconcile)

## Current Repo State

### Already exists

- Conector Notion completo + pipeline idempotente por checksum (TASK-1088/1082).
- Bus de webhooks genérico + HMAC + verification handshake + endpoint registry (TASK-706/912).
- Outbox + reactive consumer framework (TASK-771/773).
- El store puede transicionar `publication_status` (incl. `deprecated`) — base para la deprecación en delete.

### Gap

- No hay suscripción de webhook para la integración de knowledge ni handler `notion-knowledge`.
- No hay consumer que re-ingiera por artículo desde un evento.
- No hay path de **deprecación por borrado** (page.deleted → doc deprecated).
- No hay señal de frescura/drift del corpus knowledge ni reconcile on-demand.

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Webhook handler + endpoint + secret

- `src/lib/webhooks/handlers/notion-knowledge.ts`: verification handshake (ACK siempre) + kill-switch `NOTION_KNOWLEDGE_WEBHOOK_ENABLED` + HMAC-SHA256 (secret propio) + emite outbox `knowledge.notion.page_change_signal` (page id + tipo de evento). Espeja `notion-status-transitions.ts`.
- Registrar `endpoint_key='notion-knowledge'` en `greenhouse_sync.webhook_endpoints`.
- Secret HMAC `notion-knowledge-webhook-signing-secret` (GCP) + `NOTION_KNOWLEDGE_WEBHOOK_SIGNING_SECRET_REF`.

### Slice 2 — Consumer reactivo (re-ingest dirigido + deprecación)

- `knowledge-notion-ingest` projection (trigger `knowledge.notion.page_change_signal`): re-fetch página → **gate de gobernanza** (parent data_source ∈ corpus declarado, o page id declarado) → si aplica, re-ingiere ESE artículo vía el pipeline existente (idempotente); si el evento es `page.deleted`/`in_trash` → deprecar el doc (`publication_status='deprecated'`).
- maxRetries + dead-letter.

### Slice 3 — Reconcile on-demand + deprecación masiva de huérfanos

- `src/lib/knowledge/notion/reconcile.ts` + `scripts/knowledge/reconcile.ts`: compara las filas vivas de cada Wiki declarada (`queryDataSourcePages`) vs los docs ingeridos → re-ingiere faltantes + deprecia huérfanos (borrados que el webhook pudo perder por at-most-once). Dry-run/apply. **Reemplaza la red de seguridad del cron** (operador lo corre cuando la señal de drift alerta).

### Slice 4 — Señal de frescura + docs

- `knowledge.notion.freshness_drift` (reliability, moduleKey `knowledge`): cuenta Wikis declaradas con divergencia (docs ingeridos != filas vivas en Notion) o `last_synced` viejo. Steady=0. **Detección sin cron.**
- Triple doc (arquitectura Delta + funcional + runbook config webhook Notion) + invariante CLAUDE.md.

## Out of Scope

- Tiempo real sub-segundo (el webhook ya da segundos, suficiente). Embeddings/vector. UI del centro de conocimiento (TASK-1084). Cambios al sanitizer/chunker (TASK-1082). **Cron programado** (decisión operador: no).

## Detailed Spec

El webhook es un **trigger ligero**; el consumer hace el trabajo (re-fetch + gate + re-ingest/deprecate). El pipeline de TASK-1082/1088 no cambia — esta task lo **dispara**, no lo modifica. La red de seguridad del at-most-once es **señal de drift (visible) + reconcile on-demand**, no un cron.

<!-- Rollout Plan & Risk Matrix -->

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

1 → 2 → 3 → 4. El handler (1) puede mergear con flag OFF (cero efecto). El consumer (2) requiere el evento del handler. El reconcile (3) y la señal (4) son la red de seguridad — antes de declarar "automático confiable".

### Risk matrix

| Riesgo | Sistema | Prob | Mitigación | Señal |
|---|---|---|---|---|
| Webhook perdido (at-most-once) | Frescura | Media | Reconcile on-demand + señal de drift | `knowledge.notion.freshness_drift` |
| Re-ingest de página fuera del corpus | Gobernanza | Baja | Gate parent data_source ∈ corpus declarado | drift |
| Ingesta lenta bloquea el webhook | Notion timeout | Media | Outbox decouple (handler responde 200 al toque) | dead_letter |
| Borrado no propagado | Frescura | Media | page.deleted → deprecate + reconcile de huérfanos | drift |
| Secret/HMAC mal configurado | Seguridad | Baja | HMAC timing-safe + verification handshake + flag OFF default | webhook signature failures |

### Feature flags / cutover

- `NOTION_KNOWLEDGE_WEBHOOK_ENABLED` (default OFF). Activación operador-side tras configurar la suscripción Notion + el secret.

### Rollback plan per slice

| Slice | Rollback | Reversible? |
|---|---|---|
| 1 handler | flag OFF (ACK + drop) | sí, inmediato |
| 2 consumer | desregistrar projection / flag OFF upstream | sí |
| 3 reconcile | comando manual, no corre solo | sí |
| 4 señal | reader read-only | sí |

### Production verification sequence

1. Flag OFF merge → cero efecto. 2. Configurar suscripción Notion + secret. 3. Flag ON en staging → editar un artículo de prueba en una Wiki declarada → verificar re-ingest (nueva versión por checksum). 4. Borrar el artículo de prueba → verificar deprecación. 5. Correr reconcile dry-run → 0 drift. 6. Señal `freshness_drift` = 0.

### Out-of-band coordination required

- Operador configura la suscripción de webhook en la integración "Greenhouse KNOW" (Notion) + provisiona el secret HMAC.

<!-- ZONE 4 — ACCEPTANCE & CLOSURE -->

## Acceptance Criteria

- [ ] Editar un artículo en una Wiki declarada re-ingiere ese artículo (nueva versión por checksum) sin acción manual.
- [ ] Crear un artículo nuevo lo ingiere automáticamente.
- [ ] Borrar un artículo lo deprecia en `greenhouse_knowledge` (deja de ser recuperable por Nexa).
- [ ] Un cambio en una página/Wiki **fuera** del corpus declarado se ignora (gate de gobernanza).
- [ ] El handler responde 200 rápido (no ingiere inline); la ingesta corre async vía outbox/consumer.
- [ ] `reconcile` (dry-run/apply) re-ingiere faltantes + deprecia huérfanos; señal `knowledge.notion.freshness_drift` = 0 en steady.
- [ ] HMAC + verification handshake + kill-switch verificados; secret propio de knowledge.

## Verification

- tests focales handler (HMAC, handshake, flag, governance gate) + consumer (re-fetch, re-ingest, deprecate) + reconcile.
- smoke staging: editar/crear/borrar artículo real en una Wiki declarada con flag ON.
- `pnpm task:lint --task TASK-1094`.

## Closing Protocol

- [ ] `Lifecycle` sincronizado con carpeta.
- [ ] README + TASK_ID_REGISTRY + Handoff + changelog.
- [ ] Triple doc (arquitectura/funcional/runbook) + invariante CLAUDE.md + Notion Integrations Registry (secret del webhook).

## Follow-ups

- Vector/embeddings para retrieval (escalación diferida, TASK-1080).
- Tiempo real sub-segundo si emerge necesidad (hoy el webhook da segundos).
