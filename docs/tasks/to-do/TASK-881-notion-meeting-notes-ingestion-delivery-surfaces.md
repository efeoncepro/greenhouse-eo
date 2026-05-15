# TASK-881 — Notion Meeting Notes Ingestion → Delivery + ICO Surfaces

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-009` (cross-reference EPIC-005 commercial-delivery-orchestrator)
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `delivery|integrations|ico`
- Blocked by: `TASK-880` (necesita Notion-Version `2026-03-11` + cliente canonical + PAT auth resolver)
- Branch: `task/TASK-881-notion-meeting-notes-ingestion`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Consumir el endpoint nuevo `POST /v1/blocks/meeting_notes/query` (lanzado 11-may-2026, parte de Notion Developer Platform 3.5) para ingerir las **AI Meeting Notes** que los workspaces de clientes generan dentro de Notion, materializarlas en `greenhouse_delivery.notion_meeting_notes` (PG canonical) + mirror BQ conformed, y surface "última reunión del proyecto X" + attendees + summary en delivery dashboards, project drawer, ICO context y Pulse. Cierra un gap real: hoy las decisiones que se toman en reuniones del cliente viven solo en Notion y no las cruzamos con tasks/sprints/ICO en Greenhouse, perdiendo señal valiosa para la narrative del cliente y para que Nexa entienda el contexto operativo.

## Why This Task Exists

Los clientes Globe (Sky, etc. — enterprise marketing teams distributed across the Americas) usan Notion AI activamente para tomar meeting notes durante sprint reviews, weekly check-ins y planning sessions. Esa información:

1. **Tiene attendees normalizados** (alias resolvers nativos de Notion API endpoint), lo que permite cruzar con `members.notion_user_id` (poblado por TASK-877 identity reconciliation) y atribuir reuniones a colaboradores Greenhouse específicos.
2. **Es el contexto que falta a los Pulse summaries**: hoy un Pulse semanal dice "10 tasks completadas, 3 atrasadas" pero NO dice "el cliente decidió en la reunión del lunes pivotear el approach del campaign X". Sin esa narrative, el cliente no ve valor en el Pulse.
3. **Es input crítico para ICO**: una reunión que registra decisiones operativas + accountability es señal de healthy delivery; ausencia de meeting cadence es señal de drift. ICO score puede incorporar `last_meeting_date_with_client` como dimensión.
4. **Es contexto natural para Nexa**: cuando un PM le pregunte a Nexa "¿qué pasó esta semana en Sky?", la respuesta debería incluir "ayer hubo reunión sprint review, asistieron X/Y/Z, decisiones clave: …". Hoy Nexa solo ve tasks en BQ; no las reuniones que las contextualizan.

Sin esta task, las Meeting Notes de Notion siguen como dark data. Con esta task, se vuelven first-class citizens en el modelo delivery 360.

## Goal

- Schema canonical `greenhouse_delivery.notion_meeting_notes` con FK a `greenhouse_delivery.projects` (best-effort link) + `greenhouse_core.spaces` + array de `attendee_member_ids` resueltos via `members.notion_user_id`.
- Mirror BQ conformed `greenhouse_conformed.delivery_notion_meeting_notes` para análisis histórico + cruce con marts.
- Helper canonical `fetchMeetingNotesForSpace({spaceId, sinceDate, limit})` usando `NotionApiClient` (TASK-880).
- Extender `runNotionSyncOrchestration` con step opcional `meeting_notes` controlado por flag `NOTION_MEETING_NOTES_INGEST_ENABLED` (default `false`, opt-in per workspace via `space_notion_sources.meeting_notes_ingest_enabled`).
- Reactive consumer `notion_meeting_notes_intake` que escucha outbox event `notion.meeting_notes.fetched v1` y proyecta a PG.
- Surfaces: project detail drawer ("Última reunión" + attendees + summary), `/agency/sprints/[id]` timeline, ICO score factor `meeting_cadence_health`, Pulse weekly digest section "Decisiones clave".
- Capability `delivery.meeting_notes.read` (scope `tenant`/`assignment`/`own`) gated en route_group + entrypoint.
- Reliability signals: `delivery.notion_meeting_notes.sync_lag` (warning > 6h sin nuevo fetch para spaces con flag activo) + `delivery.notion_meeting_notes.attendees_unresolved` (data quality, warning si attendees sin `member_id` link > 30%).
- Microcopy es-CL canonical en `src/lib/copy/delivery.ts` (extender domain copy module).
- Sin breaking change al pipeline tasks/projects/sprints existente — la ingesta de meeting notes es additive y aislada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_NOTION_DELIVERY_SYNC_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- **NUNCA** llamar al endpoint `/v1/blocks/meeting_notes/query` fuera de `src/lib/notion/meeting-notes-fetcher.ts`. Single source of truth con cliente canonical TASK-880.
- **NUNCA** materializar meeting notes BQ → PG inline en un Vercel route handler. Toda projection async via outbox event + reactive consumer en ops-worker (CLAUDE.md "Reactive projections en lugar de sync inline").
- **NUNCA** persistir el contenido raw de la meeting note (que puede contener PII de clientes) sin clasificar `retention_class='delivery_meeting_notes'` + audit trail de quién accede.
- **NUNCA** asumir que una meeting note está atada a un project — el link es best-effort (Notion no expone una FK formal). Persistir `project_link_confidence: 'explicit'|'inferred'|'none'`.
- **NUNCA** loggear summary completo en Sentry — usar `redactSensitive` antes (puede contener nombres de campañas, decisiones estratégicas, números de revenue).
- **NUNCA** hacer fetch de meeting notes con la global API token salvo que sea fallback canonical — preferir PAT scoped por workspace (cascade resolver TASK-880).
- Cualquier consumer de la VIEW canonical (UI, ICO, Pulse) DEBE filtrar por capability + scope. Meeting notes son sensibles.
- Read path admin (admin queue de unresolved attendees) requiere `delivery.meeting_notes.read_sensitive` capability separada.

## Normative Docs

- Notion API docs: https://developers.notion.com/reference/query-meeting-notes (endpoint nuevo 11-may-2026)
- `docs/audits/notion/notion-bq-sync/NOTION_BQ_SYNC_AUDIT_2026-04-30.md`
- `docs/tasks/complete/TASK-877-workforce-external-identity-reconciliation.md` (`identity_profile_source_links` para resolver attendees → members)
- `docs/tasks/to-do/TASK-879-notion-developer-platform-readiness-worker-pilot.md`
- `docs/tasks/to-do/TASK-880-notion-api-modernization-and-pat-foundation.md` (foundation técnica)

## Dependencies & Impact

### Depends on

- **TASK-880** — Notion API version `2026-03-11` + `NotionApiClient` canonical + `resolveNotionAuth` cascade. **Bloqueante hard.** No mergear nada de TASK-881 hasta TASK-880 Slice 4 (version bump) y Slice 1 (cliente canonical) cerrado.
- TASK-877 — `identity_profile_source_links` para resolver attendees email/notion_user_id → `members.member_id`.
- `src/lib/notion/api-client.ts` (creado por TASK-880)
- `src/lib/notion/auth-resolver.ts` (creado por TASK-880)
- `src/lib/integrations/notion-sync-orchestration.ts` (extender con step opcional)
- `services/ops-worker/server.ts` (registrar reactive consumer + scheduler trigger opcional)
- `greenhouse_delivery.projects` schema (FK target)
- `greenhouse_core.spaces` + `space_notion_sources` schema (extender con `meeting_notes_ingest_enabled`)
- `greenhouse_core.members` (`notion_user_id` populated por TASK-877)
- `src/lib/sync/projections/` (registrar projection nueva)

### Blocks / Impacts

- **Habilita**: contexto narrative para Pulse weekly digest + Nexa tooling + ICO score enrichment.
- **Coordina con**: EPIC-005 (commercial-delivery-orchestrator) — meeting notes son señal canonical de delivery cadence health.
- **Coordina con**: futura TASK Pulse weekly digest enhancement (consumer principal del Slice 4).
- **Coordina con**: futura TASK ICO `meeting_cadence_health` factor (consumer del signal).
- **Coordina con**: futura TASK Nexa context tooling (consumer read-only de la VIEW canonical).
- **Coordina con**: TASK-879 (si Notion Workers terminan siendo path canonical, esta ingesta podría migrar a un Worker — V2 contingente).
- **NO impacta**: pipeline canonical de tasks/projects/sprints (additive aislado).

### Files owned

- `src/lib/notion/meeting-notes-fetcher.ts` — fetcher canonical
- `src/lib/sync/projections/notion-meeting-notes-intake.ts` — reactive projection
- `src/lib/delivery/meeting-notes/store.ts` — PG store + readers
- `src/lib/delivery/meeting-notes/attendee-resolver.ts` — resuelve attendee aliases → member_ids
- `src/lib/reliability/queries/notion-meeting-notes-sync-lag.ts` — signal reader
- `src/lib/reliability/queries/notion-meeting-notes-attendees-unresolved.ts` — signal reader
- `src/app/api/delivery/meeting-notes/route.ts` — list endpoint
- `src/app/api/delivery/projects/[projectId]/meeting-notes/route.ts` — per-project endpoint
- `src/app/api/admin/integrations/notion/meeting-notes-ingest/route.ts` — admin trigger manual
- `src/components/greenhouse/delivery/MeetingNotesPanel.tsx` — UI component
- `src/views/greenhouse/delivery/projects/MeetingNotesTimeline.tsx` — drawer section
- `src/lib/copy/delivery.ts` — extender con `GH_DELIVERY.meetingNotes`
- `migrations/<timestamp>_task-881-notion-meeting-notes.sql`
- `migrations/<timestamp>_task-881-space-notion-sources-meeting-notes-flag.sql`
- `migrations/<timestamp>_task-881-bq-conformed-meeting-notes.sql` (DDL BQ vía script script-side, no migration PG)
- `scripts/integrations/notion/backfill-meeting-notes-for-space.ts`
- `docs/architecture/GREENHOUSE_NOTION_DELIVERY_SYNC_V1.md` (Delta extender el orchestration con step opcional)
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (Delta — agregar event)
- `docs/documentation/delivery/meeting-notes-canonical.md` (NEW funcional)
- `docs/manual-de-uso/delivery/meeting-notes-en-greenhouse.md` (NEW manual operador + cliente)

## Current Repo State

### Already exists

- Pipeline canonical Notion → BQ raw → conformed → PG `greenhouse_delivery.{projects,tasks,sprints}` (sin meeting notes hoy).
- TASK-877 cerró `identity_profile_source_links` para resolver Notion users → identity_profiles (poblado para colaboradores internos; cliente-side puede estar incompleto).
- `notionRequest` wrapper en `notion-client.ts` (será reemplazado por `NotionApiClient` en TASK-880).
- Reactive projections playbook canonical (TASK-708/720/728/771 patterns reusables).
- `greenhouse_core.spaces.notion_workspace_id` registrado (verificar nombre exacto en Slice 0).
- ops-worker Cloud Run + Cloud Scheduler crons disponibles para reactive consumers.
- `captureWithDomain('integrations.notion', ...)` operativo (TASK-844).
- `redactSensitive` operativo (TASK-742).

### Gap

- No existe consumer del endpoint Meeting Notes (no estaba disponible en `Notion-Version: 2022-06-28`).
- No hay schema PG ni BQ para meeting notes.
- No hay attendee resolver canonical (TASK-877 resuelve identity profiles, no específicamente para meeting attendees alias normalization).
- No hay UI surface en Greenhouse que muestre meeting notes.
- No hay capability ni audit pattern para acceso a contenido sensible de reuniones.
- No hay reliability signal de meeting cadence.
- ICO engine no incorpora meeting cadence como factor.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Discovery + endpoint contract validation

- Read Notion API docs `query-meeting-notes` endpoint: shape de request + response, paginación, filter syntax, sort options, attendee alias normalization output.
- Verificar manualmente con `curl` (usando integration token Greenhouse + workspace Efeonce) que el endpoint responde — al menos una meeting note fetcheable.
- Documentar shape exacto en `docs/audits/notion/TASK-881-meeting-notes-endpoint-contract-2026-05-14.md`.
- Mapear campos del response a futuras columnas PG (decision tree per field: persist / derive / ignore).
- Identificar si attendees se entregan con `notion_user_id`, `email`, ambos, o sólo `display_name`. Critical para attendee-resolver.
- Output: spec JSON-shape + columnas PG propuestas + decisión de FK strategy.

### Slice 1 — PG schema canonical + space flag

- Migration `<timestamp>_task-881-space-notion-sources-meeting-notes-flag.sql`:
  - `ALTER TABLE greenhouse_core.space_notion_sources ADD COLUMN IF NOT EXISTS meeting_notes_ingest_enabled BOOLEAN NOT NULL DEFAULT FALSE;`
  - `ADD COLUMN meeting_notes_first_ingest_at TIMESTAMPTZ NULL;`
  - `ADD COLUMN meeting_notes_last_ingest_at TIMESTAMPTZ NULL;`
- Migration `<timestamp>_task-881-notion-meeting-notes.sql`:
  - Tabla `greenhouse_delivery.notion_meeting_notes`:
    - `meeting_note_id UUID PK DEFAULT gen_random_uuid()`
    - `notion_meeting_note_id TEXT NOT NULL UNIQUE` (Notion-side block ID)
    - `notion_workspace_id TEXT NOT NULL`
    - `space_id TEXT NOT NULL REFERENCES greenhouse_core.spaces(space_id)`
    - `project_id TEXT NULL REFERENCES greenhouse_delivery.projects(notion_project_id)` (best-effort)
    - `project_link_confidence TEXT NOT NULL CHECK (project_link_confidence IN ('explicit', 'inferred', 'none'))`
    - `title TEXT NULL`
    - `summary_redacted TEXT NULL` (post-redactSensitive — safe para listings UI)
    - `summary_full TEXT NULL` (raw — solo accesible via reveal capability)
    - `transcript_url TEXT NULL` (Notion page URL al meeting note original)
    - `meeting_started_at TIMESTAMPTZ NULL`
    - `meeting_duration_minutes INTEGER NULL`
    - `attendees_raw_json JSONB NOT NULL` (raw response Notion para audit)
    - `attendees_resolved_json JSONB NOT NULL DEFAULT '[]'::jsonb` (`[{notionUserId, alias, memberId, identityProfileId, resolutionConfidence}]`)
    - `attendees_unresolved_count INTEGER NOT NULL DEFAULT 0`
    - `key_decisions_json JSONB NULL` (Notion AI extrae decisions — opt-in)
    - `action_items_json JSONB NULL` (Notion AI extrae action items — opt-in)
    - `payload_hash BYTEA NOT NULL` (SHA-256 canonical para dedup + change detection)
    - `notion_created_at TIMESTAMPTZ NOT NULL`
    - `notion_last_edited_at TIMESTAMPTZ NOT NULL`
    - `synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
    - `deleted_in_notion_at TIMESTAMPTZ NULL` (soft-delete cuando upstream desaparece)
    - `created_at` / `updated_at` audit columns
  - INDEXes: `(space_id, meeting_started_at DESC)`, `(project_id, meeting_started_at DESC) WHERE project_id IS NOT NULL`, GIN sobre `attendees_resolved_json`.
  - Trigger `set_updated_at`.
  - Anti pre-up-marker DO block.
  - GRANTs: `greenhouse_runtime` SELECT/INSERT/UPDATE (NO DELETE — soft-delete via `deleted_in_notion_at`).
