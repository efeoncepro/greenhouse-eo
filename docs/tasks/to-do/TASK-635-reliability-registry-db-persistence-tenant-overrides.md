# TASK-635 — Reliability Registry DB Persistence & Tenant Overrides

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-007`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`. Pull-trigger: la primera vez que se necesite un override por tenant o un SLO configurable.
- Branch: `task/TASK-635-reliability-registry-db-persistence-tenant-overrides`

## Summary

Migra el `RELIABILITY_REGISTRY` desde código estático a un híbrido DB-backed con overrides per-tenant y SLOs configurables. Mantiene el seed estático como fuente de defaults (idempotente al boot) y permite que cada tenant ajuste qué módulos ve, qué señales considera críticas y qué thresholds dispara `degraded`/`broken`.

## Why This Task Exists

`TASK-600` cerró foundation V1 con registry estático en código. Esa decisión se tomó porque hoy no hay necesidad de overrides por tenant ni SLOs configurables, y una tabla DB sin caso de uso es overengineering. Esta task es la pull-trigger: cuando aparezca la primera necesidad real (ej: cliente enterprise pide ver solo finance, o quiere alertar a 90% de freshness en vez de 80%), se ejecuta esta migración. **Mientras no haya ese caso de uso, esta task no debe ejecutarse.**

## Goal

