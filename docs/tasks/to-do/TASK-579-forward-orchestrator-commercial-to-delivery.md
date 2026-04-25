# TASK-579 — Forward Orchestrator: Commercial → Delivery (HubSpot → Notion via Greenhouse)

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
- Domain: `commercial / delivery / integrations`
- Blocked by: `TASK-577` (Notion Write Bridge), `TASK-578` (Mapping Registry)
- Branch: `task/TASK-579-forward-orchestrator-commercial-to-delivery`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

Reemplazar el `forward_sync` del sibling `notion-hubspot-sync` por un reactive worker en `ops-worker` suscrito a eventos canónicos de Greenhouse (`commercial.deal.*`, `commercial.party.*`, `organization.*`, `crm.company.lifecyclestage_changed`) que proyecta a Notion via el Notion Write Bridge (TASK-577) usando el Mapping Registry (TASK-578). Cubre las 4 entidades del scope de EPIC-005: **deals, tasks, companies, contacts** (contacts como subset de deal events via `primary_contact_identity_profile_id` + `identity_profile_source_links`). No declara events nuevos — reusa el catalog existente.

## Why This Task Exists

- El sibling hoy hace polling 15-min sobre HubSpot y proyecta a Notion con mappings hardcoded, sin contexto de negocio. Pierde cambios en ventanas concurrentes, race padre/hijo, no respeta lifecycle del org.
- Greenhouse ya tiene todo el contexto (canonical deals + parties + identity mapping + outbox events + reactive workers live via `ops-worker`). Enchufar un forward orchestrator aquí es incremental.
- Promueve a Greenhouse de observador a source-of-truth activa: el outbox ya emite eventos cuando pasa algo real; el orchestrator consume esos eventos en vez de polling.
- Habilita conflict resolution state-machine (via TASK-578 `deal_stage_field_lock_config`) que el sibling no puede hacer.

## Goal

