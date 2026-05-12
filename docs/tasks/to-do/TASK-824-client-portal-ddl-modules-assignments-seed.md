# TASK-824 — Client Portal DDL: Schema + Modules + Assignments + 10 Modules Seed

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Epic: `EPIC-015`
- Status real: `Diseno (independiente; el BFF TS ya está listo desde 2026-05-12 TASK-822 cierre)`
- Rank: `TBD`
- Domain: `client_portal`
- Blocked by: `none`
- Branch: `task/TASK-824-client-portal-ddl`

## Delta 2026-05-12 — TASK-822 cerrada, contract de parity TS↔DB pendiente

TASK-822 dejó canonizado el type union `ClientPortalDataSource` en
`src/lib/client-portal/dto/reader-meta.ts` con 17 values (commercial.engagements,
finance.invoices, agency.ico, account_360.summary, etc.).

Cuando esta task entregue el schema:

- `greenhouse_client_portal.modules.data_sources TEXT[]` debe aceptar SOLO valores que coincidan con el type union TS. Patrón canonico: CHECK constraint con `unnest(data_sources) <@ ARRAY[...]` o validation a nivel aplicación pre-INSERT.
- Agregar un parity test `*.live.test.ts` (mismo patrón TASK-611 `capabilities_registry`) que rompa build si TS union y DB enum (o whitelist aplicativa) divergen. Esto cierra la OQ-3 documentada en TASK-822.
- Si la implementación opta por enum DB en lugar de CHECK constraint sobre TEXT[], el parity test sigue siendo obligatorio.

Spec actualizada V1.1 §3.1 documenta el contract.

## Summary

Crea el schema `greenhouse_client_portal` con 3 tablas (`modules`, `module_assignments`, `module_assignment_events`), append-only triggers, índices hot-path, 10 módulos seed canónicos, y extiende `engagement_commercial_terms` con columna `bundled_modules TEXT[]`. Base estructural sobre la cual se construyen los slices 4-8.

## Why This Task Exists

Sin las tablas + seed, el resolver canónico (TASK-825), admin endpoints (TASK-826), composition layer (TASK-827), cascade (TASK-828) y reliability (TASK-829) no tienen sustrato. Es prerequisito DB de todos los slices downstream. Independiente de TASK-822/823 (puede correr en paralelo).

## Goal

- 1 migración aplicada que crea schema + 3 tablas + indexes + CHECK + append-only triggers + 10 seed rows
- Extension a `engagement_commercial_terms` con `bundled_modules TEXT[]`
- Tipos Kysely regenerados
- Backward compat 100% (no toca tablas existentes salvo el ADD COLUMN nullable)

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §5 (Data Model), §16 (Hard Rules)
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md` — ownership `greenhouse_ops` + grants `greenhouse_runtime`
- CLAUDE.md sección "Database — Migration markers"

Reglas obligatorias:

- Migration generada con `pnpm migrate:create` (NUNCA editar timestamp manual)
- Marker `-- Up Migration` exacto
- Verify DDL aplicado via `information_schema` post `pnpm migrate:up` (TASK-768 silent failure pattern)
- Grants: ownership `greenhouse_ops` + grants `greenhouse_runtime`
- `engagement_commercial_terms.bundled_modules` columna NULLABLE (back-compat)
- 10 modules seed con view_codes + capabilities + data_sources VERBATIM del spec §5.5
- NO crear FK física desde `bundled_modules[]` a `modules.module_key` (boundary cross-schema; FK lógica vía outbox/lint)

## Normative Docs

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §5.1–§5.6

## Dependencies & Impact

### Depends on

- `greenhouse_core.organizations` (TASK-535) ✅
- `greenhouse_core.users` ✅
- `greenhouse_commercial.engagement_commercial_terms` (TASK-802) ✅

### Blocks / Impacts

- TASK-825 (resolver) — necesita tablas
- TASK-826 (admin endpoints) — necesita tablas + seed
- TASK-828 (cascade) — necesita `bundled_modules` columna
- TASK-829 (reliability) — lee de las tablas

### Files owned

- `migrations/<ts>_task-824-client-portal-ddl.sql`
- `src/types/db.d.ts` (regenerado)

## Current Repo State

### Already exists

- `greenhouse_core.organizations`, `users`
- `greenhouse_commercial.engagement_commercial_terms` (TASK-802)
- Patrón append-only triggers (TASK-535/765/808)
- Spec canónico V1 (creado 2026-05-07)

### Gap

- No existe schema `greenhouse_client_portal`
- No existe modelo de módulos on-demand

## Scope

### Slice 1 — Migration DDL schema + tablas + triggers

- Crear migration con `pnpm migrate:create task-824-client-portal-ddl`
- `CREATE SCHEMA greenhouse_client_portal`
- 3 CREATE TABLE: modules, module_assignments, module_assignment_events
- 9 índices (hot path + UNIQUE partial active)
- 4 funciones + 4 triggers (modules append-only check, module_assignment_events anti-update/delete x2)
- Grants ownership + runtime

### Slice 2 — Seed 10 modules

INSERT verbatim del spec §5.5:
- creative_hub_globe_v1 (Globe standard, bundled)
- roi_reports (Globe enterprise, addon_fixed)
- cvr_quarterly (Globe addon, addon_fixed)
- equipo_asignado (cross standard, bundled)
- pulse (cross standard, bundled)
- staff_aug_visibility (staff_aug standard, bundled)
- brand_intelligence (Globe addon, addon_fixed)
- csc_pipeline (Globe addon, addon_fixed)
- crm_command_legacy (CRM Solutions standard, bundled)
- web_delivery (Wave standard, bundled)

### Slice 3 — Extension engagement_commercial_terms

- `ALTER TABLE greenhouse_commercial.engagement_commercial_terms ADD COLUMN bundled_modules TEXT[] DEFAULT ARRAY[]::TEXT[]`
- Comment: "Module keys del catálogo greenhouse_client_portal.modules. Cascade en TASK-828. FK lógica via outbox."

### Slice 4 — Verify + types regen

- `pnpm migrate:up`
- Verify DDL via `information_schema.tables`, `pg_constraint`, `pg_trigger`, `pg_indexes`
- Smoke SQL: INSERT assignment con UNIQUE partial → segundo INSERT del mismo (org,module) activo falla
- Smoke SQL: UPDATE en module_assignment_events → falla con mensaje append-only
- Smoke SQL: UPDATE breaking en modules.business_line → falla con mensaje append-only
- `pnpm db:generate-types`

## Out of Scope

- Helpers TS — TASK-825
- Endpoints — TASK-826
- UI — TASK-827
- Cascade reactive consumer — TASK-828
- Reliability signals — TASK-829
- FK física `bundled_modules[]` → modules (deliberadamente NO; cross-schema)

## Detailed Spec

Ver `GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §5.1–§5.5. DDL VERBATIM ajustando:
- Schema target: `greenhouse_client_portal`
- Ownership: `greenhouse_ops` + grants `greenhouse_runtime`
- Comments en columnas críticas (status, source, view_codes, capabilities, data_sources, pricing_kind, expires_at, bundled_modules)

