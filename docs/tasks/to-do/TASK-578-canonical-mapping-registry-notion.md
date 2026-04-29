# TASK-578 — Canonical Mapping Registry + Identity Extension Notion

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-005`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `commercial / delivery / identity`
- Blocked by: `none` (puede correr en paralelo con TASK-577)
- Branch: `task/TASK-578-canonical-mapping-registry-notion`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

Reemplazar los 6 diccionarios hardcoded del sibling `notion-hubspot-sync` (`NOTION_TO_HS_OWNER`, `NOTION_STATUS_TO_DEALSTAGE`, `NOTION_STATUS_TO_TASK_STATUS`, `NOTION_PRIORITY_TO_HS`, `NOTION_TO_HUBSPOT_LINEA_DE_SERVICIO`, `NOTION_TO_HUBSPOT_SERVICIOS_ESPECIFICOS`) por tablas canónicas admin-gobernables en `greenhouse_commercial.*`, siguiendo el patrón `hubspot_*_config` que introdujo TASK-571/573. Incluye extender `identity_profile_source_links` con `source_system='notion'` + seed inicial + reader/validator + admin API endpoint de refresh. Policy de conflict resolution state-machine (EPIC-005) lee de estas tablas — sin ellas, los orchestrators (TASK-579, TASK-580) no tienen fuente canónica.

## Why This Task Exists

- El sibling hoy declara las reglas de mapeo como código Python. Cualquier owner nuevo, status nuevo, línea de servicio nueva o mapping revisado requiere PR + deploy. En producción esto se tradujo en mappings desactualizados que el usuario describe como "no está funcionando tan bien".
- Greenhouse ya tiene el patrón `hubspot_deal_pipeline_config` + `hubspot_deal_property_config` (TASK-571, TASK-573) como registry admin-gobernable. Extender ese mismo patrón a los 6 mappings que el sibling hoy hardcodea es incremental, no arquitectónico.
- `identity_profile_source_links` ya mapea HubSpot users ↔ Efeonce persons. Extenderlo a Notion es una fila por persona, no una arquitectura nueva.
- El conflict resolution policy de EPIC-005 (state-machine por deal stage + LWW fallback) se codifica en estas tablas. Sin ellas, no hay policy.

## Goal

- 1 migración Postgres agrega `source_system='notion'` a `identity_profile_source_links` (check constraint o enum update) + seed inicial de Notion user ids para los owners que el sibling hardcodea.
- 6 tablas canónicas creadas en `greenhouse_commercial`:
  - `commercial_deal_stage_mapping`
  - `commercial_task_status_mapping`
  - `commercial_priority_mapping`
  - `commercial_business_line_mapping`
  - `commercial_service_module_mapping`
  - `commercial_contact_role_mapping`
- Reader/validator module `src/lib/commercial/mappings-store.ts` que el ops-worker y la API usan para resolver mappings.
- Admin API endpoint `GET /api/admin/commercial/mappings` + `POST /api/admin/commercial/mappings/refresh`.
- Seed inicial con los valores exactos del sibling — cero pérdida de mappings existentes en cutover.
- Tests unitarios + integration.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` (identity_profile_source_links es pieza canónica)
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` (contrato de `source_system`)
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` (migrations pattern)
- `docs/epics/to-do/EPIC-005-greenhouse-commercial-delivery-orchestrator.md`

Reglas obligatorias:

- **Migration SQL-first** via `pnpm migrate:create` → editar → `pnpm migrate:up`.
- **Seed dentro de la migration** — nada de seed script suelto.
- **Cero pérdida de mappings** del sibling. Cada diccionario hardcoded tiene row equivalente en canonical tras ejecutar la migration.
- **Patrón `config` no `lookup`**: las tablas se llaman `*_mapping` y tienen owner, dirección (ambos o unidireccional), effective dates. No son simple KV.
- **Admin surface mínima**: SQL + endpoint de refresh. Admin UI es follow-up.

## Normative Docs

