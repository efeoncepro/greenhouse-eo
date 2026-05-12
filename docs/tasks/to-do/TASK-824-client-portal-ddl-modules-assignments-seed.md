# TASK-824 — Client Portal DDL: Schema + Modules + Assignments + 10 Modules Seed

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Epic: `EPIC-015`
- Status real: `Diseno v1.1 — arch-architect verdict aplicado 2026-05-12 (5 correcciones pre-Slice-1). BFF TS listo desde 2026-05-12 TASK-822 cierre.`
- Rank: `TBD`
- Domain: `client_portal`
- Blocked by: `none`
- Branch: `task/TASK-824-client-portal-ddl`

## Delta 2026-05-12 — TASK-822 cerrada, contract de parity TS↔DB pendiente

TASK-822 dejó canonizado el type union `ClientPortalDataSource` en
`src/lib/client-portal/dto/reader-meta.ts` con 17 values (commercial.engagements,
finance.invoices, agency.ico, account_360.summary, etc.).

Cuando esta task entregue el schema:

- `greenhouse_client_portal.modules.data_sources TEXT[]` debe aceptar SOLO valores que coincidan con el type union TS. Patrón canonico verificado: **parity test live TS↔DB (option C)**, NO CHECK constraint hardcodeado con array literal (option A descartada en revisión arch-architect — drift latente cada vez que TS union se extienda). Si el catalog crece > 30 values en V1.1+, migrar a registry table (option B).
- Agregar parity test `src/lib/client-portal/data-sources/parity.{ts,live.test.ts}` (mismo patrón TASK-611 `capabilities_registry`) que rompa build si TS union y DB seed divergen. Esto cierra la OQ-3 documentada en TASK-822.

Spec actualizada V1.2 §5.1 documenta el contract.

## Delta 2026-05-12 (segunda revisión — arch-architect verdict v1.1 aplicado pre-Slice-1)

Cinco correcciones estructurales al spec V1.0 original (1 bloqueante + 4 polish), aplicadas para evitar drift técnico y deuda arquitectónica antes de la primera migration:

1. **Issue 1 (bloqueante) — `business_line` enum duplicaba el catálogo canónico 360**. `GREENHOUSE_BUSINESS_LINES_ARCHITECTURE_V1.md` dice explícito: "no existe enum PostgreSQL duplicado del catalogo" — la source of truth es `greenhouse_core.service_modules.module_code WHERE module_kind='business_line'`. Además, el enum del spec V1.0 mezclaba dimensiones ortogonales (`globe`/`wave`/`crm_solutions` son business_lines reales; `cross` es metavalue "aplicable a múltiples"; `staff_aug` es service_module dentro de cross/globe). **Fix canónico**: renombrar el campo `business_line` → `applicability_scope` + COMMENT en la columna que aclara explícitamente que es metavalue del dominio client_portal, NO el FK al business_line del 360. Spec arquitectónica V1 §5.1 actualizada en paralelo.

2. **Issue 2 (polish, cierra OQ-3) — parity test TS↔DB shape canónico explícito**. Delta original decía "agregar parity test" pero no especificaba archivo ni shape. **Fix canónico**: replicar shape exacto de TASK-611 `capabilities_registry` — archivos `parity.ts` (helper) + `parity.live.test.ts` (skipIf no PG config). Option C adoptada (parity test only V1.0, NO CHECK array hardcoded en DB).

3. **Issue 3 (polish) — anti pre-up-marker bug check INSIDE la migration**. Spec V1.0 decía "verify DDL via information_schema POST migrate:up" — eso es out-of-band check (otra session). **Fix canónico**: bloque `DO $$ RAISE EXCEPTION` dentro de la migration misma (post-DDL, post-seed), patrón TASK-838. Si markers se invierten o SQL falla parcialmente silente, la migration aborta loud.

4. **Issue 4 (polish) — `default_for_business_lines` campo pre-emptive abstraction**. Spec V1.0 lo declaraba como "reservado para V1.1 inferencia automática". **Fix canónico**: eliminar el campo de V1.0 DDL (YAGNI; campos dormidos son drift latente). Si emerge V1.1, ADD COLUMN nullable migration — cero costo aplazar.

