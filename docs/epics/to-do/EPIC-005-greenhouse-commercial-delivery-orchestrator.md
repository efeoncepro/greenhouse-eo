# EPIC-005 — Greenhouse como orquestador canónico Commercial↔Delivery (sync HubSpot↔Notion)

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `cross-domain` (commercial + delivery + integrations)
- Owner: `unassigned`
- Branch: `epic/EPIC-005-greenhouse-commercial-delivery-orchestrator`
- GitHub Issue: `—`

## Summary

Convertir a Greenhouse EO en el **orquestador canónico** del flujo bidireccional entre HubSpot y Notion, reemplazando el sibling `cesargrowth11/notion-hubspot-sync` (2 Cloud Functions, 2711 LOC, polling 15-min, mappings hardcoded, watermark drift, race conditions padre/hijo). La tesis: Greenhouse YA es source-of-truth tanto del lado commercial (`greenhouse_commercial.deals`, `organizations`, `party_lifecycle_events`) como del lado delivery (`greenhouse_delivery.projects`, `tasks`, `sprints`) — y ya tiene todo el contexto de negocio, governance, identity mapping y motor Notion (via `notion-bigquery`) que el sibling no tiene. El sibling es sync raw sin contexto; Greenhouse puede decidir con stage del deal, lifecycle de la org, capabilities y approvals. Alcance: **deals + tasks + companies + contacts**, con admin surface con preview para monthly project auto-provisioning, conflict resolution policy basada en state-machine del deal (+ LWW fallback para campos no-locked), integración Notion dedicada con write scope, y estrategia real-time híbrida (webhooks + reconciliation polling + full-sync on demand). Cutover de un tirón con 48h rollback window.

## Why This Epic Exists

### El sibling actual no está funcionando bien

El usuario reportó 2026-04-23 que la orquestación Notion↔HubSpot no anda fina. Evidencia concreta en el repo hermano `cesargrowth11/notion-hubspot-sync`:

- **Polling 15-min**: cualquier edit que ocurre dentro de una ventana y vuelve a tocarse antes del próximo poll se pierde; el sibling tiene `SYNC_OVERLAP_SECONDS` configurable como curita.
- **Race padre/hijo**: `main.py` reverse sync tiene lógica explícita para "evitar doble proceso si padre e hijo cambiaron en la misma ventana". Eso es un patch, no una solución.
- **Mappings hardcoded**: 6 diccionarios Python atados a código (`NOTION_TO_HS_OWNER`, `NOTION_STATUS_TO_DEALSTAGE`, `NOTION_STATUS_TO_TASK_STATUS`, `NOTION_PRIORITY_TO_HS`, `NOTION_TO_HUBSPOT_LINEA_DE_SERVICIO`, `NOTION_TO_HUBSPOT_SERVICIOS_ESPECIFICOS`). Cualquier nuevo owner o status requiere PR + deploy.
- **Watermark drift**: watermarks separados por stream (deals, tasks, reverse, forward) en BigQuery. Cuando un poll falla a mitad, el watermark queda en un estado ambiguo que requiere intervención manual.
- **Sin source of truth**: ambos sistemas mutan independientes; no hay nadie que decida "Notion dice A, HubSpot dice B, el canonical es C".
- **Monthly project auto-provisioning** (`forward_sync/services/project_resolution.py`): lógica de negocio crítica (cuándo crear un proyecto Notion nuevo vs reutilizar uno existente) viviendo lejos del canonical.

### Greenhouse ya tiene lo que necesita para orquestar

Post TASK-571/572/573/574/575, el monorepo reúne todos los habilitantes. Más importante aún: Greenhouse tiene **contexto de negocio completo** que el sibling no tiene — historia del cliente, motor Notion validado, decision layer canónico.