- `/tmp/hbi-sibling/cesargrowth11/notion-hubspot-sync/main.py` líneas 68-132 — los 6 diccionarios exactos a portar (seed source)
- `docs/epics/to-do/EPIC-005-greenhouse-commercial-delivery-orchestrator.md`
- `docs/tasks/complete/TASK-571-deal-creation-context-pipeline-stage-governance.md` (patrón `hubspot_deal_pipeline_config`)
- `docs/tasks/complete/TASK-573-quote-builder-deal-birth-contract-completion.md` (patrón `hubspot_deal_property_config`)

## Dependencies & Impact

### Depends on

- Acceso al sibling `cesargrowth11/notion-hubspot-sync/main.py` para extraer los 6 diccionarios exactos (seed).
- `greenhouse_commercial` schema existe (ya live).
- `identity_profile_source_links` existe con `source_system` column (ya live).

### Blocks / Impacts

- Bloquea TASK-579 (Forward Orchestrator) y TASK-580 (Reverse Orchestrator). Ambos resuelven mappings via el nuevo store.
- Bloquea TASK-582 (Admin Surface) — el preview lee owner resuelto via `identity_profile_source_links` con source_system='notion'.
- NO rompe nada existente — puramente aditivo.

### Files owned

- `migrations/<timestamp>_task-578-notion-mapping-registry.sql` (nueva)
- `src/types/db.d.ts` (regenerado post-migration)
- `src/lib/commercial/mappings-store.ts` (nuevo)
- `src/lib/commercial/__tests__/mappings-store.test.ts` (nuevo)
- `src/app/api/admin/commercial/mappings/route.ts` (nuevo)
- `src/app/api/admin/commercial/mappings/refresh/route.ts` (nuevo)
- `src/lib/entitlements/runtime.ts` (agregar capability `commercial.mapping.read` + `commercial.mapping.write` si hacen falta)

## Current Repo State

### Already exists

- `greenhouse_core.identity_profile_source_links` con columns `(identity_profile_id, source_system, source_object_type, source_object_id, active, ...)`.
- `greenhouse_commercial.hubspot_deal_pipeline_config` + `hubspot_deal_property_config` (TASK-571/573) como patrón de registry admin-gobernable.
- Admin API routes pattern en `src/app/api/admin/commercial/*` (ej. deal-governance de TASK-573).

### Gap

- `identity_profile_source_links` probablemente no acepta `source_system='notion'` hoy (a verificar en Discovery — el check constraint o enum).
- Cero tablas de mapping Notion↔HubSpot en canonical.
- Los 6 diccionarios viven solo en el sibling.

## Scope

### Slice 1 — Discovery + extracción del sibling

- Clonar (si no clonado) el sibling + extraer literal los 6 diccionarios de `main.py:68-132`:
  - `NOTION_TO_HS_OWNER` (9 entries estimados; resolver cada HubSpot user id a identity_profile_id)
  - `NOTION_STATUS_TO_DEALSTAGE` (subset con 2 entries explícitos + fallback implícito)
  - `NOTION_STATUS_TO_TASK_STATUS`
  - `NOTION_PRIORITY_TO_HS`
  - `NOTION_TO_HUBSPOT_LINEA_DE_SERVICIO`
  - `NOTION_TO_HUBSPOT_SERVICIOS_ESPECIFICOS`
- Discovery del schema actual de `identity_profile_source_links` — check constraint o CHECK o enum para `source_system`.
- Grep cross-repo en `greenhouse-eo` para ver si ya hay consumers de `source_system` como string libre.

### Slice 2 — Migration: extender `identity_profile_source_links`

- Agregar `'notion'` al CHECK constraint del column `source_system`.
- Seed: por cada entry de `NOTION_TO_HS_OWNER`, buscar el `identity_profile_id` correspondiente al HubSpot user id y agregar una row con `source_system='notion'`, `source_object_type='user'`, `source_object_id=<notion_user_id>`.
- Failsafe: si algún mapping del sibling no resuelve a `identity_profile_id` en canonical, marcar la seed row como `active=false` con `notes` explicativo + loggear warning durante la migration (no fallar).

### Slice 3 — Migration: 6 tablas de mapping