5. **Issue 5 (polish) — parity test cubre los 3 arrays, no solo `data_sources`**. `view_codes[]` y `capabilities[]` tienen el mismo riesgo de drift (seed module referencia view_code/capability que no existe en `VIEW_REGISTRY` o `entitlements-catalog`). **Fix canónico**: el parity test del Issue 2 valida los 3 arrays en una sola pasada — drift en cualquiera de los 3 rompe build.

Spec arquitectónica `GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` bump v1.1 → v1.2 con Delta correspondiente al §5.1 (rename + COMMENT canónico).

## Summary

Crea el schema `greenhouse_client_portal` con 3 tablas (`modules`, `module_assignments`, `module_assignment_events`), append-only triggers, índices hot-path, 10 módulos seed canónicos, y extiende `engagement_commercial_terms` con columna `bundled_modules TEXT[]`. Incluye **parity test live TS↔DB** que cubre 3 arrays (`data_sources` + `view_codes` + `capabilities`) replicando el shape canónico TASK-611 `capabilities_registry`. Anti pre-up-marker check INSIDE la migration (TASK-838 pattern). Base estructural sobre la cual se construyen los slices 4-8.

## Why This Task Exists

Sin las tablas + seed, el resolver canónico (TASK-825), admin endpoints (TASK-826), composition layer (TASK-827), cascade (TASK-828) y reliability (TASK-829) no tienen sustrato. Es prerequisito DB de todos los slices downstream. Independiente de TASK-822/823 (puede correr en paralelo). Cierra OQ-3 documentada en TASK-822 (parity test `ClientPortalDataSource` TS↔DB).

## Goal

- 1 migración aplicada que crea schema + 3 tablas + indexes + CHECK + append-only triggers + 10 seed rows + bloque DO anti pre-up-marker INSIDE la migration
- Extension a `engagement_commercial_terms` con `bundled_modules TEXT[]`
- Parity test live `src/lib/client-portal/data-sources/parity.{ts,live.test.ts}` que valida los 3 arrays (data_sources + view_codes + capabilities) contra TS sources of truth (skipIf cuando no hay PG config)
- Tipos Kysely regenerados
- Backward compat 100% (no toca tablas existentes salvo el ADD COLUMN nullable)
- Cero campos dormidos (sin `default_for_business_lines` V1.0; ADD COLUMN en V1.1 si emerge)

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` V1.2 §5 (Data Model con rename `business_line` → `applicability_scope`), §16 (Hard Rules)
- `docs/architecture/GREENHOUSE_BUSINESS_LINES_ARCHITECTURE_V1.md` (canónico: NO duplicar enum del catálogo `service_modules`)
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md` — ownership `greenhouse_ops` + grants `greenhouse_runtime`
- `CLAUDE.md` sección "Database — Migration markers" (TASK-838 pattern)
- Patrón fuente canónico parity test: `src/lib/capabilities-registry/parity.{ts,live.test.ts}` (TASK-611)

Reglas obligatorias:

- Migration generada con `pnpm migrate:create` (NUNCA editar timestamp manual)
- Marker `-- Up Migration` exacto al inicio
- **Anti pre-up-marker check INSIDE la migration**: bloque `DO $$ RAISE EXCEPTION` post-DDL + post-seed que aborta loud si tablas/triggers/indexes/seed count no coinciden con el contract (TASK-838 pattern). Defense-in-depth contra markers invertidos o SQL parcialmente silente.
- Grants: ownership `greenhouse_ops` + grants `greenhouse_runtime` (read/write a runtime; ownership a ops)
- `engagement_commercial_terms.bundled_modules` columna NULLABLE con DEFAULT `ARRAY[]::TEXT[]` (back-compat 100%)
- 10 modules seed con view_codes + capabilities + data_sources VERBATIM del spec V1.2 §5.5
- **NO** crear `default_for_business_lines` campo V1.0 (YAGNI; ADD COLUMN nullable en V1.1 si emerge)
- **NO** crear FK física desde `bundled_modules[]` a `modules.module_key` (boundary cross-schema; FK lógica via parity test + reactive consumer en TASK-828)
- **NO** crear CHECK constraint sobre `data_sources[]` con array literal hardcodeado (drift latente cada vez que TS union se extienda — Option C adoptada por verdict)
- Campo renombrado `business_line` → `applicability_scope` con COMMENT canónico que aclara que es metavalue del dominio client_portal, NO FK al business_line canónico 360

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

