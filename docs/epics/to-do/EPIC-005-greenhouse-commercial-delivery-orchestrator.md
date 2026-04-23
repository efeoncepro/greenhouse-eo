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

Convertir a Greenhouse EO en el **orquestador canónico** del flujo bidireccional que hoy ocurre entre HubSpot y Notion vía el sibling `cesargrowth11/notion-hubspot-sync`. Ese sibling corre dos Cloud Functions en polling 15-minutal, con 2711 LOC de Python, mappings hardcoded (owner, status, deal stage, línea de servicio, servicios específicos, prioridad), y un historial documentado de race conditions padre/hijo + watermark drift + edits perdidos en ventanas concurrentes. En lugar de fix-in-place sobre un diseño que ya no escala, este epic promueve a Greenhouse de observador pasivo a source-of-truth activa: HubSpot writes → canonicalization en `greenhouse_commercial.*` → outbox events → reactive projection a Notion (y viceversa con inversa), usando infraestructura que Greenhouse ya tiene (canonical deals post TASK-571/573, outbox pattern en `ops-worker`, bridge HTTP absorbido post TASK-574). Objetivo operativo: un solo lugar que decide qué fluye entre sistemas, con conflict resolution policy explícita, sin polling ciego.

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

Post TASK-571/572/573/574/575, el monorepo reúne todos los habilitantes:

- **Canonical commercial state**: `greenhouse_commercial.deals` con mirror de deals HubSpot + `hubspot_deal_pipeline_config` + `hubspot_deal_pipeline_defaults` + `hubspot_deal_property_config` para governance.
- **Canonical delivery state**: `greenhouse_delivery.projects`, `greenhouse_delivery.tasks`, `greenhouse_delivery.sprints` alimentados hoy por `notion-bigquery` sync (read-only).
- **Bridge HTTP absorbido** (post TASK-574): `services/hubspot_greenhouse_integration/` en el monorepo con 17 rutas — ya sabe cómo escribir a HubSpot con idempotencia + signature webhook validation.
- **Outbox pattern**: `commercial_outbox` + eventos `commercial.deal.created/updated/stage_changed/lost/won` ya live post TASK-540.
- **Reactive workers**: `ops-worker` ya procesa outbox events en Cloud Run, con crons `ops-reactive-process` 5-min.
- **Identity mapping foundation**: `identity_profile_source_links` existe para mapear HubSpot users ↔ Efeonce persons; extenderlo a Notion users es incremental.

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

- Greenhouse decide qué fluye entre HubSpot y Notion con policy explícita (no heurísticas ocultas en Python).
- Cero polling paralelo — un solo worker Greenhouse hace canonicalization inbound de Notion (reemplaza reverse sync del sibling).
- Webhooks HubSpot (ya absorbidos post TASK-574) disparan projection a Notion vía outbox + reactive worker.
- Mappings (`NOTION_TO_HS_OWNER`, etc.) viven como tablas admin-gobernables en Postgres, no como diccionarios en código.
- Monthly project auto-provisioning queda como surface admin con regla canónica editable.
- Cutover retira las 2 Cloud Functions del sibling + sus 2 schedulers + 2 datasets BQ (watermarks quedan en canonical).
- Documentación funcional nueva: `docs/documentation/delivery/orquestacion-commercial-delivery.md`.
- El sibling `notion-hubspot-sync` archiva el código antiguo con stub README apuntando a Greenhouse.

## Existing Related Work

- **TASK-574** (en to-do) — Absorber el Cloud Run `hubspot-greenhouse-integration` al monorepo. Es prerequisito natural: el write bridge HubSpot ya vive en `services/` cuando este epic empieza.
- **TASK-575** (en to-do) — Upgrade HubSpot Developer Platform + API calls a 2026.03. Baja riesgo de breaking changes upstream durante la ejecución del epic.
- **TASK-540** (complete) — HubSpot Lifecycle Outbound Sync. Definió el patrón outbox + reactive worker que este epic reusa para la projection a Notion.
- **TASK-571/572/573** (complete) — Deal creation context + `POST /deals` + deal birth contract. Garantizan que el canonical de `commercial.deals` está completo.
- **`notion-bigquery`** (sibling vivo) — ingestion one-way de Notion a BQ. Sigue siendo útil como observability layer; este epic no lo toca.

