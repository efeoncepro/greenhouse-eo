# TASK-801 — Engagement Primitive: services + cost_attribution Extension

## Delta 2026-05-06 (post-audit Phase 2 — pre-implementación)

Auditoría pre-implementación detectó dos desvíos vs el repo real. Spec arch heredada (`GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md` §3.2) tiene la misma desviación; ambos ajustes son mecánicos y preservan el intent.

1. **`services.service_id` es `TEXT`, no `UUID`.** Spec declara FK como `UUID REFERENCES services(service_id)`. Realidad: el PK de `services` es `text` y `assignment_id` también es `text`. **Ajuste**: usar `service_id TEXT REFERENCES greenhouse_core.services(service_id)`.

2. **`commercial_cost_attribution_v2` es VIEW, no TABLE.** Creada en TASK-708 y refinada en TASK-709b. Es UNION ALL de 3 CTEs. No se le puede `ALTER TABLE`. **Ajuste**: usar `CREATE OR REPLACE VIEW` agregando `'operational'::TEXT AS attribution_intent` literal. La columna existe en el shape para que consumers downstream puedan filtrarla; cuando TASK-802/806 introduzcan JOIN a `engagement_commercial_terms`, la derivación real se actualiza.

## Delta 2026-05-06

- Auditoría arch-architect detectó 30 filas fantasma en `core.services` seedeadas el 2026-03-16 como cross-product `service_modules × clients` con `hubspot_service_id IS NULL`. Después de aplicar la DDL de TASK-801 (que defaultea `engagement_kind='regular'` para todas), **TASK-813 reclasificará esas 30 filas a `engagement_kind='discovery'` + `status='legacy_seed_archived'` + `active=FALSE`**.
- No requiere cambio en la DDL de TASK-801. El default `'regular'` es backward-compat correcto; TASK-813 corrige las fantasmas post-migration.
- Recomendación: **correr TASK-813 inmediatamente después de TASK-801** y antes de TASK-802 onward, para evitar que las extensiones (`engagement_commercial_terms`, `engagement_phases`, etc.) se declaren contra services fantasma.

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `migration`
- Epic: `EPIC-014`
- Status real: `Implementado y verificado 2026-05-06`
- Domain: `commercial`
- Blocked by: `none`
- Branch: `develop` (migration directa, sin branch dedicado)
- Migration: `20260506200742463_task-801-engagement-primitive-services-extension.sql`

## Closure Evidence (2026-05-06)

- Migration aplicada vía `pnpm pg:connect:migrate` — output `Migrations complete!` + `Types updated in src/types/db.d.ts`.
- 4 columnas creadas verificadas via `information_schema.columns`:
  - `greenhouse_core.services.engagement_kind` text NOT NULL DEFAULT 'regular'
  - `greenhouse_core.services.commitment_terms_json` jsonb NULL
  - `greenhouse_core.client_team_assignments.service_id` text NULL
  - `greenhouse_serving.commercial_cost_attribution.attribution_intent` text NOT NULL DEFAULT 'operational'
- 2 CHECK constraints verificados via `pg_constraint`:
  - `services_engagement_kind_check` enforces enum {regular,pilot,trial,poc,discovery}
  - `commercial_cost_attribution_attribution_intent_check` enforces enum {operational,pilot,trial,poc,discovery,overhead}
- 1 índice partial verificado via `pg_indexes`: `client_team_assignments_service_idx WHERE service_id IS NOT NULL`
- VIEW `commercial_cost_attribution_v2` reescrita preservando shape TASK-709b + columna `attribution_intent` literal `'operational'`. SELECT live retorna 9 rows con dimensión nueva visible.
- Backward compat 100%: 30/30 services preservan `engagement_kind='regular'`, 9/9 attribution rows preservan `attribution_intent='operational'`.
- Types regenerados en `src/types/db.d.ts` (368 tablas introspected, 969ms).
- Verificación: `pnpm exec tsc --noEmit` clean, `pnpm lint` clean, `pnpm test src/lib/services src/lib/commercial-cost-attribution` 39/39 pass, `pnpm build` clean.

## Summary

Slice 1 del Epic Sample Sprints. Migration DDL puro: extiende `greenhouse_core.services` con `engagement_kind` + `commitment_terms_json`, agrega FK opcional `client_team_assignments.service_id`, y extiende `commercial_cost_attribution` v1 + v2 con `attribution_intent`. Sin código de aplicación, sin UI. Es la base sobre la cual los siguientes 9 slices construyen.

## Why This Task Exists