- **Canonical commercial state**: `greenhouse_commercial.deals` con mirror de deals HubSpot + `hubspot_deal_pipeline_config` + `hubspot_deal_pipeline_defaults` + `hubspot_deal_property_config` para governance.
- **Canonical party state**: `greenhouse_core.organizations` con `lifecycle_stage` + history en `commercial.party_lifecycle_events` + `commercialParty*` events ya en catalog (`commercial.party.created/promoted/demoted/lifecycle_backfilled`). El orchestrator proyecta companies como consumer de estos events — no requiere declarar events nuevos.
- **Canonical delivery state**: `greenhouse_delivery.projects`, `greenhouse_delivery.tasks`, `greenhouse_delivery.sprints` alimentados hoy por `notion-bigquery` sync (read-only). El motor Notion API (rich text, relations, rollups, multi-select) está validado y testeado — el orchestrator reusa esa capa en lugar de duplicar como hace el sibling (`forward_sync/clients/notion.py`, 250 LOC duplicados).
- **Bridge HTTP absorbido** (post TASK-574): `services/hubspot_greenhouse_integration/` en el monorepo con 17 rutas — ya sabe cómo escribir a HubSpot con idempotencia + signature webhook validation. El epic agrega routes Notion-write en el mismo servicio.
- **Outbox pattern**: `commercial_outbox` + eventos `commercial.deal.created/synced/stage_changed/won/lost/created_from_greenhouse/create_requested/create_approval_requested` ya live post TASK-540.
- **Reactive workers**: `ops-worker` ya procesa outbox events en Cloud Run, con crons `ops-reactive-process` 5-min.
- **Identity mapping foundation**: `identity_profile_source_links` mapea HubSpot users ↔ Efeonce persons. Extenderlo a `source_system='notion'` es una fila por persona — canonical ya cubre el patrón para otros source systems.
- **Decision layer real**: `promoteParty` + lifecycle state machine + capability gating + approval thresholds (TASK-539 pattern). Greenhouse puede hacer conflict resolution con contexto de negocio; el sibling solo puede comparar timestamps.
- **Governance pattern**: TASK-571/573 introdujeron `hubspot_*_config` tables como registry admin-gobernable. El Mapping Registry de TASK-578 extiende ese mismo patrón, no crea infra nueva.

### Qué cambia la topología con este epic

```
ANTES (hoy):

  HubSpot  ◄──── polling 15min ────►  Notion
                      │
                      └─► BigQuery (via hubspot-bigquery + notion-bigquery)
                      └─► Greenhouse (via HTTP bridge, solo deals)

DESPUÉS (post-EPIC-005):

  HubSpot  ◄── webhooks + HTTP ──►  Greenhouse  ◄── HTTP + polling ──►  Notion
                                        │
                                        ├─ canonical state (PG + BQ)
                                        ├─ outbox events
                                        ├─ conflict resolution policy
                                        └─ reactive workers que proyectan
```

Resultado: todo cambio pasa por Greenhouse. Ningún flujo directo HubSpot↔Notion. El sibling queda retired.

## Outcome

- Greenhouse decide qué fluye entre HubSpot y Notion con policy state-machine explícita (no heurísticas ocultas en Python).
- Scope 4 entidades: **deals + tasks + companies + contacts**. Companies via `commercial.party.*` events existentes. Contacts como subset de `commercial.deal.*` (no requieren events nuevos — proyectados via `primary_contact_identity_profile_id` resuelto a través de `identity_profile_source_links`).
- Estrategia real-time **híbrida**: Notion webhooks como primary (0-5s lag), reconciliation polling cada 6h como safety net, full-sync admin command para disaster recovery.
- Una sola integration Notion dedicada (`Greenhouse Commercial-Delivery Orchestrator`) con read+write scope, secretos separados staging/prod, grant per-DB (no workspace-wide). `notion-bigquery` integration queda intacta para daily ingestion.
- Mappings (6 diccionarios hardcoded del sibling) viven como tablas admin-gobernables en `greenhouse_commercial.*_mapping`.
- Monthly project auto-provisioning queda como **surface admin con preview + approve-to-commit** en Admin Center (nuevo), no auto-silent como hoy.
- Cutover **de un tirón** con 48h rollback window: schedulers del sibling pausados, código vivo, listo para re-activar si hay regresión.
- Documentación funcional nueva: `docs/documentation/delivery/orquestacion-commercial-delivery.md`.
- El sibling `notion-hubspot-sync` archiva el código antiguo con stub README apuntando a Greenhouse tras los 48h sin regresión.

