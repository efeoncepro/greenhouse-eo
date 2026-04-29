# TASK-580 — Reverse Orchestrator: Delivery → Commercial (Notion → HubSpot via Greenhouse) con estrategia híbrida

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-005`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `delivery / commercial / integrations`
- Blocked by: `TASK-577` (Notion Write Bridge), `TASK-578` (Mapping Registry)
- Branch: `task/TASK-580-reverse-orchestrator-hybrid-notion-to-commercial`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

Reemplazar el `reverse sync` del sibling `notion-hubspot-sync` por un sistema híbrido de 3 capas que canonicaliza cambios Notion en `greenhouse_delivery.*`, emite eventos canónicos, y proyecta a HubSpot via el bridge existente cuando la state-machine policy lo autoriza. Las 3 capas son: **(1) Notion webhooks primary** para real-time (0-5s lag), **(2) Reconciliation polling cada 6h** como safety net, **(3) Full-sync admin command** para disaster recovery. Cubre las 4 entidades del scope de EPIC-005: **tasks → deals, projects → business-line context, Notion companies → HubSpot companies, Notion contacts → HubSpot contacts**. Declara nuevos eventos `delivery.*` en el catalog.

## Why This Task Exists

- El sibling hoy polla cada 15 min, lag inaceptable + watermark drift + eventos perdidos en ventanas concurrentes.
- EPIC-005 resolvió "real-time híbrido" como estrategia canónica. Este task ejecuta esa estrategia.
- Greenhouse ya tiene canonical delivery state (`greenhouse_delivery.projects/tasks/sprints`) alimentado via `notion-bigquery` daily ingestion — podemos reusarlo pero con mayor frecuencia + write-back al canonical.
- Conflict resolution requiere que el canonical tenga source of truth del lado delivery. Sin canonicalization real-time, la policy state-machine no tiene datos para decidir.

## Goal

- Webhook endpoint en el bridge que recibe Notion webhook events + valida signature.
- Reconciliation polling worker en `ops-worker` cada 6h que rellena gaps.
- Full-sync admin command via `POST /notion/full-sync` + admin UI opcional.
- Canonicalization a `greenhouse_delivery.*` con watermark en Postgres (`greenhouse_delivery.sync_watermarks`).
- Nuevos eventos declarados: `delivery.task.created/updated/deleted`, `delivery.project.created/updated`, `delivery.company.created/updated`, `delivery.contact.created/updated`.
- Reactive worker suscrito a esos eventos + proyecta a HubSpot (via bridge existente) cuando `shouldWriteField` dice OK.
- Si Notion Companies/Contacts DBs no existen → slice "Notion schema bootstrap" las crea via write bridge.
- Tests + staging validation.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (agregar eventos `delivery.*`)
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` (patrón webhook receiver)
- `docs/epics/to-do/EPIC-005-greenhouse-commercial-delivery-orchestrator.md`

Reglas obligatorias:

- **Signature validation obligatoria** en el webhook endpoint Notion (HMAC — verificar spec actual de Notion).
- **Idempotency**: Notion webhooks pueden llegar 2 veces. Dedupe via `(notion_page_id, notion_last_edited_time)` canonical.
- **Watermark en Postgres**, no BigQuery. Consistente con el resto del canonical.
- **Graceful degradation per-DB**: si webhooks no disponibles para una DB, polling-only para esa, el resto sigue híbrido.
- **Conflict resolution state-machine**: proyección a HubSpot respeta `deal_stage_field_lock_config` direction `from_notion`.

## Normative Docs

- `docs/epics/to-do/EPIC-005-greenhouse-commercial-delivery-orchestrator.md`
- `docs/tasks/to-do/TASK-577-notion-write-bridge.md`
- `docs/tasks/to-do/TASK-578-canonical-mapping-registry-notion.md`
- `/tmp/hbi-sibling/cesargrowth11/notion-hubspot-sync/main.py` (referencia del sibling — NO copiar polling hardcoded)
- Notion API webhooks docs: https://developers.notion.com/reference/webhooks (verificar disponibilidad)

## Dependencies & Impact

### Depends on

- `TASK-577` cerrada (bridge con endpoints Notion read + write + signature validation pattern).
- `TASK-578` cerrada (mapping registry + field lock config + identity extension).
- `services/ops-worker/` live (TASK-574 o pre-existente).
- Notion integration dedicada con webhook subscription permissions (evaluar si requiere scope adicional).

### Blocks / Impacts

- Bloquea TASK-581 (cutover requiere reverse orchestrator funcional).
- NO bloquea TASK-582 (admin surface puede correr en paralelo — no consume delivery.* events).
- Elimina dependencia del reverse sync del sibling (`main.py` top-level).