Schema consistente entre las 6:

```sql
CREATE TABLE greenhouse_commercial.commercial_<type>_mapping (
  mapping_id text PRIMARY KEY DEFAULT ('map-' || gen_random_uuid()::text),
  notion_value text NOT NULL,
  hubspot_value text NOT NULL,
  direction text NOT NULL DEFAULT 'both' CHECK (direction IN ('both', 'notion_to_hubspot', 'hubspot_to_notion')),
  active boolean NOT NULL DEFAULT TRUE,
  effective_from timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  effective_until timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT <table>_notion_hubspot_unique UNIQUE (notion_value, hubspot_value, direction)
);
```

Adaptaciones por tabla:

- `commercial_deal_stage_mapping`: `notion_value` = Notion status, `hubspot_value` = HubSpot dealstage id.
- `commercial_task_status_mapping`: idem pero para task status.
- `commercial_priority_mapping`: idem.
- `commercial_business_line_mapping`: `notion_value` + `hubspot_value` son strings libres (multi-select names).
- `commercial_service_module_mapping`: idem.
- `commercial_contact_role_mapping`: `notion_value` = role en Notion, `hubspot_value` = HubSpot contact property value (ej. `primary_contact`, `billing_contact`).

Seed de cada tabla dentro de la misma migration con los valores del sibling.

### Slice 4 — Stage lockability (state-machine config)

- Agregar tabla `greenhouse_commercial.deal_stage_field_lock_config`:

```sql
CREATE TABLE greenhouse_commercial.deal_stage_field_lock_config (
  config_id text PRIMARY KEY DEFAULT ('lock-' || gen_random_uuid()::text),
  dealstage text NOT NULL,
  field_name text NOT NULL,
  locked_from_notion boolean NOT NULL DEFAULT FALSE,
  locked_from_hubspot boolean NOT NULL DEFAULT FALSE,
  reason text,
  active boolean NOT NULL DEFAULT TRUE,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT deal_stage_field_lock_unique UNIQUE (dealstage, field_name, active)
);
```

Seed inicial (EPIC-005 policy):

- `closedwon` → `amount` locked from both, `dealstage` locked from notion
- `closedlost` → idem
- `appointmentscheduled` → todo editable both ways (nada locked)
- Resto de stages → sin lock por default; admin agrega según vaya entendiendo el flujo

### Slice 5 — Reader/validator module

`src/lib/commercial/mappings-store.ts`:

```ts
export interface MappingEntry {
  notionValue: string
  hubspotValue: string
  direction: 'both' | 'notion_to_hubspot' | 'hubspot_to_notion'
  active: boolean
}

export const resolveMapping = async (
  table: 'deal_stage' | 'task_status' | 'priority' | 'business_line' | 'service_module' | 'contact_role',
  value: string,
  direction: 'notion_to_hubspot' | 'hubspot_to_notion'
): Promise<string | null>

export const listMappings = async (table: ...): Promise<MappingEntry[]>

export const resolveNotionUserForHubspotUser = async (
  hubspotUserId: string
): Promise<{ notionUserId: string | null; identityProfileId: string | null }>

export const isFieldLockedForStage = async (
  dealstage: string,
  fieldName: string,
  direction: 'from_notion' | 'from_hubspot'
): Promise<boolean>
```

### Slice 6 — Admin API endpoints

- `GET /api/admin/commercial/mappings?table=<type>` → lista entries activos.
- `POST /api/admin/commercial/mappings/refresh` → endpoint admin-safe que fuerza reload de cache (si usamos cache in-memory). Sin cache initial — directo a PG cada call, caché se agrega como follow-up.
- Capability gate: `commercial.mapping.read` + `commercial.mapping.write` (agregar a entitlements catalog).

### Slice 7 — Tests

- Unit tests de `mappings-store.ts` con mocks de PG.
- Integration test que ejecuta la migration en test DB + verifica los 6 tables + identity extension + seed counts.
- Test de `isFieldLockedForStage` cubriendo los 3 stages con seed (closedwon, closedlost, appointmentscheduled).