## Child Tasks (propuesta inicial, ajustable)

### TASK-577 — Notion Write Bridge (HTTP service)

Agregar capacidad de escritura a Notion al servicio absorbido en `services/hubspot_greenhouse_integration/` (o crear un módulo `notion_client.py` hermano) con endpoints:

- `POST /notion/tasks` — crear task
- `PATCH /notion/tasks/<page_id>` — actualizar task (status, owner, props)
- `POST /notion/projects` — crear proyecto mensual
- `GET /notion/projects/current` — resolver proyecto mensual vigente

Considerar: renombrar el servicio absorbido a algo más amplio (`commercial_delivery_bridge`) si el scope ya no es solo HubSpot. Decisión en Discovery de la task.

Effort: Medio.

### TASK-578 — Canonical Mapping Registry

Mover los 6 diccionarios hardcoded del sibling a tablas en `greenhouse_commercial` o `greenhouse_delivery`:

- `hubspot_notion_owner_map` (HubSpot user id ↔ Notion user id, derivable de `identity_profile_source_links`)
- `deal_stage_mapping` (Notion task status ↔ HubSpot dealstage, con dirección explícita)
- `task_status_mapping` (Notion task status ↔ HubSpot task status)
- `priority_mapping` (Notion priority ↔ HubSpot priority)
- `business_line_mapping` (Notion "Línea de Servicio" ↔ `linea_de_servicio` HubSpot custom property)
- `service_module_mapping` (Notion "Servicios Específicos" ↔ `servicios_especificos`)

Seed inicial con los valores hardcoded actuales. Admin surface opcional (follow-up) o SQL-only.

Effort: Medio.

### TASK-579 — Forward Orchestrator: Commercial → Delivery (HubSpot → Notion)

Reactive worker en `ops-worker` suscrito a eventos de outbox:

- `commercial.deal.created` → crear parent task en Notion en el proyecto mensual correspondiente (resuelve via `resolveMonthlyProject` canónico)
- `commercial.deal.updated` → update de props en el parent task existente
- `commercial.deal.stage_changed` → map stage ↔ Notion status via mapping registry
- `commercial.deal.lost` / `commercial.deal.won` → transición terminal en Notion

Reemplaza el forward_sync del sibling. Usa el Notion Write Bridge (TASK-577) + Mapping Registry (TASK-578).

Effort: Alto.

### TASK-580 — Reverse Orchestrator: Delivery → Commercial (Notion → HubSpot)

Polling worker (Notion no tiene webhooks robustos para las dbs que usamos, a verificar en Discovery) que:

- Pollea Notion cada 5 min (no 15) buscando cambios desde watermark canónico en `greenhouse_delivery.sync_watermarks`
- Canonicaliza cambios en `greenhouse_delivery.tasks` / `greenhouse_delivery.projects`
- Emite eventos `delivery.task.updated` / `delivery.project.updated`
- Otro reactive worker suscrito proyecta a HubSpot via el bridge existente (`POST /deals`, custom props update) cuando la policy lo autoriza

Reemplaza el reverse sync del sibling. Conflict resolution policy: **last-writer-wins por campo con timestamp canonical**. Declarado explícito.

Effort: Alto.

Open question crítica: verificar si Notion tiene webhook capability para las dbs activas. Si sí, TASK-580 cambia de "polling worker" a "webhook receiver" — mucho más barato y menos lag.

### TASK-581 — Cutover + sibling retirement + docs

- Deploy forward + reverse orchestrators en paralelo al sibling durante ventana de validación (mínimo 1 semana)
- Comparar logs: todo cambio detectado por ambos sistemas debe converger al mismo estado en ambos lados
- Post-validation: desactivar Cloud Scheduler jobs del sibling (`notion-hubspot-reverse-poll` + `hubspot-notion-deal-poll`)
- Cloud Functions quedan desplegadas pero sin schedule durante 2 semanas más (rollback fácil)
- Después de 2 semanas: eliminar Cloud Functions del sibling, stub README en el repo
- Monthly project auto-provisioning surface admin si decidimos promoverlo desde canonical
- Documentar en `docs/documentation/delivery/orquestacion-commercial-delivery.md`
- Actualizar `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md` sección 3 removiendo `notion-hubspot-sync` como source-of-truth del flow
- Archive del sibling BQ datasets `notion_hubspot_reverse_sync` + `hubspot_notion_sync` (después del rollback window)