- `migrations/<ts>_task-824-client-portal-ddl.sql` (1 migration con DDL + seed + bloque DO anti pre-up-marker)
- `src/types/db.d.ts` (regenerado via `pnpm db:generate-types`)
- `src/lib/client-portal/data-sources/parity.ts` (helper canónico: lee seed DB, compara con TS sources of truth de los 3 arrays)
- `src/lib/client-portal/data-sources/parity.test.ts` (unit tests del helper con fixtures inline)
- `src/lib/client-portal/data-sources/parity.live.test.ts` (live PG test con `describe.skipIf(!hasPgConfig)` — replica TASK-611 shape)

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

### Slice 1 — Migration DDL schema + tablas + triggers + bloque DO anti pre-up-marker

- Crear migration con `pnpm migrate:create task-824-client-portal-ddl`
- `-- Up Migration` marker exacto al inicio
- `CREATE SCHEMA greenhouse_client_portal`
- 3 CREATE TABLE: `modules`, `module_assignments`, `module_assignment_events` con DDL verbatim del spec V1.2 §5.1–§5.3 (incluye rename `applicability_scope` + COMMENT)
- 9 índices (hot path + UNIQUE partial `module_assignments_one_active`)
- 4 funciones + 4 triggers (modules append-only check + 2 anti-UPDATE/DELETE en `module_assignment_events`)
- Grants ownership `greenhouse_ops` + grants `greenhouse_runtime`
- **Bloque `DO $$ RAISE EXCEPTION` anti pre-up-marker** al final (post-DDL + post-seed): verifica que las 3 tablas, los 4 triggers, los 9 índices, los 10 seed rows y la columna `bundled_modules` quedaron creados realmente (TASK-838 pattern)

### Slice 2 — Seed 10 modules

INSERT verbatim del spec V1.2 §5.5 (con `applicability_scope` en lugar de `business_line`):

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

NOTA: el seed INSERT debe ir en la misma migration que las DDL (NO migration separada) para que el bloque DO anti pre-up-marker pueda verificar `seed count = 10` post-execution.

### Slice 3 — Extension engagement_commercial_terms

- `ALTER TABLE greenhouse_commercial.engagement_commercial_terms ADD COLUMN bundled_modules TEXT[] DEFAULT ARRAY[]::TEXT[]`
- Comment: "Module keys del catálogo `greenhouse_client_portal.modules`. Cascade en TASK-828. FK lógica via parity test + reactive consumer (NO FK física por boundary cross-schema)."

### Slice 4 — Parity test live TS↔DB (3 arrays)

Replica shape canónico TASK-611 `capabilities_registry`:

- `src/lib/client-portal/data-sources/parity.ts` — helper que lee seed DB (`SELECT module_key, data_sources, view_codes, capabilities FROM greenhouse_client_portal.modules WHERE effective_to IS NULL`), compara contra 3 TS sources of truth:
  - `data_sources[]` ⇆ `ClientPortalDataSource` type union de `src/lib/client-portal/dto/reader-meta.ts`
  - `view_codes[]` ⇆ `VIEW_REGISTRY` keys de `src/config/...` (verificar location real durante implementación)
  - `capabilities[]` ⇆ `entitlements-catalog` capability keys
- `src/lib/client-portal/data-sources/parity.test.ts` — unit tests del helper con fixtures inline (sin PG)
- `src/lib/client-portal/data-sources/parity.live.test.ts` — `describe.skipIf(!hasPgConfig)('TASK-824 — client portal modules live parity (PG)', ...)`. Report shape: `{ dataSourcesDriftInTsNotInSeed, dataSourcesDriftInSeedNotInTs, viewCodesDriftInSeedNotInRegistry, viewCodesDriftInRegistryNotInSeed, capabilitiesDriftInSeedNotInCatalog, capabilitiesDriftInCatalogNotInSeed, inSync: boolean }`
- CI gate: live test corre cuando hay PG config (post `pnpm pg:connect`); local + lint-only runs skip.