## Existing Related Work

- **TASK-574** (en to-do) — Absorber el Cloud Run `hubspot-greenhouse-integration` al monorepo. Es prerequisito natural: el write bridge HubSpot ya vive en `services/` cuando este epic empieza.
- **TASK-575** (en to-do) — Upgrade HubSpot Developer Platform + API calls a 2026.03. Baja riesgo de breaking changes upstream durante la ejecución del epic.
- **TASK-540** (complete) — HubSpot Lifecycle Outbound Sync. Definió el patrón outbox + reactive worker que este epic reusa para la projection a Notion.
- **TASK-571/572/573** (complete) — Deal creation context + `POST /deals` + deal birth contract. Garantizan que el canonical de `commercial.deals` está completo.
- **`notion-bigquery`** (sibling vivo) — ingestion one-way de Notion a BQ. Sigue siendo útil como observability layer; este epic no lo toca.

## Child Tasks (6 tareas propuestas; scope y decisiones acordadas 2026-04-23)

### TASK-577 — Notion Write Bridge (HTTP service)

Agregar capacidad de escritura a Notion al servicio absorbido en `services/hubspot_greenhouse_integration/` (post TASK-574) con endpoints:

- `POST /notion/tasks` — crear task (deal parent o subtask)
- `PATCH /notion/tasks/<page_id>` — actualizar task (status, owner, props, contact field)
- `POST /notion/companies` — crear/upsert company en Notion Companies DB
- `PATCH /notion/companies/<page_id>` — actualizar company props
- `POST /notion/projects` — crear proyecto mensual
- `GET /notion/projects/current` — resolver proyecto mensual vigente
- `POST /notion/full-sync` — admin-only, gatilla full-sync on demand (disaster recovery)

Slice preliminar: **bootstrap de la integration Notion dedicada** (`Greenhouse Commercial-Delivery Orchestrator`, read+write scope, grant per-DB, secretos `notion-orchestrator-token-{staging,prod}` en Secret Manager, runbook en `scripts/bootstrap-notion-orchestrator-integration.md`).

Delta 2026-05-14: antes de implementar este bridge como Cloud Run/Python definitivo, `TASK-879` debe decidir si Notion Developer Platform Workers cubren parte de writes, webhooks o agent tools. EPIC-005 sigue requiriendo write capability, pero el runtime puede terminar siendo Cloud Run, Worker o mixto.

Decisión en Discovery: ¿renombrar el servicio a `commercial_delivery_bridge` dado que el scope ya no es solo HubSpot? Inclinación: **sí** — el nombre actual engaña. Sujeto a verificar que no rompa references.

Effort: Medio.

### TASK-578 — Canonical Mapping Registry (incluye identity extension Notion)

Mover los 6 diccionarios hardcoded del sibling a tablas en `greenhouse_commercial` + extender `identity_profile_source_links` con `source_system='notion'`. Siguiendo el patrón `hubspot_*_config` que introdujo TASK-571/573.

Slices:

1. **Identity extension**: `identity_profile_source_links` acepta `source_system='notion'` + seed inicial desde `NOTION_TO_HS_OWNER` actual resuelto via HubSpot user id ↔ Notion user id.
2. Tablas de mapping canónicas (admin-gobernables):
   - `commercial_deal_stage_mapping` (Notion task status ↔ HubSpot dealstage)
   - `commercial_task_status_mapping`
   - `commercial_priority_mapping`
   - `commercial_business_line_mapping` (Notion "Línea de Servicio" ↔ `linea_de_servicio`)
   - `commercial_service_module_mapping` (Notion "Servicios Específicos" ↔ `servicios_especificos`)
   - `commercial_contact_role_mapping` (Notion contact role ↔ HubSpot contact property, para proyección de contacts)
3. Seed inicial con valores hardcoded actuales, reader + validator en `src/lib/commercial/mappings-store.ts`.

