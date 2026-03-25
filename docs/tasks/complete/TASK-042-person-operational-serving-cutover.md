# TASK-042 - Person Operational Serving Cutover

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Status real: `Cerrada`
- Rank: `30`
- Domain: `people`
- GitHub Project: `Greenhouse Delivery`

## Summary

Materializar un read model operacional canónico por persona y período para reemplazar el path actual basado en BigQuery + matching heurístico por nombre/email en `People`.

El objetivo no es rehacer ICO ni Delivery, sino cerrar el último tramo frágil entre identidad canónica y métricas operativas consumidas por la ficha de persona.

## Why This Task Exists

Hoy `src/lib/people/get-person-operational-metrics.ts` calcula la actividad operativa de una persona leyendo `notion_ops.tareas` y resolviendo pertenencia por señales blandas: nombre, emails, aliases y candidatos de usuario de Notion.

Eso deja una brecha concreta:

- la identidad operativa no está completamente anclada a `member_id`
- dos superficies distintas pueden mostrar métricas diferentes para la misma persona
- el runtime de `People` depende de columnas y convenciones del source dataset, no de un serving model estable

Mientras `person_finance_360` e `ico_member_metrics` ya operan como read models reutilizables, la capa operativa de persona sigue viviendo en una zona híbrida.

## Goal

- Crear una proyección operacional canónica por `member_id` y período sobre PostgreSQL
- Cortar `People` a lectura Postgres-first para métricas operativas de persona
- Eliminar el matching heurístico por nombre/email del path normal de runtime
- Exponer cobertura, frescura y degradaciones de la nueva proyección

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`

Reglas obligatorias:

- la identidad de persona en runtime debe anclarse a `member_id` y `identity_profile_id`, no a display names
- BigQuery puede seguir siendo source o staging, pero no debe seguir siendo el read model operativo principal de `People`
- el nuevo modelo debe distinguir snapshot operativo de drill-down analítico para no inflar la ficha de persona sin frontera clara

## Dependencies & Impact

### Depends on

- `src/lib/people/get-person-operational-metrics.ts`
- `src/lib/people/get-person-detail.ts`
- `src/lib/person-360/get-person-ico-profile.ts`
- `src/lib/person-360/resolve-eo-id.ts`
- `greenhouse_serving.ico_member_metrics`
- `docs/roadmap/GREENHOUSE_RUNTIME_SYNERGY_GAPS_V1.md`

### Impacts to

- `TASK-043 - Person 360 Runtime Consolidation`
- `TASK-019 - Staff Augmentation Module`
- `TASK-008 - Team Identity Capacity System`
- superficies de `People` que hoy muestran actividad operativa o KPIs de delivery

### Files owned

- `scripts/setup-postgres-person-operational-serving.sql`
- `scripts/backfill-person-operational-serving.ts`
- `src/lib/person-360/get-person-operational-serving.ts`
- `src/lib/people/get-person-operational-metrics.ts`
- `src/lib/people/get-person-detail.ts`
- `src/app/api/people/[memberId]/route.ts`
- `src/app/api/people/[memberId]/operations/route.ts`
- `docs/roadmap/GREENHOUSE_RUNTIME_SYNERGY_GAPS_V1.md`

## Current Repo State

### Ya existe

- `getPersonDetail()` ya compone identidad, memberships, HR, finance, payroll, delivery y operaciones en una sola ficha
- `ico_member_metrics` ya existe como proyección operativa de ICO por persona en Postgres
- `person_finance_360` ya existe como proyección financiera por persona en Postgres
- la resolución de identidad canónica ya existe en `Person 360`

### Gap actual

- las métricas operativas de persona siguen atadas a `notion_ops.tareas`
- el match persona -> tarea sigue dependiendo de señales heurísticas
- la ficha de persona no tiene hoy un serving operacional homogéneo con llaves canónicas y períodos claros
- no existe una fuente única para responder “actividad operativa reciente por miembro” sin reinterpretar raw fields

## Scope

### Slice 1 - Modelo y backfill operacional

- definir tabla o vista canónica para métricas operativas por persona y período
- materializar un backfill inicial desde las fuentes actuales respetando `member_id`
- agregar metadata de cobertura y `materialized_at` para observabilidad

### Slice 2 - Runtime cutover de People

- crear store Postgres-first para lectura operacional de persona
- refactorizar `getPersonOperationalMetrics()` para consumir el serving nuevo
- limitar el fallback heurístico a modo de contingencia explícita y observable, no como path normal

### Slice 3 - API y consumo

- exponer endpoint estable para operaciones por persona si hace falta desacoplar tabs o cards
- actualizar `getPersonDetail()` para consumir el nuevo store en vez de leer directo de raw/notion logic
- agregar tests de cobertura para match canónico, períodos y fallbacks

## Out of Scope

- rediseñar la UI de `People`
- rehacer el modelo ICO
- eliminar BigQuery como source data de Delivery
- introducir analytics exploratorios que no sean necesarios para la ficha operativa de persona

## Acceptance Criteria

- [ ] existe una proyección operacional por persona y período anclada a `member_id`
- [ ] `getPersonOperationalMetrics()` deja de depender del matching por nombre/email en el path normal
- [ ] `getPersonDetail()` consume la nueva proyección operacional
- [ ] el sistema expone cobertura/frescura de la proyección y fallbacks activados
- [ ] `pnpm lint` pasa sin nuevos errores
- [ ] `pnpm test` cubre al menos el store nuevo y el cutover de `People`
- [ ] `npx tsc --noEmit` no introduce errores nuevos

## Verification

- `pnpm lint`
- `pnpm test`
- `npx tsc --noEmit`
- smoke manual sobre `GET /api/people/[memberId]` y, si aplica, `GET /api/people/[memberId]/operations`