### Slice 5 — Verify + types regen + smoke

- `pnpm migrate:up` (la migration falla loud por el bloque DO si algo no quedó creado)
- Verify out-of-band: `information_schema.tables`, `pg_constraint`, `pg_trigger`, `pg_indexes` retornan counts esperados
- Smoke SQL: INSERT assignment con UNIQUE partial → segundo INSERT del mismo (org,module) activo falla
- Smoke SQL: UPDATE en `module_assignment_events` → falla con mensaje append-only
- Smoke SQL: UPDATE breaking en `modules.applicability_scope` → falla con mensaje append-only
- Smoke SQL: INSERT con `status='pilot' AND expires_at IS NULL` → falla por CHECK
- `pnpm db:generate-types` regenera `src/types/db.d.ts` con 3 tablas nuevas + columna `bundled_modules`
- `pnpm tsc --noEmit` verde
- `pnpm test src/lib/client-portal/data-sources` verde
- Live parity test verde (cuando hay PG config)

## Out of Scope

- Helpers TS de domain (resolver, commands) — TASK-825 + TASK-826
- Endpoints HTTP — TASK-826
- UI — TASK-827
- Cascade reactive consumer — TASK-828
- Reliability signals del subsystem `Client Portal Health` — TASK-829
- FK física `bundled_modules[]` → `modules` (deliberadamente NO; cross-schema; FK lógica via parity test + cascade TASK-828)
- Campo `default_for_business_lines` (eliminado V1.0 por YAGNI; ADD COLUMN nullable migration en V1.1 si emerge necesidad real de inferencia automática)
- CHECK constraint sobre `data_sources[]` con array literal (Option A descartada — drift latente; Option C parity test only adoptada V1.0)
- Registry table `client_portal_data_source_catalog` (Option B reservada para V1.1+ si catalog crece > 30 values)

## Detailed Spec

Ver `GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` V1.2 §5.1–§5.5. DDL canónico ajustando:

- Schema target: `greenhouse_client_portal`
- Ownership: `greenhouse_ops` + grants `greenhouse_runtime`
- Campo `applicability_scope` (rename desde V1.0 `business_line`) con COMMENT canónico que aclara que NO es FK al business_line del 360
- SIN campo `default_for_business_lines` (eliminado V1.0)
- Comments en columnas críticas (status, source, view_codes, capabilities, data_sources, pricing_kind, expires_at, bundled_modules, applicability_scope)
- **Bloque DO anti pre-up-marker** al final (post-DDL + post-seed)

### Patrón canónico anti pre-up-marker (TASK-838 mirror)