Admin UI declarada como **follow-up** (no entra en V1); V1 es SQL + admin API endpoint de refresh.

Effort: Medio.

### TASK-579 — Forward Orchestrator: Commercial → Delivery

Reactive worker en `ops-worker` suscrito a outbox events, proyectando a Notion via Write Bridge (TASK-577) + Mapping Registry (TASK-578). Cubre **deals + tasks + companies + contacts**.

**Deals → Notion Tareas DB** (parent tasks):

- `commercial.deal.created` / `commercial.deal.created_from_greenhouse` → crear parent task en proyecto mensual resuelto
- `commercial.deal.synced` / `commercial.deal.stage_changed` → update state en parent existente via mapping
- `commercial.deal.won` / `commercial.deal.lost` → transición terminal

**Companies → Notion Companies DB** (nueva, o existente si ya vive en workspace):

- `commercial.party.created` → crear company
- `commercial.party.promoted` / `commercial.party.demoted` → update lifecycle
- `organization.updated` → update props
- `crm.company.lifecyclestage_changed` → update lifecycle stage

**Contacts** (subset de `commercial.deal.*`, sin events nuevos):

- Al proyectar deal, leer `primary_contact_identity_profile_id` del deal → resolver via `identity_profile_source_links` → proyectar nombre/email/role al campo "Contact" del Notion task.
- Follow-up post-MVP: contacts independientes sin deal asociado.

Usa conflict resolution state-machine (ver Decisiones Arquitectónicas abajo).

Effort: Alto.

### TASK-580 — Reverse Orchestrator: Delivery → Commercial (hybrid real-time)

Canonicalization inbound de cambios Notion. **Estrategia híbrida**:

- **Primary: Notion webhooks** → webhook endpoint nuevo en `services/hubspot_greenhouse_integration/` (ex `commercial_delivery_bridge`), signature validation análoga al `/webhooks/hubspot` existente, canonicalization en `greenhouse_delivery.*` + emit de `delivery.task.updated/project.updated` eventos (nuevos — declarar en catalog)
- **Safety net: reconciliation polling** — cron cada 6h que re-pollea Notion desde `greenhouse_delivery.sync_watermarks` en Postgres, reconcilia cualquier cambio que el webhook haya perdido. Volumen esperado: bajo (un solo worker canonical en lugar de 2 Cloud Functions).
- **Recovery: full-sync on demand** — admin-triggered via `POST /notion/full-sync` del bridge, útil para bootstrap + disaster recovery.

Cambios Notion → canonical → outbox event → reactive worker separado decide si proyecta a HubSpot (via Write Bridge HubSpot absorbido) según la policy de conflict resolution.

Gate de Discovery: **verificar Notion webhooks availability** para DBs activas (Tareas, Proyectos, Companies, Contacts). Si NO existen para alguna DB, degrada graceful a polling-only para esa DB específica; el resto sigue híbrido.

Effort: Alto.

### TASK-581 — Cutover de un tirón + sibling retirement + docs

**Cutover atómico** (no hay ventana paralelo):

- Staging validation profunda: ≥1 ciclo completo simulado, parity check vs sibling output.
- Production cutover: deploy en Greenhouse orchestrators + pausar Cloud Scheduler jobs del sibling (`notion-hubspot-reverse-poll` + `hubspot-notion-deal-poll`) en la misma ventana.
- **48h rollback window**: Cloud Functions del sibling quedan live pero sin schedule; re-activables con `gcloud scheduler jobs resume` si hay regresión grave.
- Post-48h sin regresión: eliminar Cloud Functions + BQ datasets del sibling + stub README en el repo apuntando a Greenhouse.

Docs:

- `docs/documentation/delivery/orquestacion-commercial-delivery.md` (nueva)
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md` sección 3 re-scoped (sibling queda solo como referencia histórica)
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md` agrega la integration Notion + cadencia de rotación
- `AGENTS.md` + `CLAUDE.md` + `.codex/` actualizados

Effort: Medio.

### TASK-582 — Monthly Project Provisioning Admin Surface with Preview

Nueva vista en Admin Center reemplazando el auto-silent del sibling (`forward_sync/services/project_resolution.py`):