Hoy `services` no distingue "facturable" vs "muestra". `client_team_assignments` no se ancla a service específico (si Valentina trabaja en Sky en general vs Sky Content Lead, no es distinguible). `commercial_cost_attribution` no marca intent (operational vs pilot) lo que hace imposible reclasificar costo GTM read-time. Esta task introduce las 4 columnas que habilitan todo lo demás.

## Goal

- Migration aplica limpiamente en dev sin lock contention significativo.
- Schema TS (`db.d.ts`) regenera con las 4 columnas nuevas tipadas.
- Default `'regular'` y `'operational'` mantienen comportamiento backward-compat 100%.
- Verificación post-migration via `information_schema` confirma columnas existen con CHECK constraints aplicados.

## Architecture Alignment

Spec canónica: `docs/architecture/GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md` §3.2 Capa 1 + 1b.

Reglas obligatorias:

- `pnpm migrate:create <slug>` — NUNCA hand-edit timestamps.
- Migration empieza con `-- Up Migration` marker (anti TASK-768 silent failure).
- `attribution_intent` se aplica a **ambas** tablas: `commercial_cost_attribution` (v1) **y** `commercial_cost_attribution_v2` (canónica).
- DEFAULT `'regular'` y `'operational'` mantienen backward compat.
- Verificar via `information_schema.columns` post-migrate (no asumir éxito por "migrate complete!").

## Slice Scope (DDL)

```sql
-- 1. services: engagement_kind + commitment_terms_json
ALTER TABLE greenhouse_core.services
  ADD COLUMN engagement_kind TEXT NOT NULL DEFAULT 'regular'
    CHECK (engagement_kind IN ('regular','pilot','trial','poc','discovery')),
  ADD COLUMN commitment_terms_json JSONB;

COMMENT ON COLUMN greenhouse_core.services.engagement_kind IS
  'Sub-tipo de engagement comercial. UI brand "Sample Sprint" envuelve los 4 valores non-regular. '
  'Genérico para sobrevivir marketing pivots — ver EPIC-014.';

-- 2. client_team_assignments: service_id FK opcional
ALTER TABLE greenhouse_core.client_team_assignments
  ADD COLUMN service_id UUID REFERENCES greenhouse_core.services(service_id) ON DELETE SET NULL;
CREATE INDEX client_team_assignments_service_idx
  ON greenhouse_core.client_team_assignments (service_id)
  WHERE service_id IS NOT NULL;

-- 3. commercial_cost_attribution v1
ALTER TABLE greenhouse_serving.commercial_cost_attribution
  ADD COLUMN attribution_intent TEXT NOT NULL DEFAULT 'operational'
    CHECK (attribution_intent IN ('operational','pilot','trial','poc','discovery','overhead'));

-- 4. commercial_cost_attribution v2
ALTER TABLE greenhouse_serving.commercial_cost_attribution_v2
  ADD COLUMN attribution_intent TEXT NOT NULL DEFAULT 'operational'
    CHECK (attribution_intent IN ('operational','pilot','trial','poc','discovery','overhead'));
```

## Acceptance Criteria

- `pnpm migrate:up` aplica sin errores.
- `pnpm db:generate-types` regenera `db.d.ts` con las 4 columnas tipadas correctamente.
- `pnpm pg:connect:shell` + `\d+ greenhouse_core.services` muestra `engagement_kind` + `commitment_terms_json` con CHECK.
- `\d+ greenhouse_core.client_team_assignments` muestra `service_id` con FK.
- `\d+ greenhouse_serving.commercial_cost_attribution` y `commercial_cost_attribution_v2` muestran `attribution_intent` con CHECK.
- `pnpm test` verde sin nuevos tests (ningún consumer existente debe romperse).
- Existing consumers de `services` siguen funcionando sin filtrar por `engagement_kind` (default 'regular' preserva semántica actual).

## Dependencies

- Dependencies: ninguna (es DDL puro, base del Epic).
- Impacta a: TASK-802 a TASK-810 (todos los siguientes slices dependen de Slice 1).

## Verification (post-merge)

- Verificar via SQL: `SELECT count(*) FROM greenhouse_core.services WHERE engagement_kind = 'regular';` debe coincidir con count total pre-migration.
- Verificar via SQL: `SELECT count(*) FROM greenhouse_serving.commercial_cost_attribution WHERE attribution_intent = 'operational';` debe coincidir con count total pre-migration.

## References

- Spec: `docs/architecture/GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md` §3.2 Capa 1 + 1b
- Epic: `docs/epics/to-do/EPIC-014-sample-sprints-engagement-platform.md`
