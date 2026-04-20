# TASK-544 — Commercial Product Catalog Sync Program

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `umbrella`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `none`
- Branch: `task/TASK-544-commercial-product-catalog-sync-program`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Programa oficial para convertir a Greenhouse en source of truth del catalogo que HubSpot expone como line items. Introduce un modelo de dos capas — autoria (5 catalogos fuente: roles, tools, overhead addons, services, manual) vs distribucion (`product_catalog` como single outbound anchor) — conectadas por reactive materializers y proyeccion outbound hacia HubSpot via Cloud Run. Cierra el gap donde crear un role en Greenhouse no lo hace seleccionable en HubSpot, updates no propagan, y no hay drift detection.

## Why This Task Exists

Hoy `greenhouse_commercial.product_catalog` tiene `hubspot_product_id` y `sync_status` pero nunca se popula desde los 4 source catalogs (`sellable_roles`, `tool_catalog`, `overhead_addons`, `service_pricing`) — solo via CREATE manual o import HubSpot. No hay UPDATE outbound (`create-hubspot-product.ts` crea pero no actualiza), no hay proyeccion reactiva analoga a `quotationHubSpotOutbound`, y no hay drift detection. Consecuencia: cada source catalog vive aislado, HubSpot drifta con cada edit manual, y la promesa "Greenhouse source of truth" no se cumple. Complementa TASK-534 (Party Lifecycle) cerrando el "que" del quote-to-HubSpot end-to-end.

## Goal