- Tabla audit `greenhouse_delivery.notion_meeting_notes_access_log` (append-only, trigger anti-update/delete) — registra cada acceso a `summary_full` con `actor_user_id, accessed_at, reason`.
- Capabilities seed (`migrations/<timestamp>_task-881-capabilities-registry-seed.sql`):
  - `delivery.meeting_notes.read` (action=read, scope=tenant) — internal_admin / assigned_member.
  - `delivery.meeting_notes.read_summary_full` (action=read_sensitive, scope=tenant) — EFEONCE_ADMIN + DELIVERY_LEAD only.
  - `delivery.meeting_notes.trigger_ingest` (action=execute, scope=tenant) — EFEONCE_ADMIN.
  - `delivery.meeting_notes.toggle_ingest_per_space` (action=update, scope=tenant) — EFEONCE_ADMIN.
- Grants en `runtime.ts` (CLAUDE.md TASK-873 invariant).
- Tests: 15+ tests (schema, CHECK constraints, anti pre-up-marker, capability parity).

### Slice 2 — Notion API fetcher + attendee resolver

- `src/lib/notion/meeting-notes-fetcher.ts`:
  - `fetchMeetingNotesForSpace({spaceId, sinceDate?, limit?, operatorUserId?})` → array de raw payloads.
  - Usa `NotionApiClient` (TASK-880) con `resolveNotionAuth({operatorUserId, workspaceId, scope: 'read'})`.
  - Maneja paginación nativa Notion (cursor-based).
  - Filter: `last_edited_at >= sinceDate`. Sort: `last_edited_at DESC`. Limit: configurable, default 50.
  - Retry con backoff exponencial para 429 (respetar `Retry-After` header).
  - Captura errores con `captureWithDomain('integrations.notion', err, { tags: { source: 'meeting_notes_fetcher' } })`.