```sql
-- Up Migration

CREATE SCHEMA IF NOT EXISTS greenhouse_client_portal;

CREATE TABLE greenhouse_client_portal.modules (
  module_key        TEXT PRIMARY KEY,
  ...
  applicability_scope TEXT NOT NULL
    CHECK (applicability_scope IN ('globe','wave','crm_solutions','staff_aug','cross')),
  ...
);

COMMENT ON COLUMN greenhouse_client_portal.modules.applicability_scope IS
  'Categoría de aplicabilidad del módulo dentro del dominio client_portal. NO es FK al business_line canónico del 360 (greenhouse_core.service_modules.module_code WHERE module_kind=''business_line''). Mezcla dimensiones ortogonales: business_lines reales (globe, wave, crm_solutions), metavalue cross=aplicable-a-múltiples, y service_module staff_aug=dentro-de-cross. Para resolver el business_line canónico del cliente consumidor, usar greenhouse_core.business_line_metadata. Hard rule canonizada en GREENHOUSE_BUSINESS_LINES_ARCHITECTURE_V1.md: NO duplicar enum del catalogo.';

-- ... resto DDL + seed INSERTs

-- Anti pre-up-marker check (TASK-838 pattern, INSIDE migration)
DO $$
DECLARE
  expected_tables TEXT[] := ARRAY['modules', 'module_assignments', 'module_assignment_events'];
  expected_triggers TEXT[] := ARRAY[
    'modules_append_only_check',
    'prevent_update_on_assignment_events',
    'prevent_delete_on_assignment_events'
  ];
  expected_indexes TEXT[] := ARRAY[
    'modules_business_line', -- conserva nombre o rename a modules_applicability_scope
    'module_assignments_one_active',
    'module_assignments_org',
    'module_assignments_module',
    'module_assignment_events_assignment'
  ];
  missing TEXT;
  seed_count INTEGER;
  has_bundled_modules BOOLEAN;
BEGIN
  -- Verify tables
  FOR missing IN
    SELECT t FROM unnest(expected_tables) AS t
    WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema='greenhouse_client_portal' AND table_name=t
    )
  LOOP
    RAISE EXCEPTION 'TASK-824 anti pre-up-marker check FAILED: table % was NOT created.', missing;
  END LOOP;

  -- Verify triggers
  FOR missing IN
    SELECT t FROM unnest(expected_triggers) AS t
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname=t
    )
  LOOP
    RAISE EXCEPTION 'TASK-824 anti pre-up-marker check FAILED: trigger % was NOT created.', missing;
  END LOOP;

  -- Verify seed count
  SELECT count(*) INTO seed_count FROM greenhouse_client_portal.modules WHERE effective_to IS NULL;
  IF seed_count != 10 THEN
    RAISE EXCEPTION 'TASK-824 anti pre-up-marker check FAILED: expected 10 seed modules, got %.', seed_count;
  END IF;

  -- Verify bundled_modules extension
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='greenhouse_commercial'
      AND table_name='engagement_commercial_terms'
      AND column_name='bundled_modules'
  ) INTO has_bundled_modules;
  IF NOT has_bundled_modules THEN
    RAISE EXCEPTION 'TASK-824 anti pre-up-marker check FAILED: engagement_commercial_terms.bundled_modules column was NOT created.';
  END IF;
END $$;
```

### Verificación out-of-band (post `pnpm migrate:up`)

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

-- Seed: 10 modules, distribución per applicability_scope
SELECT count(*), applicability_scope FROM greenhouse_client_portal.modules
  WHERE effective_to IS NULL GROUP BY applicability_scope;
-- expect 10 total: globe=5, cross=2, staff_aug=1, crm_solutions=1, wave=1

-- Extension engagement_commercial_terms
SELECT column_name FROM information_schema.columns
  WHERE table_schema='greenhouse_commercial'
    AND table_name='engagement_commercial_terms'
    AND column_name='bundled_modules';
-- expect 1

-- NO existe campo default_for_business_lines (V1.0 lo eliminó)
SELECT count(*) FROM information_schema.columns
  WHERE table_schema='greenhouse_client_portal'
    AND table_name='modules'
    AND column_name='default_for_business_lines';
