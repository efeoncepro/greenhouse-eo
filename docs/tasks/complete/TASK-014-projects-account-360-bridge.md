# TASK-014 - Projects Account 360 Bridge

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Diseño` → `Avanzada`
- Rank: `19`
- Domain: `data/platform/account-360`
- GitHub Project: `Pending`
- GitHub Issue: `Pending`

## Summary

Conectar el módulo de Projects (Nativo/Notion/BigQuery) con el modelo Account 360 (organizaciones, espacios) agregando **Account Operational Metrics**. Se habilita visibilidad cross-module de operaciones de service delivery de un cliente directamente en su ficha.

## Why This Task Exists

El motor de inteligencia (ICO) y el ecosistema Notion procesan tareas por Proyectos y Spaces, y hoy se unifican las estadísticas por Persona (`person_operational_metrics`). Sin embargo, no teníamos un bridge para que `Account 360` recupere el tracking operativo general de su organización (`client_id` / `organization_id`), dejando un gap en la visualización ejecutiva (Organization Economics vs Organization Delivery).

## Goal

- Computar métricas de entrega/operaciones (tareas, rpa, promedios) a nivel Organización en el motor BQ (ICO).
- Persistir estas métricas mensualmente hacia Postgres (`greenhouse_serving.ico_organization_metrics`).
- Crear la materialización interactiva `greenhouse_serving.organization_operational_metrics` para consumo del frontend.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/Greenhouse_Account_360_Object_Model_v1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (Para eventos reactivos)

Reglas obligatorias:
- Las Account Operational Metrics deben agregarse por `client_id` (que mapea a `organization_id`) en `v_tasks_enriched`.
- No mutar datos DDL operativos en BigQuery, solo de `v_tasks_enriched` a snapshots.
- Mantener PostgreSQL como source of truth para el front, usando el event outbox.

## Dependencies & Impact

### Depends on

- `Account 360` (Ya existe)
- `ICO Intelligence Layer` (Ya existe `v_tasks_enriched` y métricas de persona)

### Impacts to

- Organization Store / Serving (`getOrganizationOperationalMetrics`)
- BQ Schema de ICO

### Files owned

- `src/lib/ico-engine/schema.ts`
- `src/lib/ico-engine/materialize.ts`
- `scripts/setup-postgres-organization-operational-serving.sql`
- `src/lib/account-360/get-organization-operational-serving.ts`
- `src/lib/sync/projections/ico-organization-metrics.ts`
- `src/lib/sync/projections/organization-operational.ts`

## Current Repo State

### Ya existe

- Motor de agregación en BigQuery (ICO) operando por proyectos y miembros.
- Capa reactiva de Postgres probada con `person_operational_metrics`.
- Event Catalog capaz de disparar `ico.materialization.completed`.

### Gap actual

- Las `organization_360` solo exponen counts básicos espaciales y Economics, carecen totalmente de metrics de projects/operations.

## Scope

### Slice 1 - BigQuery Aggregation
- Crear la vista/tabla `metrics_by_organization` análoga a `metrics_by_project`.
- Despachar el evento outbox al completar la materialización.

### Slice 2 - Postgres Storage & Serving
- DDL en Postgres para las métricas (ICO source + serving materializada).
- Proyecciones `ico-organization` y `organization-operational` funcionando como consumers de Node.

## Out of Scope

- Cambios de modelo en Hubspot o Notion.
- Construcción de UI (está cubierto en otras tareas o en el propio Account 360 frontend en Vercel).

## Acceptance Criteria

- [ ] BigQuery schema crea la tabla `metrics_by_organization` exitosamente.
- [ ] Función `materializeOrganizationMetrics` computa la data correcta y gatilla outbox.
- [ ] La tabla Postgres `greenhouse_serving.ico_organization_metrics` se llena reactivamente por el pipeline.
- [ ] El store expone el método `getOrganizationOperationalMetrics` exitosamente y devuelve Data.

## Verification

- `pnpm build`
- `pnpm lint`
- Ejecución de CLI `run-ico-materialization` y consultas manuales sobre el DDL.