- `src/lib/delivery/meeting-notes/attendee-resolver.ts`:
  - `resolveAttendeesForMeetingNote(rawAttendeesJson) → ResolvedAttendees[]`.
  - Cascade: `notion_user_id → members.notion_user_id → member_id` → fallback `email → identity_profile_source_links → identity_profile_id → person_membership → member_id`.
  - Per-attendee returns `{notionUserId, alias, memberId?, identityProfileId?, resolutionConfidence: 'high'|'medium'|'low'|'none', resolutionPath: string}`.
  - `attendees_unresolved_count` = count attendees con `confidence === 'none'`.
- `src/lib/delivery/meeting-notes/project-link-resolver.ts`:
  - Best-effort link a `greenhouse_delivery.projects`. Strategies (en orden):
    1. `explicit`: si la meeting note menciona un project_id en `properties` o `relations` Notion-side → confidence=explicit.
    2. `inferred`: matchear título/summary contra `project_name` en el space → confidence=inferred si match score > 0.7.
    3. `none`: no link encontrado.
- Tests: 25+ tests cubren fetch (mocked), pagination, retry, attendee cascade, project link strategies, edge cases (zero attendees, attendees sin email, project sin match).

### Slice 3 — Reactive projection + outbox event + orchestration step

- Outbox event nuevo `notion.meeting_notes.fetch_requested v1` — payload `{spaceId, sinceDate?, requestedBy, requestId}`.
- Outbox event nuevo `notion.meeting_notes.materialized v1` — payload `{spaceId, meetingNoteIds[], totalIngested, totalUpdated, totalSkipped, totalAttendeesUnresolved}`.
- Documentar ambos en `GREENHOUSE_EVENT_CATALOG_V1.md` (Delta).
- `src/lib/sync/projections/notion-meeting-notes-intake.ts`:
  - `ProjectionDefinition` registrado en `src/lib/sync/projections/index.ts`.
  - `triggerEvents: ['notion.meeting_notes.fetch_requested']`.
  - `extractScope(payload)` → `{kind: 'space', id: spaceId}`.
  - `refresh({scope})`:
    1. Re-leer `space_notion_sources` desde PG (NUNCA confiar en payload).
    2. Skip si `meeting_notes_ingest_enabled = FALSE`.
    3. Llamar `fetchMeetingNotesForSpace({spaceId, sinceDate: lastIngestAt})`.
    4. Per meeting note: resolver attendees + project link → UPSERT en `notion_meeting_notes` por `notion_meeting_note_id`.
    5. Update `space_notion_sources.meeting_notes_last_ingest_at`.
    6. Emit `notion.meeting_notes.materialized v1`.
  - `maxRetries: 3`. Dead-letter post 3 fails.