- Tabla `greenhouse_core.reliability_module_registry` con seed idempotente desde el código actual.
- Tabla `greenhouse_core.reliability_module_overrides` con `space_id` + `module_key` + ajustes (`hidden`, `expected_signal_kinds_extra`, `slo_overrides`).
- Reader `getReliabilityRegistryForTenant(spaceId)` que merge defaults + overrides.
- Migration path no-breaking: por defecto, todos los tenants ven exactamente lo que ven hoy.
- Admin Center surface mínima para gestionar overrides (deferred slice o follow-up).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — §9 deja claro que V1 NO persiste; esta task lo cambia formalmente.
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md` — perfiles runtime/migrator/admin
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` — node-pg-migrate + Kysely
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md` — `space_id` como tenant boundary

Reglas obligatorias:

- el seed estático sigue siendo la **fuente de defaults**. La DB solo guarda diffs/overrides.
- toda query filtra por `space_id` (tenant isolation).
- migración aditiva: si la tabla está vacía, todo funciona como hoy.
- canonical owner del schema: `greenhouse_ops`.
- usa Kysely (`getDb()`) — modulo nuevo.
- IDs `EO-RMR-XXXX` para registry rows, `EO-RMO-XXXX` para overrides.

## Normative Docs

- `src/lib/reliability/registry.ts` (seed actual)
- `src/lib/reliability/get-reliability-overview.ts` (consumer)
- `src/types/reliability.ts` (contracts)
- `src/lib/db.ts` + `src/types/db.d.ts` (Kysely)

## Dependencies & Impact

### Depends on

- `TASK-600` (entregada): contracts, registry estático, reader.
- Base de migración `node-pg-migrate` operativa (TASK-202+).
- `TASK-633` (recomendado): `filesOwned` debería migrar también si se decide DB-backed (decisión de scope abajo).

### Blocks / Impacts

- Habilita SLO management por tenant (foundation para futuro FinOps avanzado).
- Habilita "hide module" / "extend module" sin redeploy.
- Bloquea (si se decide ahora): TASK-633 que define `filesOwned` también puede vivir aquí.

### Files owned

- `[verificar] migrations/<timestamp>_create-reliability-registry-tables.sql`
- `[verificar] src/lib/reliability/registry-store.ts` — DB-backed reader/writer
- `src/lib/reliability/registry.ts` — refactor a `STATIC_RELIABILITY_REGISTRY` (seed) + `getReliabilityRegistry(spaceId)` que mergea
- `src/lib/reliability/get-reliability-overview.ts` — consumir reader DB-aware
- `src/types/db.d.ts` (auto-regenerada)
- `[verificar] src/app/api/admin/reliability/registry/route.ts` — CRUD admin (deferred slice)

## Current Repo State

### Already exists

- `RELIABILITY_REGISTRY` estático en `src/lib/reliability/registry.ts` (4 módulos sembrados).
- Reader `buildReliabilityOverview(operations)` que itera el registry estático.
- Patrón canonical de migrations + Kysely types.
- `space_id` como tenant boundary con FKs documentadas.

### Gap

- Sin overrides per-tenant ni SLOs configurables.
- Cada cambio al registry requiere deploy.
- No hay surface admin para editar la lectura por módulo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema + seed idempotente

```sql
CREATE TABLE greenhouse_core.reliability_module_registry (
  module_key text PRIMARY KEY,
  label text NOT NULL,
  description text NOT NULL,
  domain text NOT NULL,
  routes jsonb NOT NULL DEFAULT '[]',
  apis jsonb NOT NULL DEFAULT '[]',
  dependencies jsonb NOT NULL DEFAULT '[]',
  smoke_tests jsonb NOT NULL DEFAULT '[]',
  expected_signal_kinds jsonb NOT NULL DEFAULT '[]',
  files_owned jsonb NOT NULL DEFAULT '[]',
  slo_thresholds jsonb NOT NULL DEFAULT '{}',  -- e.g. { freshness_max_lag_hours: 6 }
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE greenhouse_core.reliability_module_overrides (
  override_id text PRIMARY KEY,                 -- 'EO-RMO-{uuid8}'
  space_id text NOT NULL REFERENCES greenhouse_core.spaces(space_id),
  module_key text NOT NULL REFERENCES greenhouse_core.reliability_module_registry(module_key),
  hidden boolean NOT NULL DEFAULT false,
  extra_signal_kinds jsonb NOT NULL DEFAULT '[]',
  slo_overrides jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(space_id, module_key)
);
```

- Seed boot script: `ensureReliabilityRegistrySeed()` corre el seed estático con `INSERT ... ON CONFLICT DO UPDATE SET <fields>` para mantener defaults sincronizados desde código.

### Slice 2 — Reader DB-backed

- `getReliabilityRegistryForTenant(spaceId)` lee defaults DB + aplica overrides.
- Cache in-memory con TTL 60s (registry rara vez cambia).
- Si DB no responde, fallback al seed estático en código (degradación honesta).

### Slice 3 — Reader integration

- `buildReliabilityOverview(operations, { spaceId })` ahora accept tenant context.
- `/api/admin/reliability` resuelve `spaceId` desde `requireAdminTenantContext()`.

### Slice 4 — Admin surface mínima (deferred / follow-up)

- API `/api/admin/reliability/registry/overrides` (CRUD).
- Sub-surface en `Admin Center > Cloud & Integrations` para listar/editar overrides.
- Solo se implementa cuando aparezca el primer caso de uso.

## Out of Scope

- SLO breach alerts (eso es post-implementation, depende de cadencia synthetic).
- Per-tenant rebranding del label/description (low value).
- Custom signal kinds (hoy son enum cerrado; abrir el enum requiere decisión arquitectónica separada).

## Detailed Spec

Migration path:

1. Migration crea tablas vacías.
2. Boot script (idempotente) sincroniza seed estático con la tabla `reliability_module_registry`. Si el código declara un módulo nuevo, aparece en DB. Si el código actualiza un campo, se actualiza en DB (excepto si hay override explícito).
3. Tabla `overrides` empieza vacía → comportamiento idéntico al actual.

Decisión clave: **el código sigue siendo source of truth para defaults**. La DB solo persiste:
- el seed actual (para tener datos consultables sin parsear código)
- diffs reales hechos por admins per-tenant

Esto evita drift: si alguien edita el registry en DB y olvida actualizar código, el próximo deploy reescribe los defaults (con `ON CONFLICT DO UPDATE`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] migración crea ambas tablas; seed boot las popula desde código.
- [ ] `getReliabilityRegistryForTenant(spaceId)` retorna mismos datos que el registry estático cuando no hay overrides.
- [ ] `getReliabilityRegistryForTenant(spaceId)` aplica overrides cuando existen.
- [ ] `/api/admin/reliability` consulta el registry DB-aware sin regresión visible.
- [ ] fallback al seed estático funciona si DB queda inaccesible.

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm test src/lib/reliability/registry-store.test.ts`
- `pnpm migrate:up` (auto-regenera tipos).
- `pnpm pg:doctor`.
- inspección manual con override sintético para un space de testing.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] chequeo cruzado: TASK-632 (synthetic), TASK-633 (filesOwned), TASK-634 (incident rules)
- [ ] actualizar `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` §9 (cosas que NO hace V1) — mover el bullet de "no persiste el registry" a "v1 no persistía; v1.1 sí".
- [ ] documentar en `Handoff.md` la pull-trigger que disparó esta task.

## Follow-ups

- Surface admin completa para CRUD de overrides (Slice 4 si se difiere).
- SLO breach detector como cron que compare señales reales contra `slo_thresholds` y emita señal `kind=metric`.
- Audit log de cambios al registry (event outbox).

## Open Questions

- ¿`filesOwned` (TASK-633) y reglas de incident (TASK-634) también migran a DB aquí, o cada una mantiene su propia tabla?
- ¿El registry sigue versionado en código y la DB es solo proyección, o la DB se vuelve la fuente de verdad y el código solo siembra el bootstrap?
