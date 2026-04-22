# TASK-544 — Commercial Product Catalog Sync Program

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `umbrella`
- Epic: `[optional EPIC-###]`
- Status real: `Programa parcialmente implementado`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `TASK-563` + `validacion final en production para TASK-549`
- Branch: `task/TASK-544-commercial-product-catalog-sync-program`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Programa oficial para convertir a Greenhouse en source of truth del catalogo que HubSpot expone como line items. Introduce un modelo de dos capas — autoria (5 catalogos fuente: roles, tools, overhead addons, services, manual) vs distribucion (`product_catalog` como single outbound anchor) — conectadas por reactive materializers y proyeccion outbound hacia HubSpot via Cloud Run. Cierra el gap donde crear un role en Greenhouse no lo hace seleccionable en HubSpot, updates no propagan, y no hay drift detection.

## Progreso

- **Fase A cerrada.** `TASK-545` completada 2026-04-21: DDL extension (9 cols nuevas en `product_catalog`) + tabla `product_sync_conflicts` + backfill heurístico idempotente + scaffolding del materializer. Ver `complete/TASK-545-product-catalog-schema-materializer-foundation.md`.
- **Fase B cerrada.** `TASK-546` completada 2026-04-21: handlers por source, homogenización de eventos y rollout por sub-flags `GREENHOUSE_PRODUCT_SYNC_*`. Ver `complete/TASK-546-product-catalog-source-handlers-events.md`.
- **Fase C cerrada.** `TASK-547` completada 2026-04-21: bridge outbound `product_catalog -> HubSpot Products`, trace cols, payload adapter, push helper y proyección reactiva `productHubSpotOutbound`. Ver `complete/TASK-547-product-catalog-hubspot-outbound.md`.
- **Fase D cerrada.** `TASK-548` completada 2026-04-21: drift reconciler, `ops-worker`, surface admin de conflictos y comandos auditables. Ver `complete/TASK-548-product-catalog-drift-detection-admin.md`.
- **Fase E pendiente.** `TASK-549` sigue abierta para cleanup/policy enforcement. Su cierre honesto depende además de `TASK-563` y de validación real en production.

## Why This Task Exists

El programa ya cerró la foundation runtime A-D y ahora necesita converger su capa documental/operativa para no seguir describiendo como gaps cosas que ya existen. El trabajo real pendiente en este umbrella es Fase E (`TASK-549`): cleanup de flags/superficies legacy, normalización final de `sync_direction` y política Greenhouse-first coherente con el runtime actual y con los follow-ups externos de `TASK-563`.

## Goal