- Extender `runNotionSyncOrchestration` con step opcional `meetingNotes`:
  - Step 3 (post BQ→PG drain): foreach space con `meeting_notes_ingest_enabled = TRUE` AND env `NOTION_MEETING_NOTES_INGEST_ENABLED=true`, emit `notion.meeting_notes.fetch_requested` event.
  - Step es non-blocking — si falla, NO bloquea el ciclo principal.
- Cloud Scheduler job nuevo `ops-notion-meeting-notes-sync` (cron `0 * * * *` — hourly, async desde el daily orchestration):
  - Endpoint Cloud Run nuevo `POST /notion-meeting-notes/sync` en `services/ops-worker/server.ts`.
  - Wrap con `wrapCronHandler({name, domain: 'integrations.notion', run})`.
  - Itera spaces activos + emit fetch_requested events.
- Tests: 30+ tests cubren projection happy path, idempotency, dead-letter, scope extraction, orchestration step gating por flag.

### Slice 4 — UI surfaces + read API

- API routes:
  - `GET /api/delivery/meeting-notes?spaceId=&projectId=&sinceDate=&limit=` (capability `delivery.meeting_notes.read`).
    - Returns masked: `{title, summaryRedacted, attendeesResolved, meetingStartedAt, transcriptUrl, ...}` (NUNCA `summary_full`).
  - `GET /api/delivery/meeting-notes/[meetingNoteId]/full-summary` (capability `delivery.meeting_notes.read_summary_full`).
    - Audit: insert row en `notion_meeting_notes_access_log` ANTES de returning. Reason header obligatorio (`X-Reason: <text >= 5 chars>`).
  - `GET /api/delivery/projects/[projectId]/meeting-notes` (capability scoped al project assignment).
  - `POST /api/admin/integrations/notion/meeting-notes-ingest` (capability `delivery.meeting_notes.trigger_ingest`).
    - Body `{spaceId, sinceDate?}`. Emit fetch_requested event manual.
  - `PATCH /api/admin/integrations/notion/spaces/[spaceId]/meeting-notes-ingest` (capability `toggle_ingest_per_space`).
    - Body `{enabled: boolean}`. Toggle flag + audit.