## Out of Scope

- Admin UI para CRUD de los mappings. Follow-up post-EPIC.
- Real-time updates a los mappings (webhooks/events cuando cambia un mapping). Follow-up.
- Migración de los mappings a un formato más rico tipo JSON schema. V1 es key-value simple.

## Detailed Spec

### Directionality de mappings

El `direction` column cubre:

- `both` — mapeo bidireccional (default). Ej: Notion "En progreso" ↔ HubSpot `qualifiedtobuy`.
- `notion_to_hubspot` — cuando Notion tiene más granularidad que HubSpot y múltiples Notion values colapsan a un HubSpot value (la reverse dirección pierde info).
- `hubspot_to_notion` — idem inverso.

### Lockability policy

La policy de EPIC-005 dice "state-machine por deal stage + LWW fallback". La tabla `deal_stage_field_lock_config` codifica el side izquierdo (qué campos están locked por stage); el LWW es el fallback implícito cuando `isFieldLockedForStage` devuelve `false`.

## Acceptance Criteria

- [ ] Migración ejecutada contra staging + prod sin errores.
- [ ] `identity_profile_source_links` acepta `source_system='notion'`.
- [ ] 6 tablas de mapping existen con seed inicial completo (counts que matchean los diccionarios del sibling).
- [ ] Tabla `deal_stage_field_lock_config` existe con seed para closedwon + closedlost + appointmentscheduled.
- [ ] `src/lib/commercial/mappings-store.ts` expone las 4 funciones declaradas.
- [ ] `GET /api/admin/commercial/mappings` devuelve entries activos por tabla.
- [ ] `POST /api/admin/commercial/mappings/refresh` funciona (incluso si cache aún no existe — no-op OK).
- [ ] Capabilities `commercial.mapping.read` + `commercial.mapping.write` declaradas en catalog.
- [ ] `src/types/db.d.ts` regenerado.
- [ ] Tests unitarios + integration verdes.
- [ ] `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm build` verdes.

## Verification

- `pnpm pg:connect:migrate` aplica la migration limpia.
- `pnpm pg:connect:shell` → count de rows por tabla matchea el seed.
- `pnpm staging:request GET /api/admin/commercial/mappings?table=deal_stage --pretty` devuelve JSON con entries esperadas.

## Closing Protocol

- [ ] `Lifecycle` sincronizado + archivo en carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` documentan
- [ ] EPIC-005 cross-check: acceptance criterion "Mapping Registry live" marcado

## Follow-ups

- Admin UI para CRUD de mappings.
- Cache in-memory + invalidation via outbox event cuando mappings cambian.
- Export/import de mappings para migrations entre environments.

## Delta 2026-04-29

Decision operativa: el sibling fuente de los mappings legacy es **`cesargrowth11/notion-hubspot-sync`** (`https://github.com/cesargrowth11/notion-hubspot-sync`). No confundir con `cesargrowth11/notion-bigquery` ni `cesargrowth11/hubspot-bigquery`.

Estado runtime desde 2026-04-29: la ejecucion automatica del sibling quedo pausada en Cloud Scheduler porque el flujo actual no se considera suficientemente robusto y sera absorbido luego por Greenhouse como orquestador. Jobs pausados en `efeonce-group/us-central1`:

- `notion-hubspot-reverse-poll`
- `hubspot-notion-deal-poll`
- `notion-hubspot-reverse-poll-staging`
- `hubspot-notion-deal-poll-staging`

Implicacion para esta task: extraer los mappings desde el repo sibling solo como seed legacy congelada. No reactivar schedulers, no optimizar los diccionarios en Python, no crear nuevos hardcodes. El output canonico debe vivir en Postgres/Greenhouse y ser gobernable por Greenhouse.

## Open Questions

- ¿`identity_profile_source_links` tiene check constraint o enum actual que rechaza `'notion'`? Verificar en Slice 1.
- ¿Los Notion user ids del `NOTION_TO_HS_OWNER` hardcoded siguen siendo válidos? Si algún operador fue dado de baja, la seed row queda `active=false`.
