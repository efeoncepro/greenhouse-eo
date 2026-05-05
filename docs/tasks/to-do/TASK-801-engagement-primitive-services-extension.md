# TASK-801 — Engagement Primitive: services + cost_attribution Extension

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `migration`
- Epic: `EPIC-014`
- Status real: `Diseño aprobado`
- Domain: `commercial`
- Blocked by: `none`
- Branch: `task/TASK-801-engagement-primitive-services-extension`

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