- UI surfaces:
  - `MeetingNotesTimeline` componente client + server hybrid en `src/views/greenhouse/delivery/projects/MeetingNotesTimeline.tsx`. Renderea timeline vertical con: fecha, título, attendees chips (max 5 visible + overflow), summary preview (line-clamp-3), botón "Ver transcript" (opens Notion in new tab).
  - Drawer section "Reuniones recientes" en `ProjectDrawer` (sirve como AccordionSection si hay > 0 meetings).
  - Card `MeetingNotesPanel` reusable en `/agency/sprints/[id]` y `/delivery/dashboard` (top-level "últimas N reuniones cross-project").
  - Admin queue `/admin/integrations/notion/meeting-notes/unresolved-attendees` para resolver attendees con `confidence === 'none'` manualmente (link a `members` o crear `identity_profile_source_link`).
- Microcopy en `src/lib/copy/delivery.ts`:
  - `GH_DELIVERY.meetingNotes.empty.title` → "Sin reuniones registradas"
  - `GH_DELIVERY.meetingNotes.empty.body` → "Cuando se generen meeting notes en Notion para este proyecto, las verás aquí."
  - `GH_DELIVERY.meetingNotes.degraded.ingestDisabled` → "Sincronización pausada para este espacio."
  - `GH_DELIVERY.meetingNotes.actions.viewTranscript` → "Abrir en Notion"
  - `GH_DELIVERY.meetingNotes.actions.viewFullSummary` → "Ver resumen completo"
  - `GH_DELIVERY.meetingNotes.attendees.unresolvedTooltip` → "{count} asistentes sin vincular a colaboradores Greenhouse"
- Pasar microcopy por `greenhouse-ux-writing` skill antes de mergear.
- Tests UI: render + interaction + capability gating + empty state + degraded state.

### Slice 5 — BQ conformed mirror + reliability signals

- BigQuery DDL (script `scripts/bq/create-delivery-meeting-notes-conformed.ts`):
  - `greenhouse_conformed.delivery_notion_meeting_notes` mirror de PG con columnas core + payload_hash + ingested_to_pg_at.
  - Particionado por `meeting_started_at` DATE.
  - Cluster por `space_id, project_id`.
- Mirror sync via projection separada `notion_meeting_notes_to_bq` (registered en `src/lib/sync/projections/`):
  - `triggerEvents: ['notion.meeting_notes.materialized']`.
  - `refresh`: MERGE batch a BQ vía `bigQuery.query` (idempotente por `notion_meeting_note_id`).
  - Patrón canonical TASK-771 (sync inline → reactive projection).