Effort: Medio.

## Open Questions (arquitectónicas, resolver antes de Discovery del primer hijo)

1. **Notion API webhooks**: ¿existen webhooks funcionales para las dbs que usamos hoy (`NOTION_TAREAS_DB`, `NOTION_PROYECTOS_DB`)? Si sí, TASK-580 deja de ser polling worker y se vuelve webhook receiver, mismo patrón que el `/webhooks/hubspot` existente. Ahorro concreto: elimina polling + elimina watermark drift. Si no, polling queda pero centralizado en un solo worker.
2. **Conflict resolution policy**: ¿last-writer-wins por campo (con timestamp canonical), canonical-wins (Greenhouse decide siempre), o deal-state-machine controla (certain stages lock certain fields)? Decisión de negocio, no técnica.
3. **Monthly project auto-provisioning**: `forward_sync/services/project_resolution.py` tiene lógica dura (first-business-day del mes, skip archived projects, auto-create on demand). ¿Esa regla vive en Greenhouse canonical con admin surface, o se hardcodea en TASK-579?
4. **Identity mapping completeness**: `identity_profile_source_links` hoy mapea HubSpot ↔ Efeonce persons. ¿Incluye Notion user ids? Si no, ¿lo extendemos como parte de TASK-578 o como dependencia previa?
5. **Watermark storage**: hoy en BQ `sync_watermark`. ¿Migrar a Postgres `greenhouse_delivery.sync_watermarks` (consistente con el resto del canonical) o dejar en BQ por volumetría? Costo diferencial muy bajo — me inclino por Postgres.
6. **Orden de ejecución**: ¿TASK-574 (absorción) debe cerrar ANTES de empezar este epic? Recomendado sí — el write bridge Notion (TASK-577) es más limpio si se agrega al servicio ya en el monorepo. Alternativa: arrancar TASK-577 en paralelo si se mueve primero al sibling y se absorbe después, pero agrega un porting doble.
7. **Mapping registry visibility**: ¿TASK-578 incluye admin UI o queda SQL-only con follow-up para UI? Me inclino por SQL-only + admin API endpoint para refresh, UI como follow-up separado.

## Blocking Considerations

- **No hay Notion write bridge hoy**. Ese es el primer milestone (TASK-577). Todo lo demás depende de que Greenhouse pueda escribir a Notion.
- **Tests en sibling (603 LOC)**: muchos tests del sibling describen invariantes del flujo que deben preservarse. Portarlos como integration tests en el monorepo es parte del scope de TASK-579 + TASK-580.
- **Risk de drift durante la ejecución**: si alguien edita el sibling en medio de la migración, el canonical se vuelve instable. Recomendado freeze explícito del sibling (PR block) durante TASK-579/580 + cutover.
- **Observabilidad**: hoy el sibling loguea a BQ. El nuevo stack debería mantener paridad en logs operativos; `Handoff.md` + Sentry + Cloud Logging del ops-worker cubren eso, verificar en Discovery.

## Validation / Definition of Done

- Cloud Functions del sibling quedan sin tráfico en Cloud Scheduler por ≥ 2 semanas sin regresión.
- Todo deal HubSpot creado en la ventana de validación refleja correctamente en Notion via Greenhouse orchestrator, sin pasar por el sibling.
- Toda edit Notion en la ventana refleja en HubSpot via el reverse orchestrator.
- `docs/documentation/delivery/orquestacion-commercial-delivery.md` publicada.
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md` actualizada: `notion-hubspot-sync` removido como source-of-truth.
- Todos los mappings hardcoded del sibling tienen equivalente en tablas canónicas consultables por SQL.
- Tests integration en monorepo cubren al menos los escenarios que cubrían los 603 LOC del sibling.
- BQ datasets del sibling archivados o apagados.

## Follow-ups declarados (post-EPIC)

- Admin UI para mapping registry (CRUD sobre las 6 tablas).
- Extender el patrón a otros syncs en el ecosistema (si aplica: `notion-teams`, `notion-frame-io` podrían orquestarse desde Greenhouse también — evaluar caso por caso).
- Real-time Notion webhooks si la evaluación en Discovery concluye que existen.
- Monthly project auto-provisioning como workflow admin con preview + manual approval (hoy es silent auto-create).