- Formalizar el modelo de dos capas sin recrear catalogos fuente.
- Conectar los 4 source catalogs con `product_catalog` via reactive materializer.
- Habilitar outbound Greenhouse → HubSpot reactivo (create + update + archive).
- Implementar drift detection + reconciliation con Admin Center surface.
- Policy strict: productos nacen en Greenhouse; orphans HubSpot se adoptan o borran.
- Entregar backlog ejecutable y ordenado (fases A-E) detras de feature flags.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md` — spec normativo del programa
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` (complementario)
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- `product_catalog` es el unico outbound anchor; no se crea tabla paralela.
- Source catalogs (`sellable_roles`, `tool_catalog`, `overhead_addons`, `service_pricing`) NO se modifican estructuralmente; solo se homogenizan sus eventos.
- Field authority: Greenhouse owns `product_code`, `product_name`, `description`, pricing, `is_archived`; HubSpot owns su id interno.
- Policy strict Greenhouse-origin enforced tras Fase E.
- Archival semantico obligatorio; NO hard delete en HubSpot.
- Rate limit + batch API HubSpot + coalescing de eventos para evitar storming.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`

## Dependencies & Impact

### Depends on

- `docs/architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md` (spec normativo)
- `greenhouse_commercial.product_catalog` (existe, TASK-345)
- `greenhouse_commercial.sellable_roles`, `tool_catalog`, `overhead_addons`, `service_pricing` (existen, TASK-464/TASK-465)
- `hubspot-greenhouse-integration` Cloud Run service
- `quotationHubSpotOutbound` proyeccion como template (TASK-463 cerrada)
- Outbox + reactive worker

### Blocks / Impacts

- TASK-474 (Quote Builder Catalog Reconnection) — desbloquea
- TASK-467 (Pricing Catalog Admin UI) — gana surface de conflict resolution
- TASK-534 (Commercial Party Lifecycle) — complementario (juntos cierran quote-to-HubSpot end-to-end)
- Reporting por product/role/tool — habilita revenue attribution consistente
- Kortex platform — desbloquea modelo unificado para clientes externos

### Files owned

- `docs/tasks/to-do/TASK-545-product-catalog-schema-materializer-foundation.md`
- `docs/tasks/to-do/TASK-546-product-catalog-source-handlers-events.md`
- `docs/tasks/to-do/TASK-547-product-catalog-hubspot-outbound.md`
- `docs/tasks/to-do/TASK-548-product-catalog-drift-detection-admin.md`
- `docs/tasks/to-do/TASK-549-product-catalog-policy-enforcement-cleanup.md`

## Current Repo State

### Already exists

- `greenhouse_commercial.product_catalog` con `hubspot_product_id`, `sync_status`, `sync_direction` (TASK-345)
- `sellable_roles` (ECG-xxx), `tool_catalog` (ETG-xxx), `overhead_addons` (EFO-xxx), `service_pricing` (EFG-xxx)
- Inbound sync `src/lib/hubspot/sync-hubspot-products.ts`
- Outbound CREATE `src/lib/hubspot/create-hubspot-product.ts` (sin UPDATE)
- Patron `quotationHubSpotOutboundProjection` como template
- Cloud Run service + outbox + reactive worker

### Gap

- `product_catalog` NO tiene `source_kind` ni `source_id` que vinculen con los 4 source catalogs
- No existe materializer `sourceToProductCatalog`
- No existe proyeccion `productHubSpotOutbound`
- Cloud Run no tiene `PATCH /products` ni `archive`
- No existen custom properties HubSpot `gh_product_code`, `gh_source_kind`, `gh_last_write_at`, `gh_archived_by_greenhouse`
- No existe `product_sync_conflicts` table ni drift cron
- Source catalogs no emiten eventos homogeneizados `.created`, `.updated`, `.deactivated`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema + materializer foundation

- Crear `TASK-545` (Fase A): DDL extension (`source_kind`, `source_id`, `is_archived`, `archived_at`, `last_outbound_sync_at`, `gh_owned_fields_checksum`), tabla `product_sync_conflicts`, scaffolding del materializer, backfill `source_kind`/`source_id` heuristico por `product_code` prefix.

### Slice 2 — Source handlers + event homogenization

- Crear `TASK-546` (Fase B): auditar eventos de cada source, homogenizar contrato, implementar 4 handlers (`sellable-role-to-product`, `tool-to-product`, `overhead-addon-to-product`, `service-to-product`), activar materializer detras de sub-flags por source.

### Slice 3 — Outbound proyeccion + Cloud Run endpoints

- Crear `TASK-547` (Fase C): Cloud Run gana `POST /products`, `PATCH /products/:id`, `POST /products/:id/archive`, `GET /products/reconcile`; custom properties HubSpot creadas; proyeccion `productHubSpotOutbound`; anti-ping-pong guard; tests E2E.

### Slice 4 — Drift detection + Admin Center

- Crear `TASK-548` (Fase D): cron nocturno reconciler, `/admin/commercial/product-sync-conflicts` UI, auto-heal para casos seguros, alertas Slack ops.

### Slice 5 — Policy enforcement + legacy cleanup

- Crear `TASK-549` (Fase E): deprecar inbound auto-adopt, remover `sync_direction='hubspot_only'` enum, cleanup de flags, runbook + doc funcional.

## Out of Scope

- Recrear source catalogs.
- Cambios al contrato de `quotation_line_items` (sigue usando `product_id` FK).
- Pricing discovery / product recommendation (roadmap Nexa).
- Multi-portal HubSpot disambiguation (open question — diferida).
- Migration de nomenclatura SKU (ECG/ETG/EFO/EFG/PRD se mantienen).

## Detailed Spec

Programa oficial en 5 fases (A-E) con dependencias causales. Todas bloqueadas por Fase A (schema).

### Orden de ejecucion

1. `TASK-545` (Fase A) — Foundation schema + scaffolding. **Bloqueante.**
2. `TASK-546` (Fase B) — Source handlers. Depende de A.
3. `TASK-547` (Fase C) — Outbound + Cloud Run. Depende de A; puede paralelo a B si hay coordinacion.
4. `TASK-548` (Fase D) — Drift detection + Admin. Depende de A, C.
5. `TASK-549` (Fase E) — Policy enforcement + cleanup. Depende de todas las anteriores + ≥4 semanas en production.

### Decisiones arquitectonicas cerradas por esta umbrella

- **Extension, no reemplazo**: columnas nuevas sobre `product_catalog`; source catalogs intactos.
- **SKU canonico como business key**: `gh_product_code` custom HubSpot sobrevive recreaciones del id interno.
- **Archival semantico**: no hard delete; quotes historicas preservadas.
- **Policy strict Greenhouse-origin**: productos nacen en Greenhouse; orphans en HubSpot se adoptan o borran via Admin.
- **Field authority**: Greenhouse owns pricing/name/description/code; HubSpot solo owns id interno.
- **Feature flags por source**: rollout incremental roles → tools → overheads → services.

### Preguntas abiertas declaradas

Las 7 open questions del spec §15 quedan heredadas por este programa:

1. Variants granularity (on-demand vs siempre)
2. Inbound deprecation timing
3. Pricing effective-dated vs live snapshot
4. Multi-currency products en HubSpot
5. Archive vs delete policy
6. Service composition complex products (bundle HubSpot)
7. Performance del materializer + coalescing

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existen las 5 tasks hijas TASK-545 a TASK-549 registradas en `TASK_ID_REGISTRY.md` y `README.md`.
- [ ] Cada task hija referencia `GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md` como spec normativo.
- [ ] Dependencia causal (A → B/C → D → E) explicita en cada task.
- [ ] Cada fase declara feature flag y condicion de rollback.
- [ ] Al cerrar el programa, todas las hijas estan en `complete` y las 7 open questions tienen respuesta documentada.

## Verification

- revision manual del programa y dependencias
- confirmacion de IDs en `docs/tasks/TASK_ID_REGISTRY.md`
- confirmacion de index en `docs/tasks/README.md`
- spec `GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md` coherente con lo implementado al cierre de cada fase

## Closing Protocol

- [ ] `Lifecycle` sincronizado con estado real
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con decisiones y learnings
- [ ] `changelog.md` registra contrato nuevo de product catalog sync
- [ ] Chequeo de impacto cruzado (TASK-474, TASK-467, TASK-534, Kortex)

## Follow-ups

- `TASK-545` Fase A — Schema extension + materializer foundation
- `TASK-546` Fase B — Source handlers + event homogenization
- `TASK-547` Fase C — Outbound projection + Cloud Run endpoints
- `TASK-548` Fase D — Drift detection + Admin Center
- `TASK-549` Fase E — Policy enforcement + legacy cleanup

## Open Questions

Heredadas del spec §15:

1. Variants granularity on-demand vs always → resolver en TASK-546.
2. Inbound deprecation timing (4 semanas en prod) → resolver en TASK-549.
3. Pricing effective-dated vs live → resolver en TASK-547 o diferir.
4. Multi-currency products en HubSpot (tier Enterprise) → decidir en TASK-547.
5. Archive vs delete policy → spec recomienda archive; confirmar en TASK-547.
6. Service composition bundle en HubSpot → diferir a TASK-546 o programa futuro.
7. Coalescing de eventos (performance) → TASK-546 o TASK-547 segun aparezca.