- Reliability signals:
  - `delivery.notion_meeting_notes.sync_lag` (kind=lag, severity=warning >6h, error >24h):
    - Reader cuenta spaces con `meeting_notes_ingest_enabled=TRUE` y `meeting_notes_last_ingest_at < now() - interval '6 hours'`.
  - `delivery.notion_meeting_notes.attendees_unresolved` (kind=data_quality, severity=warning si avg unresolved% > 30, error si > 60):
    - Reader computa `AVG(attendees_unresolved_count::FLOAT / NULLIF(jsonb_array_length(attendees_raw_json), 0))` últimas 7d.
  - `delivery.notion_meeting_notes.bq_sync_dead_letter` (kind=dead_letter, severity=error si count > 0).
- Wire-up en `getReliabilityOverview` source `delivery[]`. Subsystem rollup: `Delivery & ICO`.
- Doc funcional `docs/documentation/delivery/meeting-notes-canonical.md` v1.0.
- Manual operador `docs/manual-de-uso/delivery/meeting-notes-en-greenhouse.md` (cómo activar el ingest para un space, cómo resolver attendees, qué significan los signals).
- ADR entry en `DECISIONS_INDEX.md`.
- Spec Delta en `GREENHOUSE_NOTION_DELIVERY_SYNC_V1.md`.
- CLAUDE.md sección "Notion Meeting Notes Ingestion invariants" (hard rules).

## Out of Scope

- NO modificar el pipeline canonical de tasks/projects/sprints (additive aislado).
- NO escribir/editar meeting notes en Notion (read-only V1; futuro V2 puede agregar create/update si emerge use case).
- NO ejecutar análisis NLP custom sobre summary (Notion AI ya lo hace; consumimos el output).
- NO surface en client portal (V1 solo internal — agency / efeonce). V2 puede exponerlo a clients con capability granular.
- NO migrar a Notion Workers (TASK-879 evalúa).
- NO cambiar ICO formula — solo emit la señal `meeting_cadence_health`. La integración a ICO score es task derivada.
- NO Pulse weekly digest enhancement — solo dejar la VIEW canonical lista. Consumer es task derivada.
- NO Nexa tooling integration — solo dejar API canonical lista. Consumer es task derivada.
- NO bidirectional sync (meeting notes solo Notion→Greenhouse).
- NO multi-workspace meeting notes en single space (V1 asume 1 workspace por space — si emerge multi, V2).

## Detailed Spec

### Endpoint contract (a verificar en Slice 0)

Per Notion API docs `query-meeting-notes` (11-may-2026):

```http
POST https://api.notion.com/v1/blocks/meeting_notes/query
Authorization: Bearer {pat_or_integration_token}
Notion-Version: 2026-03-11
Content-Type: application/json

{
  "filter": {
    "last_edited_time": {"after": "2026-05-01T00:00:00Z"}
  },
  "sort": {"timestamp": "last_edited_time", "direction": "descending"},
  "page_size": 50,
  "start_cursor": "..."
}
```

Response shape esperado (a confirmar en Slice 0):

```json
{
  "object": "list",
  "results": [
    {
      "id": "block_uuid",
      "type": "meeting_notes",
      "meeting_notes": {
        "title": "Sky Sprint Review — Mayo 12",
        "started_at": "2026-05-12T15:00:00Z",
        "duration_minutes": 45,
        "attendees": [
          {"notion_user_id": "...", "person_email": "valentina@efeonce.org", "alias": "Valentina Hoyos"}
        ],
        "summary": "...",
        "key_decisions": ["Pivot campaign X", "..."],
        "action_items": [{"description": "...", "assignee_alias": "..."}]
      },
      "url": "https://notion.so/...",
      "created_time": "...",
      "last_edited_time": "..."
    }
  ],
  "next_cursor": "...",
  "has_more": true
}
```

Si response shape difiere, ajustar mapper en Slice 2 antes de Slice 3.

### Reliability signal `meeting_cadence_health` (futuro consumer ICO)

NO incluido en V1 — solo dejar la información disponible. Cuando ICO emit derivar el factor:

- `last_meeting_at` per project + frequency (días entre meetings últimos 30d) → score 0-100.
- Threshold per `engagement_kind` (regular: weekly cadence ideal; pilot: bi-weekly ok).

Esta task NO modifica ICO formula — solo expone la VIEW.

### Outbox events nuevos (versionados v1)