### Files owned

- Migration: `migrations/<timestamp>_task-580-delivery-sync-canonical.sql` (watermarks table + páginas link tables delivery-side + eventos delivery.*)
- `services/hubspot_greenhouse_integration/webhooks.py` (agregar handler Notion webhook)
- `services/hubspot_greenhouse_integration/app.py` (agregar ruta `POST /webhooks/notion`)
- `services/ops-worker/notion-reconciliation-poller.ts` (polling 6h)
- `services/ops-worker/delivery-to-commercial-reverse-projector.ts` (reactive worker para delivery.* events → HubSpot)
- `services/ops-worker/canonicalizers/notion-task-canonicalizer.ts`
- `services/ops-worker/canonicalizers/notion-project-canonicalizer.ts`
- `services/ops-worker/canonicalizers/notion-company-canonicalizer.ts`
- `services/ops-worker/canonicalizers/notion-contact-canonicalizer.ts`
- `src/lib/sync/event-catalog.ts` (declarar eventos `delivery.*`)
- `src/lib/delivery/delivery-events.ts` (publishers)
- `src/lib/delivery/sync-watermarks-store.ts`
- Tests correspondientes.

## Current Repo State

### Already exists

- `greenhouse_delivery.projects`, `tasks`, `sprints` alimentados por `notion-bigquery` daily ingestion (read-only).
- Event catalog (`src/lib/sync/event-catalog.ts`) con patrón `EVENT_TYPES.*` + `AGGREGATE_TYPES.*`.
- Webhook handler pattern en `services/hubspot_greenhouse_integration/webhooks.py` (signature validation HubSpot).
- `ops-worker` con crons reactivos.
- `HUBSPOT_APP_CLIENT_SECRET` pattern — agregar equivalente `NOTION_WEBHOOK_SIGNING_SECRET` si Notion lo usa.

### Gap

- Cero webhook endpoint Notion en el bridge.
- Cero polling worker Notion en ops-worker (el sibling tiene su propio, pero afuera del monorepo).
- Cero canonicalizers Notion → canonical en ops-worker.
- Eventos `delivery.*` NO declarados en catalog.
- `greenhouse_delivery.sync_watermarks` NO existe.
- No hay reverse projector que consuma delivery.* eventos + escriba a HubSpot.

## Scope

### Slice 1 — Discovery: Notion webhooks availability per-DB

- Consultar Notion API docs (link arriba) para disponibilidad actual de webhooks.
- Verificar: ¿webhooks soporta todas las DBs (Tareas, Proyectos, Companies si existe, Contacts si existe)?
- Si webhooks disponibles: TASK-580 va con estrategia híbrida completa.
- Si webhooks NO disponibles para alguna DB: esa DB cae a polling-only; resto sigue híbrido.
- Documentar decisión per-DB en el PR.
- Si webhooks disponibles → obtener/configurar `NOTION_WEBHOOK_SIGNING_SECRET` + grant permisos a la integration.

### Slice 2 — Migration: eventos, watermarks, page link tables

- Declarar en `EVENT_TYPES`:
  - `delivery.task.created`, `delivery.task.updated`, `delivery.task.deleted`
  - `delivery.project.created`, `delivery.project.updated`
  - `delivery.company.created`, `delivery.company.updated` (si bootstrap de Companies DB ejecuta)
  - `delivery.contact.created`, `delivery.contact.updated` (idem)
- Declarar en `AGGREGATE_TYPES`:
  - `deliveryTask`, `deliveryProject`, `deliveryCompany`, `deliveryContact`
- Tabla `greenhouse_delivery.sync_watermarks`:

```sql
CREATE TABLE greenhouse_delivery.sync_watermarks (
  source_system text NOT NULL,
  stream text NOT NULL,
  last_processed_at timestamptz NOT NULL,
  last_page_id text,
  failure_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (source_system, stream)
);
```

- Tablas de page link:
  - `greenhouse_delivery.task_notion_page_links (task_id, notion_page_id, ...)`
  - `greenhouse_delivery.project_notion_page_links (project_id, notion_page_id, ...)`

### Slice 3 — Notion schema bootstrap (si DBs Companies/Contacts no existen)

- Si Discovery concluye que Companies/Contacts no existen en workspace: crear via write bridge (endpoints admin-only).
- Schema propuesto:
  - Companies DB: name, domain, industry, lifecycle_stage, hubspot_company_id, linea_de_servicio (multi-select), servicios_especificos (multi-select)
  - Contacts DB: name, email, role, hubspot_contact_id, company_relation, identity_profile_id
- Documentar los DB IDs creados + guardar en env vars + en `config.py` del bridge.
- Este slice puede NO ejecutarse si el scope de V1 decide diferirlo — en ese caso, TASK-579 proyección de companies/contacts queda en no-op graceful.