- Formalizar el modelo de dos capas sin recrear catalogos fuente.
- Conectar los 4 source catalogs con `product_catalog` via reactive materializer.
- Habilitar outbound Greenhouse → HubSpot reactivo (create + update + archive).
- Implementar drift detection + reconciliation con Admin Center surface.
- Policy strict: productos nacen en Greenhouse; orphans HubSpot se adoptan o borran.
- Cerrar el programa sin drift documental entre spec, código, tasks hijas y trackers.
- Dejar explícito que la activación/cierre final depende de `TASK-549` + `TASK-563` + validación en production.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md` — spec normativo del programa
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` (complementario)
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V2.md`
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

- TASK-467 (Pricing Catalog Admin UI) — gana surface de conflict resolution
- TASK-534 (Commercial Party Lifecycle) — complementario (juntos cierran quote-to-HubSpot end-to-end)
- Reporting por product/role/tool — habilita revenue attribution consistente
- `TASK-563` — gate operativo/external para la activación real del bridge
- Kortex platform — hereda un modelo unificado para clientes externos

### Files owned

- `docs/tasks/complete/TASK-545-product-catalog-schema-materializer-foundation.md`
- `docs/tasks/complete/TASK-546-product-catalog-source-handlers-events.md`
- `docs/tasks/complete/TASK-547-product-catalog-hubspot-outbound.md`
- `docs/tasks/complete/TASK-548-product-catalog-drift-detection-admin.md`
- `docs/tasks/to-do/TASK-549-product-catalog-policy-enforcement-cleanup.md`
- `docs/tasks/to-do/TASK-563-product-catalog-hubspot-outbound-followups.md`

## Current Repo State

### Already exists

- `greenhouse_commercial.product_catalog` ya extendido con source-linking, archival, checksum y trace de outbound (TASK-545 + TASK-547)
- `sellable_roles` (ECG-xxx), `tool_catalog` (ETG-xxx), `overhead_addons` (EFO-xxx), `service_pricing` (EFG-xxx)
- `sourceToProductCatalog` materializa los 4 source catalogs sobre `product_catalog`
- `productHubSpotOutbound` ya existe y empuja create/update/archive con trace y anti-ping-pong
- `product_sync_conflicts` + reconciler nocturno + Admin Center ya existen
- Siguen vivos dos carriles legacy: `src/lib/hubspot/sync-hubspot-products.ts` y `src/lib/hubspot/create-hubspot-product.ts`
- `TASK-563` ya documenta los follow-ups externos/operativos que faltan para activación real end-to-end

### Gap

- Fase E aún no está cerrada: los 4 sub-flags `GREENHOUSE_PRODUCT_SYNC_{ROLES,TOOLS,OVERHEADS,SERVICES}` siguen vivos
- El cron/flow legacy `sync-hubspot-products.ts` sigue manteniendo `greenhouse_finance.products` y todavía debe decidirse su deprecación final
- `create-hubspot-product.ts` y `POST /api/finance/products/hubspot` siguen como surface legacy separada del bridge canónico
- El contrato legacy de `sync_direction` aún requiere limpieza/migración histórica
- La activación real en production sigue bloqueada por `TASK-563` (deploy de endpoints externos, apply de custom properties, E2E real y follow-ups operativos)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema + materializer foundation

- `TASK-545` (Fase A) cerrada 2026-04-21: DDL extension (`source_kind`, `source_id`, `is_archived`, `archived_at`, `last_outbound_sync_at`, `gh_owned_fields_checksum`), tabla `product_sync_conflicts`, scaffolding del materializer y backfill heurístico por `product_code` prefix.

### Slice 2 — Source handlers + event homogenization

- `TASK-546` (Fase B) cerrada 2026-04-21: audita eventos de cada source, homogeniza contrato, implementa 4 handlers (`sellable-role-to-product`, `tool-to-product`, `overhead-addon-to-product`, `service-to-product`) y activa materializer detras de sub-flags por source.

### Slice 3 — Outbound proyeccion + Cloud Run endpoints

- `TASK-547` (Fase C) cerrada 2026-04-21: deja cliente/proyección outbound listos en este repo; los follow-ups externos y de activación real quedaron explícitamente derivados a `TASK-563`.

### Slice 4 — Drift detection + Admin Center

- `TASK-548` (Fase D) cerrada 2026-04-21: cron nocturno reconciler, `/admin/commercial/product-sync-conflicts` UI, auto-heal para casos seguros, alertas Slack ops y runbook.

### Slice 5 — Policy enforcement + legacy cleanup

- `TASK-549` (Fase E): cleanup documental/runtime final del programa dentro de este repo.
- `TASK-563`: prerequisito operativo/external para poder cerrar honestamente la Fase E y activar production.

## Out of Scope

- Recrear source catalogs.
- Cambios al contrato de `quotation_line_items` (sigue usando `product_id` FK).
- Pricing discovery / product recommendation (roadmap Nexa).
- Multi-portal HubSpot disambiguation (open question — diferida).
- Migration de nomenclatura SKU (ECG/ETG/EFO/EFG/PRD se mantienen).

## Detailed Spec

Programa oficial con foundation A-D ya implementada y una fase final E todavía pendiente. El gate operativo actual ya no es Fase A sino `TASK-563` + soak real en production.

### Orden de ejecucion

1. `TASK-545` (Fase A) — Foundation schema + scaffolding. **Bloqueante.**
2. `TASK-546` (Fase B) — Source handlers. Depende de A.
3. `TASK-547` (Fase C) — Outbound + Cloud Run. Depende de A; puede paralelo a B si hay coordinacion.
4. `TASK-548` (Fase D) — Drift detection + Admin. ✅ Cerrada 2026-04-21.
5. `TASK-563` — Follow-ups externos/operativos para activación real del bridge. Gate para production.
6. `TASK-549` (Fase E) — Policy enforcement + cleanup. Depende de A-D + `TASK-563` + ≥4 semanas en production.

### Decisiones arquitectonicas cerradas por esta umbrella

- **Extension, no reemplazo**: columnas nuevas sobre `product_catalog`; source catalogs intactos.
- **SKU canonico como business key**: `gh_product_code` custom HubSpot sobrevive recreaciones del id interno.
- **Archival semantico**: no hard delete; quotes historicas preservadas.
- **Policy strict Greenhouse-origin**: productos nacen en Greenhouse; orphans en HubSpot se adoptan o borran via Admin.
- **Field authority**: Greenhouse owns pricing/name/description/code; HubSpot solo owns id interno.
- **Feature flags por source**: rollout incremental roles → tools → overheads → services.

### Preguntas abiertas declaradas

Las 7 open questions del spec §15 quedan heredadas por este programa:

1. Variants granularity (on-demand vs siempre) — sigue abierta; no resuelta en runtime actual.
2. Inbound deprecation timing — sigue abierta y se resuelve en `TASK-549`.
3. Pricing effective-dated vs live snapshot — sigue abierta / parcialmente diferida.
4. Multi-currency products en HubSpot — decidida pragmáticamente a USD-first; variants quedan para follow-up.
5. Archive vs delete policy — resuelta a favor de archive semántico.
6. Service composition complex products (bundle HubSpot) — sigue diferida.
7. Performance del materializer + coalescing — sigue diferida y explicitada en `TASK-563`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Existen las tasks hijas `TASK-545` a `TASK-549` registradas en `TASK_ID_REGISTRY.md` y `README.md`.
- [x] Cada task hija referencia `GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md` como spec normativo.
- [x] La dependencia causal A → B/C → D → E quedó explícita en las tasks hijas y en el umbrella.
- [ ] `TASK-563` queda cerrada y el bridge outbound puede operar end-to-end sin `endpoint_not_deployed`.
- [ ] `TASK-549` se ejecuta tras soak real en production y cierra flags/carriles legacy/documentación.
- [ ] Al cerrar el programa, todas las hijas están en `complete` y las open questions pendientes quedan resueltas o derivadas.

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
- [ ] Chequeo de impacto cruzado (`TASK-563`, `TASK-467`, `TASK-534`, Kortex)

## Follow-ups

- `TASK-545` Fase A — Schema extension + materializer foundation
- `TASK-546` Fase B — Source handlers + event homogenization
- `TASK-547` Fase C — Outbound projection + Cloud Run endpoints
- `TASK-548` Fase D — Drift detection + Admin Center ✅
- `TASK-563` — Follow-ups externos/operativos para activación real
- `TASK-549` Fase E — Policy enforcement + legacy cleanup

## Open Questions

Heredadas del spec §15:

1. Variants granularity on-demand vs always → resolver en TASK-546.
2. Inbound deprecation timing (4 semanas en prod) → resolver en TASK-549.
3. Pricing effective-dated vs live → resolver en TASK-547 o diferir.
4. Multi-currency products en HubSpot (tier Enterprise) → pragmáticamente USD-first; variants quedan follow-up.
5. Archive vs delete policy → resuelto a archive.
6. Service composition bundle en HubSpot → diferir a TASK-546 o programa futuro.
7. Coalescing de eventos (performance) → explicitado como follow-up de `TASK-563`.