- `notion.meeting_notes.fetch_requested v1` — `{spaceId, sinceDate?, requestedBy: 'cron'|'admin'|'orchestration', requestId}`.
- `notion.meeting_notes.materialized v1` — `{spaceId, meetingNoteIds[], totalIngested, totalUpdated, totalSkipped, totalAttendeesUnresolved, durationMs}`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 (discovery) DEBE finalizar antes de Slice 2.
- Slice 1 (schema) DEBE finalizar antes de Slice 3.
- Slice 2 (fetcher) puede correr en paralelo con Slice 1.
- Slice 3 (projection + orchestration) DEBE finalizar antes de Slice 4 (UI necesita data poblada).
- Slice 4 (UI) DEBE finalizar antes de promover flag a producción.
- Slice 5 (BQ + signals) puede correr en paralelo con Slice 4.
- TASK-880 Slice 4 (version bump) DEBE estar mergeado antes de cualquier slice de TASK-881 que use el cliente canonical real.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Notion endpoint no devuelve attendees con `notion_user_id` (sólo emails) | Identity reconciliation | medium | attendee-resolver cascade soporta email path; `unresolved_count` signal alerta | `attendees_unresolved` signal |
| Summary contiene PII de cliente que filtra a logs | Compliance / privacy | medium | `redactSensitive` antes de loggear; `summary_full` gated detrás de capability sensible + audit log | secret/PII scan |
| Project link inferred genera falso match (meeting de proyecto X linkea a proyecto Y) | Delivery integrity | medium | confidence='inferred' es siempre visible en UI con tooltip; fallback a 'none' si match score < 0.7 | reliability signal `meeting_notes.project_link_low_confidence_rate` (V2 si emerge) |
| Rate limit Notion (3 req/sec sustained) en spaces grandes con muchos meetings | Notion API | medium | retry exponencial + paginación canonical + ingest hourly (no continuo) | 429 spike Sentry domain=integrations.notion |
| Operador activa flag en space con 1000+ meeting notes históricos → ingesta masiva | Notion API + DB | medium | `sinceDate` default = NOW para primer ingest; backfill manual via script con paginación | scheduler timeout |
| Reactive projection dead-letter por bug en attendee resolver | Sync infrastructure | medium | dead-letter signal + replay endpoint + tests cubren edge cases | `bq_sync_dead_letter` + `outbox_events.dead_letter` |
| UI muestra meeting notes a usuarios sin assignment al project | Privacy / capability | high | capability gating server-side por endpoint; `delivery.meeting_notes.read` scoped a `assigned_member` | audit log access patterns |
| BQ MERGE falla por schema drift | Data warehouse | low | DDL script idempotente + smoke test post-deploy | bq_sync_dead_letter |

### Feature flags / cutover

- `NOTION_MEETING_NOTES_INGEST_ENABLED` (env var Vercel + ops-worker, default `false`) — kill-switch global. Si `false`, orchestration step skipea + cron job no emite events.
- `space_notion_sources.meeting_notes_ingest_enabled` (DB flag per-space, default `false`) — opt-in granular. Operador admin lo activa por espacio.
- `NOTION_MEETING_NOTES_BQ_MIRROR_ENABLED` (default `false`, Slice 5) — gate del BQ mirror. PG ingest puede correr sin BQ mirror durante validation.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 0 | Revert audit doc | <5 min | sí |
| Slice 1 | Migration down (DROP table + ALTER DROP column) | <30 min | sí (data loss) |
| Slice 2 | Revert PR — fetcher es additive | <10 min | sí |
| Slice 3 | Disable flag `NOTION_MEETING_NOTES_INGEST_ENABLED=false` + redeploy ops-worker | <5 min | sí |
| Slice 4 | Revert UI PR — endpoints siguen accesibles via API direct | <10 min | sí |
| Slice 5 | Disable BQ mirror flag + revert signals wire-up | <10 min | sí |

### Production verification sequence

1. TASK-880 Slice 4 (version bump) verificado en producción 7d sin regresión → green light TASK-881.
2. Slice 0 audit doc merged.
3. Slice 1 migrations aplicadas en staging → `pnpm migrate:status` verifica + DO blocks pasan + capabilities seedadas + grants en runtime.ts.
4. Slice 2 fetcher merged → tests Vitest 25+ verde + smoke manual contra workspace de test (no producción).
5. Slice 3 reactive projection merged + ops-worker deployado a staging → activar flag en 1 space test (e.g. workspace interno Efeonce) → monitor projection lag + dead-letter durante 48h.
6. Slice 4 UI merged staging → smoke test: registrar meeting note en Notion test space → verificar aparece en UI Greenhouse < 1h post next ingest cycle.
7. Slice 5 BQ mirror activado staging → verificar count parity PG ↔ BQ.
8. Promote a producción con flag global `false` → activar per-space flags 1 a 1 con cooldown 24h entre activaciones para monitorear blast radius.
9. Monitor reliability signals durante 7d post-prod por space.

### Out-of-band coordination required