### Slice 4 — Webhook endpoint `POST /webhooks/notion`

- En `services/hubspot_greenhouse_integration/app.py` + `webhooks.py`.
- Validación de firma HMAC según spec Notion + env var `NOTION_WEBHOOK_SIGNING_SECRET`.
- Parse del event payload → extract `page_id`, `database_id`, `last_edited_time`, event type (`page.content_updated`, etc.).
- Persist el event en `greenhouse_sync.notion_webhook_events` (tabla nueva — buffer) para reprocesamiento eventual.
- Emit event `delivery.<type>.webhook_received` via outbox → reactive worker canonicaliza async.
- Response 200 inmediato (webhook ack) — no bloquear el bridge con canonicalization sync.

### Slice 5 — Canonicalizers Notion → canonical

4 canonicalizers (uno por entidad), todos en `services/ops-worker/canonicalizers/`:

- `notion-task-canonicalizer.ts`: lee page from Notion API via bridge read endpoint → upsert en `greenhouse_delivery.tasks` → emit `delivery.task.created/updated` → persist page link.
- `notion-project-canonicalizer.ts`: idem para projects.
- `notion-company-canonicalizer.ts`: idem para companies (si DB existe).
- `notion-contact-canonicalizer.ts`: idem para contacts (si DB existe).

Cada canonicalizer:

- Lee page state via bridge (`GET /notion/pages/<id>` — agregar a TASK-577 como parte del scope si aún no está).
- Resuelve mappings inversa via `mappings-store.ts` (dirección `notion_to_hubspot`).
- Upsert canonical table.
- Emit outbox event.
- Update watermark.

### Slice 6 — Reconciliation polling worker (safety net)

- Cron `notion-reconciliation-poll` cada 6h en `services/ops-worker/`.
- Para cada DB configurada: query Notion con filter `last_edited_time > watermark`.
- Procesa deltas via los canonicalizers del Slice 5.
- Update watermark post-success.
- Dead letter si falla N reintentos.

### Slice 7 — Full-sync admin command

- Endpoint `POST /notion/full-sync` del bridge (declarado en TASK-577).
- Al recibir call, encola trabajo async (via outbox event `delivery.sync.full_requested`).
- Worker consume → itera todas las DBs → canonicaliza cada page → emit eventos.
- Response `{correlationId}` para follow-up via logs.
- Admin UI en V1 solo necesita un botón "Full sync" + ver status — admin API endpoint existe, UI es follow-up o inclusión en TASK-582.

### Slice 8 — Reverse projector: delivery → HubSpot

- Nuevo reactive worker `delivery-to-commercial-reverse-projector.ts` en `ops-worker`.
- Suscripto a `delivery.task.updated`, `delivery.project.updated`, `delivery.company.updated`, `delivery.contact.updated`.
- Para cada event:
  - Lee canonical state.
  - Resuelve mapping inverso via `mappings-store.ts`.
  - Consulta `shouldWriteField(dealstage, field, 'from_notion')`.
  - Si write permitted: calls `services/hubspot_greenhouse_integration/` HubSpot write endpoints (`PATCH /crm/v3/objects/deals/<id>` etc.).
  - Skip fields locked con log estructurado.
- Deduplica back-pressure: si un delivery event fue causado por una projection forward que acabamos de hacer, NO re-proyectar (rompe el loop). Pattern: `origin` field en outbox event con valor `forward_projector` para distinguir.

### Slice 9 — Tests + staging

- Unit tests de cada canonicalizer + webhook handler + polling worker.
- Integration test: webhook payload simulado → canonicalizer → outbox event emitted → reverse projector dispara → bridge recibe write.
- Back-pressure test: forward projector emite → reverse NO re-proyecta.
- Staging smoke: editar task real en Notion staging → webhook llega → canonical actualizado → HubSpot sandbox task actualizado.

## Out of Scope

- Admin UI para reconciliation run history. Follow-up.
- Full-sync UI con progress bar. V1 es API only + logs.
- Notion DB schema changes (agregar columnas nuevas a Tareas/Proyectos). Out — usamos el schema actual del sibling como baseline.

## Detailed Spec

### Back-pressure prevention

El loop potencial:

```
HubSpot → commercial.deal.updated → Forward Projector → write to Notion
Notion webhook → delivery.task.updated → Reverse Projector → write to HubSpot
HubSpot → commercial.deal.updated (loop!)
```

Solución: `origin` field en outbox events + canonical `sync_origin` column en `greenhouse_commercial.deals` + `greenhouse_delivery.tasks`:

- Forward projector al escribir a Notion: incluye `external_id` con suffix `_from_gh_forward`.
- Canonicalizer al leer Notion page: si `external_id` contiene ese suffix y `notion_last_edited_time <= canonical.updated_at + 5s`, skip (es echo).
- Suffix también marca la row canonical con `sync_origin='forward_echo'` durante 30s — el reverse projector ignora rows con ese origin.

### Event shapes

```ts
// Publisher
export const publishDeliveryTaskUpdated = async ({
  taskId, notionPageId, changedFields, origin
}) => publishOutboxEvent({
  eventType: EVENT_TYPES.deliveryTaskUpdated,
  aggregateType: AGGREGATE_TYPES.deliveryTask,
  aggregateId: taskId,
  payload: { taskId, notionPageId, changedFields, origin }
})
```

### Notion webhook signature validation

Pseudocode (verificar spec Notion):

```python
def validate_notion_webhook(body_bytes, signature_header, signing_secret):
    expected = hmac.new(signing_secret.encode(), body_bytes, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature_header):
        raise NotionWebhookValidationError("Invalid signature")
```

## Acceptance Criteria

- [ ] Discovery per-DB completa, decisión webhooks vs polling-only documentada.
- [ ] Eventos `delivery.*` declarados en `EVENT_TYPES` + `AGGREGATE_TYPES`.
- [ ] `greenhouse_delivery.sync_watermarks` + page link tables creadas.
- [ ] `POST /webhooks/notion` live con signature validation.
- [ ] 4 canonicalizers (task, project, company, contact) implementados.
- [ ] Reconciliation polling 6h corriendo en ops-worker.
- [ ] Full-sync admin command funcional end-to-end.
- [ ] Reverse projector escribe a HubSpot respetando state-machine locks.
- [ ] Back-pressure prevention verificado (no loops).
- [ ] Si schema bootstrap ejecutó: Companies + Contacts DBs de Notion existen con schema documentado.
- [ ] Tests unitarios + integration + staging smoke verdes.

## Verification

- Staging manual: editar task Notion → ver canonical update + HubSpot sandbox update dentro de 10s (via webhook path).
- Staging polling: dejar 6h sin webhooks → reconciliation dispara + procesa deltas.
- Full-sync: llamar `POST /notion/full-sync` con scope='tasks' → log de canonicalization completa.
- Back-pressure: forzar forward projection → verificar que reverse NO dispara en ≤ 30s.

## Closing Protocol

- [ ] `Lifecycle` sincronizado + archivo en carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` documentan
- [ ] EPIC-005 cross-check: acceptance "Reverse Orchestrator live con estrategia híbrida" marcado

## Follow-ups

- Real-time full (eliminar polling cuando webhooks prueben ≥99.9% reliability 90 días).
- Prometheus metrics: webhooks recibidos / min, polling deltas / run, reverse projections / min.
- Admin UI para ver watermark + últimas reconciliations.
- Contacts as standalone entity (no solo field del task en forward).

## Delta 2026-04-29

Decision operativa: el sibling que esta task reemplaza es **`cesargrowth11/notion-hubspot-sync`** (`https://github.com/cesargrowth11/notion-hubspot-sync`), especificamente el reverse worker top-level `main.py`. No confundir con `cesargrowth11/notion-bigquery` ni `cesargrowth11/hubspot-bigquery`.

Estado runtime desde 2026-04-29: la ejecucion automatica del sibling quedo pausada en Cloud Scheduler para evitar mas writes desde el sistema legacy mientras se disena la absorcion Greenhouse-first. Jobs pausados en `efeonce-group/us-central1`:

- `notion-hubspot-reverse-poll`
- `notion-hubspot-reverse-poll-staging`
- Tambien quedaron pausados los forward jobs del mismo repo: `hubspot-notion-deal-poll` y `hubspot-notion-deal-poll-staging`.

Implicacion para esta task: usar el reverse sync Python solo como referencia de comportamiento legacy y casos borde. La nueva solucion debe canonicalizar en Greenhouse, emitir eventos `delivery.*`, respetar back-pressure y proyectar a HubSpot via bridge existente; no reactivar ni extender el polling legacy como solucion final.

## Open Questions

- Notion webhooks: ¿qué versión de API? ¿Qué evento types exactos? Verificar en Slice 1 Discovery.
- ¿Bootstrap de Companies/Contacts DBs en esta task o diferido? Si diferido, acceptance criterion cambia. Inclinación: bootstrap en esta task para V1 completo.
- ¿Scope del reverse projector cubre proyección de delivery.contact a HubSpot? Si contacts en Notion se editan sin deal asociado, ¿proyectamos al HubSpot contact standalone o solo cuando un deal los consume? Inclinación V1: solo via deals; standalone es follow-up.