- **Preview** del próximo mes: qué deals van a generar qué proyectos Notion, qué subtareas, qué owners resueltos — todo derivable del canonical state.
- **Override manual**: skip, merge con proyecto existente, forzar nombre.
- **Approve-to-commit**: el orchestrator ejecuta solo tras aprobación; antes de eso no hay proyección.
- **Log auditable**: cada provisioning queda registrado con quién aprobó + con qué override.
- Capability gate: `commercial.project_provisioning.approve` (nueva, declarar en entitlements catalog).

Effort: Medio.

### TASK-882 — Nexa Tools as Notion Workers (agent angle pillar, agregada 2026-05-15)

Agregada como child task del epic post TASK-879 Slice 4 verdict (2026-05-15) que identificó el use case "Tools para External Agents API / Nexa-in-Notion" como el más alto-valor donde Notion Workers ganan sobre Cloud Run. Materializa el angle "agent" del epic — el orquestador no solo sincroniza state Commercial↔Delivery, también expone capabilities consumibles desde Notion via Nexa.

- 3-5 tools read-only V1 (`getProjectIco`, `getSprintHealth`, `getLastMeetingSummary`, `getProjectStatus`, `getMyAssignments`) deployadas como Notion Workers en workspace Efeonce.
- Identity bridge canonical: PM Greenhouse invoca `@Nexa <command>` desde Notion → Worker resuelve `notion_user_id → member_id` reusando TASK-877 → endpoint Greenhouse respeta capability boundaries del caller real.
- Schema PG `notion_worker_api_tokens` separado de `notion_personal_access_tokens` (TASK-880) por shape distinto (Worker token NO atado a operador humano, atado a Worker ID + lifecycle).
- 3 capabilities granulares (`integrations.notion.worker.{invoke,register_token,revoke_token}`) + 2 reliability signals (`tool_failure_rate` + `tool_latency_p95`) + 1 V2 contingente (`credits_burn_rate` post 11-ago-2026).
- Coordina con TASK-671 (Nexa Teams bot) — multi-channel coexistence; las 2 canales son additive.
- Bloqueada por TASK-880 (cliente canonical) + External Agents API GA (alpha al 2026-05-13) + decisión pricing post 11-ago-2026.

Effort: Alto. Spec: `docs/tasks/to-do/TASK-882-nexa-tools-as-notion-workers.md`.

## Decisiones Arquitectónicas (resueltas 2026-04-23)

| Decisión | Resolución |
|---|---|
| **Scope del epic** | 4 entidades: deals + tasks + companies + contacts. Companies via `commercial.party.*` events existentes. Contacts como subset de `commercial.deal.*` (vía `primary_contact_identity_profile_id` + `identity_profile_source_links`), no eventos nuevos. |
| **Monthly project auto-provisioning** | Admin surface con preview + approve-to-commit (TASK-582). No auto-silent como hoy. |
| **Cutover strategy** | De un tirón con 48h rollback window. Sin ventana paralelo de 2 semanas. |
| **Real-time strategy** | Híbrida: Notion webhooks primary (0-5s lag) + reconciliation polling cada 6h (safety net) + full-sync admin command (recovery). Watermark en Postgres `greenhouse_delivery.sync_watermarks`. Feasibility de webhooks se verifica en Discovery de TASK-580 per-DB; si falta para alguna DB, degrada graceful a polling-only para esa. |
| **Notion integration** | Una dedicada: `Greenhouse Commercial-Delivery Orchestrator`, read+write scope, grant per-DB (no workspace-wide), secretos separados staging/prod, rotación trimestral alineada con `ops-worker`. `notion-bigquery` integration queda intacta para daily ingestion. Runbook scriptado en `scripts/bootstrap-notion-orchestrator-integration.md`. |
| **Conflict resolution policy** | **State-machine por deal stage + LWW fallback para campos no-locked**: la state-machine define qué campos son inmutables en cada stage (ej. deal `closedwon` → `amount` + `dealstage` locked desde Notion, pero descripción y owner siguen editables). Los no-locked usan last-writer-wins por campo con timestamp canonical. Reglas viven en el Mapping Registry (TASK-578). |
| **Contact events** | No se declaran `commercial.contact.*`. Contacts proyectados como subset de `commercial.deal.*` events — cleaner scope, mismo outcome funcional. |
| **Notion Companies/Contacts DBs** | Si no existen en workspace, TASK-580 incluye slice "Notion schema bootstrap" que las crea via write bridge. Verificación en Discovery. |