- Verificar que el endpoint `/v1/blocks/meeting_notes/query` está disponible en el plan Notion del workspace Efeonce + workspaces de clientes Globe (puede requerir Plan tier específico).
- Coordinar con cliente piloto (Sky o equivalente) antes de activar el flag — informar que sus meeting notes se ingieren a Greenhouse + cuál es la retención + cómo se accede al summary completo + audit trail.
- Si Notion AI Meeting Notes requiere consent legal explícito del workspace (depende del plan), gestionar con cliente.
- Comunicar a operadores delivery (PMs) la nueva surface en project drawer + cómo reportar attendees unresolved.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Endpoint contract documentado + verificado live (Slice 0).
- [ ] Schema PG aplicado + capabilities seedadas + grants en runtime.ts + parity test verde.
- [ ] Fetcher canonical funciona contra workspace test + tests Vitest 25+ verde.
- [ ] Reactive projection registrada + dead-letter signal operativo + idempotency probada con re-runs.
- [ ] Orchestration step opcional integrado + flag global respetado.
- [ ] Cloud Scheduler job `ops-notion-meeting-notes-sync` deployado + healthy.
- [ ] UI surfaces operativas (project drawer + delivery dashboard + admin queue) + capability gating server-side verificado.
- [ ] BQ mirror operativo + count parity PG ↔ BQ post 7d.
- [ ] 3 reliability signals registrados + visible en `/admin/operations`.
- [ ] Microcopy es-CL aprobada por skill UX writing.
- [ ] Doc funcional + manual operador + ADR + Delta en spec arquitectónica merged.
- [ ] CLAUDE.md hard rules agregadas + AGENTS.md mirror.
- [ ] Audit log `notion_meeting_notes_access_log` poblado correctamente en cada acceso a `summary_full`.
- [ ] Outbox events `notion.meeting_notes.{fetch_requested,materialized}` documentados en EVENT_CATALOG.
- [ ] Verificación con cliente piloto (Sky o equivalente): meeting note real ingerida + visible en Greenhouse < 1h post evento Notion + attendees correctamente resueltos a members.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test` (full suite — CLAUDE.md task closing quality gate)
- `pnpm build` (Turbopack)
- `pnpm migrate:status` post Slice 1
- Smoke staging: trigger manual ingest via `/api/admin/integrations/notion/meeting-notes-ingest` → assert tabla poblada + outbox event emitido + projection materializada.
- Smoke producción (post per-space activation): verificar UI muestra meeting note real < 1h post evento Notion.
- Manual review reliability dashboard `/admin/operations` post-deploy.
- Manual review audit log `notion_meeting_notes_access_log` post primera invocación de full-summary endpoint.

## Closing Protocol

- [ ] `Lifecycle` sincronizado, archivo en `complete/`
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] Chequeo de impacto cruzado sobre TASK-879 (puede informar V2 con Workers), EPIC-005 (commercial-delivery-orchestrator), futura TASK Pulse digest
- [ ] CLAUDE.md sección "Notion Meeting Notes Ingestion invariants" agregada
- [ ] AGENTS.md mirror
- [ ] Spec arquitectónica `GREENHOUSE_NOTION_DELIVERY_SYNC_V1.md` con Delta
- [ ] ADR en `DECISIONS_INDEX.md`
- [ ] Cliente piloto comunicado + audit log compartido si lo solicitan
- [ ] Doc funcional `docs/documentation/delivery/meeting-notes-canonical.md` v1.0
- [ ] Manual operador `docs/manual-de-uso/delivery/meeting-notes-en-greenhouse.md`

## Follow-ups

- Future TASK — Pulse weekly digest enhancement consume meeting notes para sección "Decisiones clave esta semana".
- Future TASK — ICO factor `meeting_cadence_health` integrado al score formula.
- Future TASK — Nexa context tooling consume VIEW canonical para responder "¿qué pasó esta semana en X?".
- Future TASK — Surface meeting notes en client portal (capability granular client_portal.meeting_notes.read).
- Future TASK — Action items extraction → tasks Greenhouse (bidirectional bridge meeting note → task creation).
- Future TASK — Migrar ingest a Notion Workers si TASK-879 valida la topología (V2 contingente).
- Future TASK — Multi-workspace per space soporte (cuando emerja un space que tenga > 1 workspace fuente).

## Open Questions

- ¿El endpoint Meeting Notes funciona bajo integration token global o requiere PAT scoped per usuario? (verificar Slice 0 — informa decision de cascade default).
- ¿Notion AI Meeting Notes está disponible en el plan actual del workspace Efeonce + workspaces clientes? Si no, esta task espera al upgrade.
- ¿Retención: cuánto tiempo guardamos `summary_full` en PG antes de soft-delete? V1 propone indefinido + soft-delete cuando upstream desaparece. V2 puede agregar TTL configurable.
- ¿Project link inferred merece su propio reliability signal cuando confidence rate baja? V1 omite, V2 si emerge.
- ¿Action items y key decisions deben materializarse en tablas separadas para facilitar consumers downstream (e.g. Pulse)? V1 los deja en JSONB. V2 si emerge query pattern frecuente.
- ¿Necesitamos webhook Notion (cuando estén disponibles) en lugar de polling hourly? Reduciría lag de horas a minutos. Coordinar con TASK-879.

## Delta 2026-05-14

Task creada como follow-on de TASK-880 (Notion API modernization) y como primer consumer real del endpoint nuevo Meeting Notes (lanzado 11-may-2026). Coordina con TASK-879 (research/pilot) — si Workers terminan siendo path canonical, esta ingesta migra como V2.