Verificación post-migration:

```sql
-- Schema existe
SELECT count(*) FROM information_schema.schemata WHERE schema_name='greenhouse_client_portal';
-- expect 1

-- 3 tablas existen
SELECT count(*) FROM information_schema.tables WHERE table_schema='greenhouse_client_portal';
-- expect 3

-- UNIQUE partial activa
SELECT indexname FROM pg_indexes WHERE tablename='module_assignments' AND indexname='module_assignments_one_active';
-- expect 1

-- Triggers append-only assignment_events
SELECT tgname FROM pg_trigger
  WHERE tgrelid='greenhouse_client_portal.module_assignment_events'::regclass
    AND tgname LIKE 'prevent_%';
-- expect 2

-- Trigger modules append-only
SELECT tgname FROM pg_trigger
  WHERE tgrelid='greenhouse_client_portal.modules'::regclass
    AND tgname='modules_append_only_check';
-- expect 1

-- Seed: 10 modules
SELECT count(*), business_line FROM greenhouse_client_portal.modules
  WHERE effective_to IS NULL GROUP BY business_line;
-- expect 10 total: globe=5, cross=2, staff_aug=1, crm_solutions=1, wave=1

-- Extension engagement_commercial_terms
SELECT column_name FROM information_schema.columns
  WHERE table_schema='greenhouse_commercial'
    AND table_name='engagement_commercial_terms'
    AND column_name='bundled_modules';
-- expect 1
```

## Acceptance Criteria

- [ ] `pnpm migrate:up` aplica migración sin errores
- [ ] Schema `greenhouse_client_portal` existe
- [ ] 3 tablas existen con DDL verbatim del spec
- [ ] UNIQUE partial `module_assignments_one_active` enforced (smoke INSERT segundo activo falla)
- [ ] 2 triggers anti-UPDATE/DELETE en `module_assignment_events` (smoke UPDATE falla)
- [ ] Trigger append-only en `modules` (smoke UPDATE de `business_line` falla)
- [ ] CHECK constraint `pilot requires expires_at` (smoke INSERT pilot sin expires falla)
- [ ] 10 filas en `modules` con seed verbatim del spec
- [ ] Distribución per business_line: globe=5, cross=2, staff_aug=1, crm_solutions=1, wave=1
- [ ] Extension `engagement_commercial_terms.bundled_modules` aplicada
- [ ] `pnpm db:generate-types` regenera con 3 tablas nuevas + columna
- [ ] Ownership: `greenhouse_ops` + grants `greenhouse_runtime` correctos
- [ ] `pnpm migrate:status` reporta migration aplicada

## Verification

- `pnpm migrate:up`
- `pnpm migrate:status`
- `pnpm db:generate-types`
- `pnpm tsc --noEmit`
- `pnpm pg:connect:shell` para 6 smokes manuales

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado si Delta al spec
- [ ] Chequeo cruzado: TASK-825, TASK-826, TASK-828 desbloqueadas
- [ ] EPIC-015 progress actualizado

## Follow-ups

- TASK-825 puede arrancar inmediatamente
- Si emerge necesidad de FK física `bundled_modules[]` → modules, documentar en ADR (decisión actual: NO física, FK lógica vía outbox)
- Considerar índice GIN sobre `view_codes[]` y `capabilities[]` si TASK-825 resolver lo necesita

## Open Questions

- ¿`default_for_business_lines` se usa desde V1.0 o queda dormido para V1.1? Recomendación: dormido en V1.0 (cascade desde lifecycle ya resuelve), reservado en schema.
- ¿Validar `view_codes[]` y `capabilities[]` referencian entries reales? Recomendación: lint rule en TASK-825 (no DB CHECK por boundary cross-domain).
