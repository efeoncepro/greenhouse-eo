# TASK-780 — Home Rollout Flag Platform (PG-backed, scope-aware, observable)

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `platform`
- Status real: `Cerrada 2026-05-04 — código en main, producción Ready, V2 confirmado renderizando`
- Domain: `platform`
- Blocked by: `none`
- Branch: `develop` → `main` (commit `0bbfa6ee`)

## Summary

Reemplazar la env var binaria `HOME_V2_ENABLED` por una tabla canónica `greenhouse_serving.home_rollout_flags` con resolución scope-aware (`user > role > tenant > global`), in-memory cache, env fallback graceful, drift signal en el Reliability Control Plane, y endpoint admin para mutaciones. La motivación inmediata: producción mostraba home legacy y staging mostraba home V2 porque la env var solo estaba seteada en staging — diagnóstico que tardó 30 min y no escaló.

## Why This Task Exists

- **Síntoma**: usuario detectó que `dev-greenhouse.efeoncepro.com/home` (V2 con KPI cards) no coincide con `greenhouse.efeoncepro.com/home` (legacy Nexa Insights). Sospechó que su merge a producción había omitido cambios.
- **Causa raíz**: `main` y `develop` están en el mismo SHA (`c132f4ee`). Ambos deploys (production + staging) corren del mismo commit. La diferencia es runtime: env var `HOME_V2_ENABLED=true` solo está en staging.
- **Por qué la env var es frágil**: requiere redeploy para cambiar, no permite rollback gradual, no permite per-tenant rollout para clientes Globe (Sky/airline pilots), no permite kill-switch por usuario, y crea un patrón que se replicará por cada feature flag futura (acumulación de env vars binarias).
- **Patrón canónico ya existe**: `greenhouse_serving.home_block_flags` tiene la shape correcta (scope_type / scope_id / enabled / reason) con resolución `user > role > tenant > global`. Esta task la generaliza para flags de shell (no solo per-block) y la conecta al Reliability Control Plane.

## Goal

- Tabla `home_rollout_flags` PG-backed con CHECK constraints, idempotent seed, audit trigger.
- Resolver TS server-only con cache TTL 30s + fallback env var + conservative default disabled.
- Reliability signal `home.rollout.drift` que detecta divergencia PG↔env y opt-out rate > 5%.
- Sentry tag `home_version: 'v2' | 'legacy'` en todos los errores del flujo home.
- Admin endpoint REST con validación, capability gating, cache invalidation post-mutation.
- 30 tests unitarios cubriendo precedencia, cache, fallback, validación, drift detection.
- Documentación canónica en CLAUDE.md y plan de deprecación legacy en 4 fases.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` (registry + signals)
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md` (anti-parche, primitives canónicas)
- `docs/architecture/GREENHOUSE_HOME_PLATFORM_V1.md` (si existe — TASK-696)

Reglas obligatorias:

- **NUNCA** crear env vars binarias para feature flags nuevas. Toda nueva flag de shell/UI debe nacer como fila en `home_rollout_flags` (extender CHECK si emerge nueva semantic flag) o como block en `home_block_flags`.
- **NUNCA** leer `process.env.HOME_V2_ENABLED` directo en código nuevo. Solo el resolver canónico (`src/lib/home/rollout-flags.ts`) lo hace, y solo como fallback graceful cuando PG falla.
- **NUNCA** componer la decisión de variant en el cliente. Server-only.
- Seguir el patrón TASK-765/TASK-774/TASK-777: VIEW canónica → helper TS → reliability signal → CHECK constraint → tests.

## Phase Plan

### Phase 1 — Paridad de variantes en producción ✅ (resuelto vía PG flag, no env var)

**Resolución**: el seed PG `home_v2_shell global enabled=true` aplicado en la única instancia Cloud SQL `greenhouse-pg-dev` (compartida entre staging y production) ya hace que el resolver canónico devuelva `enabled=true` para cualquier subject en cualquier environment. El env var `HOME_V2_ENABLED` queda como red de seguridad opcional para fallback durante PG outage — no es necesaria para el rollout, y agregarla quedó pendiente como mejora opcional gobernada por sandbox approval.

**Verificación 2026-05-04**:

- Commit `0bbfa6ee` mergeado a `main`. Production deploy `greenhouse-n3k9r4bhj` Ready.
- Auth health producción: `overallStatus=ready` (azure-ad + google + credentials).
- Smoke test `/home` con sesión de agente: HTML contiene literales V2 ("Reliability", "Margen mes") — confirmado V2 renderizando.
- PG flag verificada: 1 fila `home_v2_shell global enabled=true`.
- Reliability signal `home.rollout.drift` activa en `/api/admin/reliability` (verificado live 2026-05-04 11:02 UTC).
- Followup: corregido bug query SQL `is_active` → `active` (la columna real en `greenhouse_core.client_users`). Tests verde post-fix.

### Phase 2 — Migración del switch a tabla PG canónica ✅

- Migration `20260504102323120_task-780-home-rollout-flags.sql`
- Tabla `home_rollout_flags` con CHECK constraints (scope, scope_id required when not global, flag_key whitelist)
- Seed idempotente: `home_v2_shell` global enabled
- Audit trigger `set_updated_at`
- Resolver `src/lib/home/rollout-flags.ts` (PG-first → env fallback → conservative default)
- Cache in-memory TTL 30s (clearable for tests)
- Mutation store `src/lib/home/rollout-flags-store.ts` (upsert/delete/list)
- Validation: scope_id constraints, reason ≥ 5 chars (audit floor)
- Refactor `src/app/(dashboard)/home/page.tsx` para usar el resolver
- Marca `isHomeV2GloballyEnabled` como deprecated (kept para compat transition)

### Phase 3 — Observability + reliability signal ✅

- Reader `src/lib/reliability/queries/home-rollout-drift.ts`
- Signal id `home.rollout.drift`, kind `drift`, módulo `home`, severity error si count > 0
- Detección triple: (a) falta fila global, (b) PG flag diverge de env fallback, (c) opt-out rate > 5%
- Wired en `get-reliability-overview.ts` con fallback `unknown` graceful
- Sentry tag `home_version: 'v2' | 'legacy'` via `captureHomeShellError`
- Telemetry log estructurado en `recordHomeRender` con `homeVersion`
- Defensive try/catch en `page.tsx`: V2 falla → degrade a legacy + capture domain incident

### Phase 4 — Admin control surface ✅

- Endpoint `GET/POST/DELETE /api/admin/home/rollout-flags`
- Auth: `requireAdminTenantContext` (EFEONCE_ADMIN tenant)
- Idempotent: POST con misma triple key updates row; DELETE returns 0 si no existe
- Cache invalidation automática post-mutation
- Errores sanitizados (sin stack traces)

### Phase 5 — Deprecación legacy (post 30-day stable)

- **Trigger**: 30 días corridos donde `home.rollout.drift` reporte severity=ok y `home_version=v2` errors ≤ legacy errors en Sentry.
- **Decisión**: convocar a Julio para review del dashboard reliability + decidir cutover total.
- **Acciones al cutover**:
  - DELETE `import HomeViewLegacy` y `<HomeViewLegacy />` de `page.tsx`
  - DELETE `src/views/greenhouse/home/HomeView.tsx` y dependencias exclusivas
  - DELETE env var `HOME_V2_ENABLED` de Vercel (los 3 environments)
  - DELETE función `isHomeV2GloballyEnabled` de `flags.ts`
  - UPDATE CHECK constraint `home_rollout_flags_key_check` (cuando emerja nueva flag de shell, agregarla; sino quedará un solo valor histórico por compatibility)
  - Outbox event `home.v2_rollout_completed` con audit trail
- **Spec del cutover**: TASK derivada al ejecutarse, no parte de TASK-780 actual.

## Files Created / Modified

### Created

- `migrations/20260504102323120_task-780-home-rollout-flags.sql` (89 líneas)
- `src/lib/home/rollout-flags.ts` (resolver, 200 líneas)
- `src/lib/home/rollout-flags-store.ts` (mutations, 165 líneas)
- `src/lib/home/rollout-flags.test.ts` (12 tests)
- `src/lib/home/rollout-flags-store.test.ts` (10 tests)
- `src/lib/reliability/queries/home-rollout-drift.ts` (drift signal, 150 líneas)
- `src/lib/reliability/queries/home-rollout-drift.test.ts` (8 tests)
- `src/app/api/admin/home/rollout-flags/route.ts` (admin endpoint)
- `docs/tasks/in-progress/TASK-780-home-rollout-flag-platform.md` (este doc)