## Open Questions remanentes (no bloqueantes)

- **Notion webhooks per-DB availability**: verificar en Discovery de TASK-580 por cada DB (Tareas, Proyectos, Companies si existe, Contacts si existe). No bloquea el epic — la estrategia híbrida degrada graceful.
- **Renaming del servicio absorbido** (`hubspot_greenhouse_integration` → `commercial_delivery_bridge`): decisión en Discovery de TASK-577. Inclinación: sí, pero sujeto a verificar impacto de references.
- **Notion Companies + Contacts DBs existence**: verificar en Discovery de TASK-580 si existen en el workspace Efeonce. Si no, slice "Notion schema bootstrap" las crea via write bridge.

## Blocking Considerations

- **No hay Notion write bridge hoy**. Ese es el primer milestone (TASK-577). Todo lo demás depende de que Greenhouse pueda escribir a Notion.
- **Tests en sibling (603 LOC)**: muchos tests del sibling describen invariantes del flujo que deben preservarse. Portarlos como integration tests en el monorepo es parte del scope de TASK-579 + TASK-580.
- **Risk de drift durante la ejecución**: si alguien edita el sibling en medio de la migración, el canonical se vuelve instable. Recomendado freeze explícito del sibling (PR block) durante TASK-579/580 + cutover.
- **Observabilidad**: hoy el sibling loguea a BQ. El nuevo stack debería mantener paridad en logs operativos; `Handoff.md` + Sentry + Cloud Logging del ops-worker cubren eso, verificar en Discovery.

## Validation / Definition of Done

- Staging: ≥1 ciclo completo simulado con parity check vs sibling output antes del cutover production.
- Cloud Scheduler jobs del sibling (`notion-hubspot-reverse-poll` + `hubspot-notion-deal-poll`) pausados en la ventana de cutover; sin tráfico en 48h de rollback window.
- Post-48h sin regresión: Cloud Functions + BQ datasets del sibling retirados.
- Todo deal HubSpot creado post-cutover refleja correctamente en Notion via Greenhouse orchestrator, incluyendo contact resuelto desde `identity_profile_source_links`.
- Toda edit Notion post-cutover refleja en HubSpot via reverse orchestrator, respetando la state-machine policy (campos locked según stage del deal).
- Companies (Notion Companies DB) reflejan correctamente los eventos `commercial.party.*`.
- Monthly project provisioning corre via admin surface con preview, no auto-silent.
- `docs/documentation/delivery/orquestacion-commercial-delivery.md` publicada.
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md` actualizada: `notion-hubspot-sync` removido como source-of-truth del write flow.
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md` documenta la integration Notion dedicada + rotación trimestral.
- Todos los 6 diccionarios hardcoded del sibling tienen equivalente en tablas canónicas consultables por SQL.
- `identity_profile_source_links` acepta `source_system='notion'` con seed inicial.
- Tests integration en monorepo cubren al menos los escenarios que cubrían los 603 LOC del sibling.

## Follow-ups declarados (post-EPIC)

- Admin UI para mapping registry (CRUD sobre las 6 tablas) — V1 es SQL-only + admin API endpoint de refresh.
- Contacts independientes (Notion contact edits sin deal asociado que deban proyectarse a HubSpot) — MVP cubre solo contacts como subset de deals.
- Extender el patrón orchestrator a otros syncs del ecosistema si aplica: `notion-teams`, `notion-frame-io` podrían orquestarse desde Greenhouse también — evaluar caso por caso.
- Real-time full (eliminar reconciliation polling si los Notion webhooks demuestran reliability ≥99.9% sostenido por 90 días).