-- expect 0
```

## Acceptance Criteria

- [ ] `pnpm migrate:up` aplica migración sin errores (incluye bloque DO anti pre-up-marker post-DDL+seed)
- [ ] Schema `greenhouse_client_portal` existe
- [ ] 3 tablas existen con DDL verbatim del spec V1.2
- [ ] Campo renombrado: `modules.applicability_scope` (NO `business_line`) con COMMENT canónico explícito
- [ ] **NO existe** campo `default_for_business_lines` en `modules` (verificado via `information_schema.columns` → count=0)
- [ ] UNIQUE partial `module_assignments_one_active` enforced (smoke INSERT segundo activo falla)
- [ ] 2 triggers anti-UPDATE/DELETE en `module_assignment_events` (smoke UPDATE falla)
- [ ] Trigger append-only en `modules` (smoke UPDATE de `applicability_scope` falla)
- [ ] CHECK constraint `pilot requires expires_at` (smoke INSERT pilot sin expires falla)
- [ ] 10 filas en `modules` con seed verbatim del spec V1.2 §5.5
- [ ] Distribución per `applicability_scope`: globe=5, cross=2, staff_aug=1, crm_solutions=1, wave=1
- [ ] Extension `engagement_commercial_terms.bundled_modules TEXT[] DEFAULT ARRAY[]::TEXT[]` aplicada
- [ ] **Parity test live verde** (`src/lib/client-portal/data-sources/parity.live.test.ts`): los 3 arrays (data_sources, view_codes, capabilities) de los 10 seed modules ⇆ TS sources of truth (skipIf no PG config; en CI lane con PG corre)
- [ ] Parity helper unit tests verde (`parity.test.ts` con fixtures sin PG)
- [ ] `pnpm db:generate-types` regenera `src/types/db.d.ts` con 3 tablas nuevas + columna `bundled_modules`
- [ ] Ownership: `greenhouse_ops` + grants `greenhouse_runtime` correctos
- [ ] `pnpm migrate:status` reporta migration aplicada
- [ ] `pnpm tsc --noEmit` verde

## Verification

- `pnpm migrate:up` (falla loud si bloque DO detecta DDL/seed incompleto)
- `pnpm migrate:status`
- `pnpm db:generate-types`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/client-portal/data-sources` (parity unit + live tests)
- `pnpm pg:connect:shell` para 7 smokes manuales (los 6 originales + verify NO default_for_business_lines)

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado con entry visible (rename `business_line` → `applicability_scope`, parity test, anti pre-up-marker)
- [ ] Spec arquitectónica `GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` V1.2 sincronizada (§5.1 rename + COMMENT + §5.6 deferred fields cleanup)
- [ ] Chequeo cruzado: TASK-825 (resolver), TASK-826 (admin endpoints), TASK-828 (cascade) desbloqueadas; sus specs reciben Delta si referencian `business_line`
- [ ] CLAUDE.md sección nueva sobre parity test pattern client_portal si emerge nueva invariante (probablemente NO — el pattern ya está canonizado en TASK-611 invariants)
- [ ] EPIC-015 progress actualizado (child 3/8 cerrado)
- [ ] Cierra OQ-3 de TASK-822 (parity test TS↔DB shipped)

## Follow-ups

- TASK-825 puede arrancar inmediatamente (necesita las 3 tablas + seed listos)
- TASK-826 puede arrancar inmediatamente (necesita las 3 tablas + seed listos)
- TASK-828 cascade desbloqueada (necesita columna `bundled_modules` + 10 modules seed para mapeo)
- Si emerge necesidad de FK física `bundled_modules[]` → modules, documentar en ADR (decisión actual V1.0: NO física, FK lógica via parity test + cascade reactive consumer TASK-828)
- Si emerge `default_for_business_lines` real V1.1, ADD COLUMN nullable migration (cero costo aplazar; YAGNI applies)
- Considerar índice GIN sobre `view_codes[]` y `capabilities[]` si TASK-825 resolver lo necesita (deferred al benchmark real)
- Si el catalog `ClientPortalDataSource` crece > 30 values en V1.1+, migrar de Option C (parity test only) a Option B (registry table `client_portal_data_source_catalog`) — pattern TASK-611 `capabilities_registry` exactamente replicable

## Open Questions

- (Resuelta por verdict v1.1) ~~¿`default_for_business_lines` se usa desde V1.0 o queda dormido para V1.1?~~ → Eliminado V1.0 por YAGNI. ADD COLUMN nullable migration en V1.1 si emerge necesidad real.
- (Resuelta por verdict v1.1) ~~¿Validar `view_codes[]` y `capabilities[]` referencian entries reales? Recomendación: lint rule en TASK-825~~ → Parity test live cubre los 3 arrays (data_sources + view_codes + capabilities) en una sola pasada (Issue 5 verdict v1.1). NO se difiere a TASK-825 — vive con la DDL.
- (Resuelta por verdict v1.1) ~~¿CHECK constraint sobre `data_sources[]` con array literal vs registry table?~~ → Option C adoptada V1.0 (parity test only, NO CHECK array hardcoded). Option B (registry table) reservada V1.1+ si catalog crece > 30 values.
- (Heredada de TASK-822 OQ-3) parity test TS↔DB → ESTA task lo entrega (Slice 4).