### Modified

- `src/lib/home/flags.ts` — `isHomeV2GloballyEnabled` marcada `@deprecated`
- `src/lib/home/observability.ts` — agregado `HomeVersionTag`, `captureHomeShellError`, `homeVersion` en `RecordHomeRenderInput`
- `src/app/(dashboard)/home/page.tsx` — usa resolver async, defensive try/catch con fallback a legacy
- `src/lib/reliability/registry.ts` — `home` module ahora declara `expectedSignalKinds: ['runtime', 'incident', 'drift']` y nuevo dependency
- `src/lib/reliability/get-reliability-overview.ts` — wired `homeRolloutDrift` source

## Verification

- ✅ `pnpm test src/lib/home src/lib/reliability` → 146/146 tests verdes (incluyendo 30 nuevos)
- ✅ `npx tsc --noEmit` → 0 errores
- ✅ `pnpm lint` → 0 errores en archivos nuevos (319 warnings pre-existentes irrelevantes)
- ✅ `pnpm build` → producción exitosa
- ✅ Migration aplicada en local: tabla existe, seed presente
- ⏳ Verificación E2E en staging: pendiente al deploy
- ⏳ Verificación E2E en production: pendiente al cutover env var (Phase 1)

## Dependencies & Impact

- **Depende de**: schema `greenhouse_serving` existente, `home_block_flags` patrón canónico (TASK-696)
- **Impacta a**:
  - `/home` route — ahora resolución async PG-first
  - `/admin/operations` — nueva señal en módulo `home`
  - Sentry `domain=home` events — ahora taggeados con `home_version`
  - Cualquier futura feature flag de UI/shell debería usar este patrón en vez de env var
- **Archivos owned**: ver lista en "Files Created/Modified"

## Operator Runbook

### Activar V2 globalmente (caso default post-Phase 1)
```sql
INSERT INTO greenhouse_serving.home_rollout_flags (flag_key, scope_type, scope_id, enabled, reason)
VALUES ('home_v2_shell', 'global', NULL, TRUE, 'TASK-780 cutover')
ON CONFLICT (flag_key, scope_type, COALESCE(scope_id, ''))
DO UPDATE SET enabled = TRUE, reason = EXCLUDED.reason;
```

### Disable V2 para un tenant específico (e.g. cliente piloto Globe)
```sql
INSERT INTO greenhouse_serving.home_rollout_flags (flag_key, scope_type, scope_id, enabled, reason)
VALUES ('home_v2_shell', 'tenant', '<tenant-id>', FALSE, 'Pilot rollout — tenant requested legacy')
ON CONFLICT (flag_key, scope_type, COALESCE(scope_id, ''))
DO UPDATE SET enabled = FALSE, reason = EXCLUDED.reason;
```

### Disable V2 para un usuario (rollback de emergencia)
```sql
INSERT INTO greenhouse_serving.home_rollout_flags (flag_key, scope_type, scope_id, enabled, reason)
VALUES ('home_v2_shell', 'user', '<user-id>', FALSE, 'Emergency rollback — user reported bug')
ON CONFLICT (flag_key, scope_type, COALESCE(scope_id, ''))
DO UPDATE SET enabled = FALSE;
```

### Via admin endpoint (preferido cuando exista UI)
```bash
curl -X POST /api/admin/home/rollout-flags \
  -H 'Content-Type: application/json' \
  -d '{"flagKey":"home_v2_shell","scopeType":"tenant","scopeId":"client-globe-sky","enabled":false,"reason":"Sky pilot legacy preference"}'
```

## Notes

- Si en el futuro emerge una flag de shell nueva (ej. `home_v3_shell`), extender la CHECK constraint de `flag_key` y agregar el valor a la union type. Mantener nombres `home_<variant>_<surface>` para legibilidad.
- El cache TTL=30s deliberadamente corto: balance entre latencia (cache hit p99 < 1ms) y velocidad de propagación de cambios (cualquier cambio admin se ve en máximo 30s sin redeploy).
- La tabla `home_block_flags` (TASK-696) y `home_rollout_flags` (esta task) coexisten: la primera gobierna kill-switches per-block (granularidad fina dentro de V2), la segunda gobierna variantes de shell (V2 vs legacy). Concerns separados.