- Un nuevo reactive worker en `services/ops-worker/` suscrito a los eventos relevantes del outbox.
- Proyección deals → Notion Tareas DB (parent tasks) con owner, stage, priority, contact, business line, service modules todos resueltos via Mapping Registry.
- Proyección companies → Notion Companies DB con lifecycle, industry, domain, etc.
- Contacts proyectados como campos del task (no como entidad separada en V1).
- Idempotency via `external_id` en Notion pages (`gh_deal_{hubspot_deal_id}`, `gh_company_{hubspot_company_id}`).
- Conflict resolution: respeta `deal_stage_field_lock_config` — si un campo está locked para escritura desde HubSpot en el stage actual, el worker NO proyecta esa diff.
- Cubre los eventos del catalog existente sin declarar nuevos.
- Tests + staging validation con parity vs sibling output.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (eventos consumidos)
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` (patrón reactive worker)
- `docs/epics/to-do/EPIC-005-greenhouse-commercial-delivery-orchestrator.md`
- Patrón `services/ops-worker/` (worker actual)

Reglas obligatorias:

- **Subscribe to outbox, no polling**. Cada vez que hay un evento, proyección dispara en segundos.
- **Idempotency obligatoria** via `external_id`. El mismo evento procesado 2 veces no debe crear 2 Notion pages.
- **Respeta state-machine policy** de TASK-578 antes de escribir cada campo.
- **No bypassa el Write Bridge** (TASK-577) — toda escritura a Notion pasa por las rutas HTTP del bridge.
- **Logging estructurado** a Cloud Logging: cada projection emite un log con `event_type`, `entity_id`, `notion_page_id`, `fields_written`, `fields_skipped_locked`.
- **Dead letter queue** — si el bridge devuelve error reintentable, reintentar con backoff hasta N veces; si no reintentable, marcar evento como failed + log + alertar.

## Normative Docs

- `docs/epics/to-do/EPIC-005-greenhouse-commercial-delivery-orchestrator.md`
- `docs/tasks/to-do/TASK-577-notion-write-bridge.md`
- `docs/tasks/to-do/TASK-578-canonical-mapping-registry-notion.md`
- `/tmp/hbi-sibling/cesargrowth11/notion-hubspot-sync/hubspot-notion-sync/forward_sync/` (referencia del sibling — NO copiar mapping hardcoded)
- `src/lib/commercial/deal-events.ts` (catalog de eventos `commercial.deal.*`)
- `src/lib/commercial/party/party-events.ts` (catalog de eventos `commercial.party.*`)

## Dependencies & Impact

### Depends on

- `TASK-577` (Notion Write Bridge) cerrada. Endpoints `POST /notion/tasks`, `POST /notion/companies`, `POST /notion/projects` live.
- `TASK-578` (Mapping Registry) cerrada. 6 tablas + `identity_profile_source_links` extendida + `deal_stage_field_lock_config` sembradas.
- `ops-worker` live post TASK-574 (ya está — `ops-worker` es service del monorepo).

### Blocks / Impacts

- Bloquea TASK-581 (cutover no puede ejecutar sin el forward orchestrator funcional).
- NO bloquea TASK-580 — pueden correr en paralelo.
- Elimina dependencia en `forward_sync` del sibling para deals + companies + tasks + contacts projection.

### Files owned

- `services/ops-worker/commercial-delivery-forward-projector.ts` (nuevo — handler principal)
- `services/ops-worker/projectors/deal-to-notion-task.ts` (nuevo)
- `services/ops-worker/projectors/company-to-notion-company.ts` (nuevo)
- `services/ops-worker/projectors/resolve-contact-for-deal.ts` (nuevo)
- `services/ops-worker/projectors/__tests__/*.test.ts` (tests)
- `services/ops-worker/server.ts` (wire el projector al event loop)
- `src/lib/commercial/deal-projection-state.ts` (nuevo — reader de `deal_stage_field_lock_config` + helper `shouldWriteField`)
- `src/lib/sync/outbox-consumers.ts` (registrar nuevo consumer si el patrón lo requiere)

## Current Repo State

### Already exists

- `commercial_outbox` + reactive workers corriendo 5-min en `ops-worker` (`ops-reactive-process` cron).
- Eventos canónicos en catalog: `commercial.deal.created/synced/stage_changed/won/lost/created_from_greenhouse`, `commercial.party.created/promoted/demoted/lifecycle_backfilled`, `organization.created/updated`, `crm.company.lifecyclestage_changed`.
- `greenhouse_commercial.deals` con todos los campos necesarios (dealname, pipeline, dealstage, amount, owner, primary_contact_identity_profile_id, linea_de_servicio, servicios_especificos).
- `greenhouse_core.organizations` con `lifecycle_stage` + industry + domain + hubspot_company_id.
- `identity_profile_source_links` con HubSpot user ↔ person, y post TASK-578 también Notion user ↔ person.

### Gap

- Cero projector que consuma los eventos commercial y escriba a Notion.
- No hay reader que resuelva `primary_contact_identity_profile_id` → Notion user + datos para el campo contact del task.
- No hay gate de `deal_stage_field_lock_config` en write path a Notion.

## Scope

### Slice 1 — Deal → Notion task projector

- Handler suscrito a `commercial.deal.created`, `commercial.deal.created_from_greenhouse`, `commercial.deal.synced`, `commercial.deal.stage_changed`, `commercial.deal.won`, `commercial.deal.lost`.
- Lee el deal row de `greenhouse_commercial.deals` + resuelve:
  - **Parent monthly project**: llama a `GET /notion/projects/current?year=...&month=...&business_line=...` del bridge. Si devuelve `not_yet_created`, el projector NO auto-crea (eso es TASK-582 admin surface) — deja el task "pending_project_assignment" en un buffer table `greenhouse_commercial.pending_notion_projections`.
  - **Owner**: HubSpot owner id → resolver via `identity_profile_source_links` (source_system='hubspot_crm', object_type='user') → buscar source_system='notion' para el mismo identity → Notion user id.
  - **Stage → Notion status**: via `commercial_deal_stage_mapping`.
  - **Priority**: via `commercial_priority_mapping`.
  - **Business line**: via `commercial_business_line_mapping`.
  - **Service modules**: via `commercial_service_module_mapping`.
  - **Contact**: lee `deal.primary_contact_identity_profile_id` → resuelve email + nombre + role.
- Build payload para `POST /notion/tasks` (si es `created`) o `PATCH /notion/tasks/<page_id>` (si ya existe — consultar buffer `greenhouse_commercial.deal_notion_page_links` para obtener el page_id).
- Antes de escribir cada campo, consultar `shouldWriteField(dealstage, fieldName, 'from_hubspot')` de `deal-projection-state.ts`. Skip fields locked.
- Loggear structured log con fields_written + fields_skipped_locked.

### Slice 2 — Company → Notion company projector

- Handler suscrito a `commercial.party.created`, `commercial.party.promoted`, `commercial.party.demoted`, `organization.updated`, `crm.company.lifecyclestage_changed`.
- Lee organization + resuelve lifecycle, industry, domain, hubspot_company_id.
- Si Notion Companies DB no existe → TASK-580 bootstrap la creó; si tampoco después de TASK-580, el projector emite skip log y no-op (resiliente).
- Build payload para `POST /notion/companies` o `PATCH /notion/companies/<page_id>` (page_id tracked en `greenhouse_commercial.company_notion_page_links`).
- Idempotency via `external_id = gh_company_{hubspot_company_id}`.

### Slice 3 — Contact resolution helper

- Function `resolveContactForDeal(dealId) → { notionUserId?, email, name, role, identityProfileId }`.
- Lee `deal.primary_contact_identity_profile_id` → `identity_profiles` (email, name) + `identity_profile_source_links` con source_system='notion' si existe.
- Incluye el contact en el payload del task proyectado (no crea entidad Notion separada — solo llena los fields `Contact Name`, `Contact Email`, `Contact Role` del Notion task).

### Slice 4 — Pending projection buffer table

- Tabla `greenhouse_commercial.pending_notion_projections`:

```sql
CREATE TABLE greenhouse_commercial.pending_notion_projections (
  pending_id text PRIMARY KEY DEFAULT ('pending-' || gen_random_uuid()::text),
  entity_type text NOT NULL CHECK (entity_type IN ('deal', 'company', 'contact')),
  entity_id text NOT NULL,
  reason text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at timestamptz,
  resolved_notion_page_id text,
  payload_snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pending_entity_unique UNIQUE (entity_type, entity_id, resolved_at)
);
```

- El admin surface de TASK-582 (monthly project provisioning) drena este buffer tras approve-to-commit.

### Slice 5 — Page link tables

- `greenhouse_commercial.deal_notion_page_links (deal_id, notion_page_id, linked_at)`
- `greenhouse_commercial.company_notion_page_links (organization_id, notion_page_id, linked_at)`
- Ambas con UNIQUE constraint y upsert pattern.

### Slice 6 — Wiring en `ops-worker/server.ts`

- Registrar `commercialDeliveryForwardProjector` en el event loop del ops-worker.
- Rate limit budget: respeta Notion rate limit (~3 req/s) — procesar eventos serialized, no parallel.
- Dead letter: si un evento falla N reintentos (ej. Notion API 5xx sostenido), marcar en outbox como `failed` + log estructurado con correlation id + alertar via Sentry.

### Slice 7 — Tests

- Unit tests de cada projector con mocks del Notion Write Bridge y del Mapping Registry.
- Integration test: inyectar un `commercial.deal.created` event en outbox → verificar que el projector llama al bridge con payload correcto.
- Test de field lock: deal en `closedwon` stage + attempt a proyectar `amount` → skip + log.
- Staging smoke: crear un deal real en staging HubSpot → outbox emite → projector corre → verificar Notion staging task creado.

## Out of Scope

- Proyección reverse (Notion → HubSpot). Eso es TASK-580.
- Monthly project auto-creation. Eso es TASK-582 (admin surface).
- Reconciliation polling del lado forward (forward no polla — es event-driven). Reconciliation en TASK-580 cubre reverse only; el forward confía en outbox reliability.
- Admin UI para ver projection status. Follow-up post-EPIC.

## Detailed Spec

### Proyección de contacts como subset

La decisión arquitectónica de EPIC-005 es NO declarar `commercial.contact.*` events. El flujo:

```
commercial.deal.created ────► Forward Projector
                                    │
                                    ├─ read deal from greenhouse_commercial.deals
                                    ├─ read primary_contact_identity_profile_id
                                    ├─ read identity_profiles (email, name)
                                    ├─ read identity_profile_source_links (notion user)
                                    └─ include contact fields in Notion task payload
```

Si el deal no tiene `primary_contact_identity_profile_id`, el task en Notion queda con fields contact vacíos. No bloquea la creación.

### Field lock enforcement (conflict resolution)

```ts
async function projectDealToNotion(dealId: string, changedFields: string[]) {
  const deal = await getDealById(dealId)
  const fieldsToWrite: Record<string, unknown> = {}

  for (const field of changedFields) {
    const locked = await isFieldLockedForStage(deal.dealstage, field, 'from_hubspot')
    if (locked) {
      logger.info({ dealId, field, reason: 'stage_lock' }, 'skip projection')
      continue
    }
    fieldsToWrite[field] = resolveFieldValue(deal, field)
  }

  if (Object.keys(fieldsToWrite).length === 0) return // nothing to write

  await notionBridge.patchTask(pageId, fieldsToWrite)
}
```

## Acceptance Criteria

- [ ] `commercial-delivery-forward-projector.ts` existe en `services/ops-worker/` y se registra en el event loop.
- [ ] Deals proyectan a Notion Tareas DB correctamente con todos los fields resueltos via Mapping Registry.
- [ ] Companies proyectan a Notion Companies DB (si existe) o skip-log si la DB no existe aún.
- [ ] Contacts resuelven via `primary_contact_identity_profile_id` y aparecen como fields del task.
- [ ] `deal_stage_field_lock_config` se respeta — campos locked skip sin error.
- [ ] Idempotency: mismo evento procesado 2 veces no duplica Notion pages (via `external_id`).
- [ ] Page link tables (`deal_notion_page_links`, `company_notion_page_links`) se mantienen actualizadas.
- [ ] Pending projections buffer funciona cuando el monthly project aún no existe.
- [ ] Logging estructurado con `event_type`, `entity_id`, `notion_page_id`, `fields_written`, `fields_skipped_locked`.
- [ ] Dead letter handling + Sentry alerts para fallas sostenidas.
- [ ] Tests unitarios + integration verdes.
- [ ] Staging smoke OK: deal HubSpot staging → task Notion staging creado con fields correctos.

## Verification

- `pnpm test src/lib/commercial/ services/ops-worker/` verde.
- Staging parity check vs sibling: mismos deals que el sibling procesó en la última semana deben producir los mismos Notion pages vía el nuevo projector (comparación manual de un sample de 20 deals).
- Cloud Logging en `ops-worker` muestra eventos procesados con el structured log format.
- `gcloud run services describe ops-worker` — revisión nueva con el projector registrado.

## Closing Protocol

- [ ] `Lifecycle` sincronizado + archivo en carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` documentan
- [ ] EPIC-005 cross-check: acceptance "Forward Orchestrator live" marcado

## Follow-ups

- Admin UI para ver el buffer `pending_notion_projections`.
- Métricas Prometheus de projections por minuto + fail rate.
- Contacts independientes (Notion contact page separado en Contacts DB, no solo field del task).
- Batch projections para cuando un deal trigger múltiples cambios en una ventana corta (collapse 3 eventos → 1 write).

## Open Questions

- ¿La Companies DB de Notion existe al momento de ejecutar esta task? Dependencia con TASK-580 Discovery.
- ¿Qué granularidad de "priority" usa Notion hoy? Si tiene `P0/P1/P2/P3` el mapping es simple; si es `Low/Med/High` y HubSpot usa números, hay que normalizar.
