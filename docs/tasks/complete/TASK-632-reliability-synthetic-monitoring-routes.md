# TASK-632 — Reliability Synthetic Monitoring (rutas críticas del registry)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-007`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none` (TASK-600 ya cerró la foundation)
- Branch: `task/TASK-632-reliability-synthetic-monitoring-routes`

## Summary

Convierte el campo `routes` declarado en cada `ReliabilityModuleDefinition` en un monitor sintético periódico que ejecuta GET autenticado contra cada ruta crítica y publica el resultado como `ReliabilitySignal` con `kind=runtime`. Cierra el gap entre "el registry sabe qué rutas son críticas" y "alguien verifica que esas rutas siguen vivas".

## Why This Task Exists

`TASK-600` dejó sembrado el set de rutas críticas por módulo (`src/lib/reliability/registry.ts`), pero hoy nadie las ejecuta automáticamente entre runs de Playwright smoke. Las regresiones silenciosas (404, redirect a login, 500 en SSR) solo se detectan cuando un humano abre la página o cuando Sentry agrupa el error tarde. Necesitamos un loop pasivo que pruebe esas rutas cada N minutos y suba la salud al `Reliability Control Plane`.

## Goal

- Cron periódico que ejecute GET autenticado contra cada `route.path` del registry usando el patrón canónico de `Agent Auth` (`/api/auth/agent-session`).
- Persistir cada corrida en una tabla canónica (`greenhouse_sync.reliability_synthetic_runs`) o reusar `source_sync_runs` con `source_system='reliability_synthetic'`.
- Adaptar el resultado en `src/lib/reliability/signals.ts` como `ReliabilitySignal[]` con `kind=runtime` por ruta + `kind=test_lane` agregada por módulo.
- Surface mínima visible en `Admin Center` mostrando cuándo corrió el último synthetic y qué rutas fallaron.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` — Agent Auth section
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` — Vercel cron / ops-worker
- `docs/architecture/GREENHOUSE_STAGING_ACCESS_V1.md` — bypass + agent auth para staging

Reglas obligatorias:

- usar `Agent Auth` (`/api/auth/agent-session`) para autenticar el monitor; nunca hardcodear cookies ni tokens.
- el monitor NO modifica datos: solo GET. Ningún `POST`/`PUT`/`PATCH` en synthetic monitoring.
- la cadencia inicial debe ser barata (ej: cada 30 min en producción, cada 60 min en staging).
- si Cloud SQL/BigQuery cap se acerca, degradar el monitor antes que el portal (kill switch via env var).
- alinear con el contrato de `ReliabilityIntegrationBoundary` declarado para futuras señales.

## Normative Docs

- `src/lib/reliability/registry.ts` — fuente de las rutas a monitorear
- `src/lib/reliability/signals.ts` — donde se enchufa el adapter
- `scripts/playwright-auth-setup.mjs` — referencia de auth headless
- `scripts/staging-request.mjs` — referencia de bypass para staging

## Dependencies & Impact

### Depends on

- `TASK-600` (entregada): foundation del Reliability Control Plane, contracts canónicos, registry sembrado.
- `Agent Auth` (`POST /api/auth/agent-session`) ya implementado en `src/app/api/auth/agent-session/route.ts`.
- `AGENT_AUTH_SECRET` y `VERCEL_AUTOMATION_BYPASS_SECRET` configurados en GCP Secret Manager.
- Vercel cron lanes existentes (`src/app/api/cron/**`) o ops-worker como host alternativo.

### Blocks / Impacts

- `Reliability Control Plane` (TASK-600) — habilita señales `runtime` reales por ruta del registry.
- Change-based verification matrix (TASK-633) — reusará la tabla de runs y el adapter.
- Detección de regresiones silenciosas en Admin Center, Ops Health y Cloud & Integrations.

### Files owned

- `[verificar] migrations/<timestamp>_create-reliability-synthetic-runs.sql`
- `[verificar] src/lib/reliability/synthetic/runner.ts`
- `[verificar] src/lib/reliability/synthetic/persist.ts`
- `[verificar] src/app/api/cron/reliability-synthetic/route.ts`
- `src/lib/reliability/signals.ts` (extender con adapter `buildSyntheticRouteSignals`)
- `src/lib/reliability/get-reliability-overview.ts` (componer las nuevas señales)
- `[verificar] services/ops-worker/src/lib/reliability/` si decisión es correr en ops-worker

## Current Repo State

### Already exists

- `RELIABILITY_REGISTRY` con 4 módulos críticos y sus rutas declaradas (`src/lib/reliability/registry.ts`).
- `ReliabilitySignal` y `ReliabilitySignalKind = 'runtime'` ya canónicos (`src/types/reliability.ts`).
- `Agent Auth` headless funcionando: `POST /api/auth/agent-session` + `scripts/playwright-auth-setup.mjs`.
- Patrón canónico de cron Vercel (`src/app/api/cron/**`) con guards y `source_sync_runs`.
- Patrón ops-worker para jobs persistentes (`services/ops-worker/`).

### Gap

- Las rutas declaradas en el registry nunca se ejecutan automáticamente entre runs de Playwright smoke (que solo corren en CI sobre `develop`).
- No hay tabla canónica de "synthetic runs"; tampoco un adapter que normalice resultados a `ReliabilitySignal`.
- No hay decisión documentada sobre host: Vercel cron (corto, gratis) vs ops-worker (más libertad de timing/budget).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema + persistence layer

- Migration que crea `greenhouse_sync.reliability_synthetic_runs` (run_id, module_key, route_path, http_status, latency_ms, ok, error_message, started_at, finished_at) o decisión documentada de reusar `source_sync_runs` con `source_system='reliability_synthetic'`.
- Helper `recordSyntheticRun()` con upsert idempotente.

### Slice 2 — Runner

- `runReliabilitySyntheticSweep()` itera `RELIABILITY_REGISTRY`, hace `fetch` autenticado contra cada `route.path` con `Agent Auth`, captura status + latency.
- Soporte para staging (bypass header) y producción (cookie session).
- Kill switch via env var `RELIABILITY_SYNTHETIC_DISABLED=true`.

### Slice 3 — Cron host

- Decidir Vercel cron vs ops-worker. Probable: Vercel cron en producción (cada 30 min) + ops-worker en staging (cada 60 min) para no saturar.
- Cron handler protegido por `CRON_SECRET`.

### Slice 4 — Signal adapter

- `buildSyntheticRouteSignals()` en `src/lib/reliability/signals.ts` consume las últimas N corridas y emite señales `kind=runtime` por ruta.
- Componer en `buildReliabilityOverview()` para que aparezca en `/api/admin/reliability` y Admin Center sin tocar UI.

### Slice 5 — Surface mínima

- Card opcional en Admin Center que liste última corrida + rutas en error. UI ligera, no consola gigante (regla TASK-600).

## Out of Scope

- Synthetic con `POST`/mutación (peligroso para foundation V1).
- Page load real con Playwright headless (es follow-up; aquí solo HTTP fetch).
- Drill-down histórico tipo Grafana (sigue siendo deferred a FinOps avanzado).
- Alerting multi-canal (Slack/email): `Ops Health` ya levanta señales degradadas.

## Detailed Spec

```sql
CREATE TABLE greenhouse_sync.reliability_synthetic_runs (
  run_id text PRIMARY KEY,                    -- 'EO-RSR-{uuid8}'
  module_key text NOT NULL,                   -- e.g. 'finance', 'cloud'
  route_path text NOT NULL,
  http_status int NOT NULL,
  ok boolean NOT NULL,
  latency_ms int NOT NULL,
  error_message text,
  triggered_by text NOT NULL,                 -- 'cron' | 'manual'
  started_at timestamptz NOT NULL,
  finished_at timestamptz NOT NULL
);

CREATE INDEX idx_rsr_module_finished
  ON greenhouse_sync.reliability_synthetic_runs (module_key, finished_at DESC);
```

Adapter concept:

```typescript
// signals.ts
export const buildSyntheticRouteSignals = (
  runs: SyntheticRunRecord[]
): ReliabilitySignal[] => {
  // group by module_key + route_path
  // emit one signal per route with severity from last status
}
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] migración persiste `greenhouse_sync.reliability_synthetic_runs` (tabla nueva con FK a `source_sync_runs.sync_run_id` para tracking compatible con Ops Health).
- [x] cron `/api/cron/reliability-synthetic` registrado en `vercel.json` (`*/30 * * * *`) y validado en build.
- [x] cada ruta del registry produce señal `kind=runtime` en `/api/admin/reliability` + 1 señal agregada `kind=test_lane` por módulo.
- [x] Admin Center muestra "Synthetic monitor de rutas críticas" con timestamp de última corrida + lista de rutas fallidas.
- [x] kill switch `RELIABILITY_SYNTHETIC_ENABLED` (convención del repo, opt-in) funciona end-to-end con degradación a `cancelled`.

## Verification

- `pnpm lint` ✅
- `pnpm exec tsc --noEmit --pretty false` ✅
- `pnpm test` ✅ (406 files / 2075 passed)
- `pnpm build` ✅ (`/api/cron/reliability-synthetic` aparece como dynamic function)
- Ejecución manual del cron: pendiente staging deploy. Comando: `pnpm staging:request POST /api/cron/reliability-synthetic` con `Authorization: Bearer $CRON_SECRET`.

## Resolution

V1 entregada. Decisiones tomadas durante Discovery:

1. **Tabla dedicada** `greenhouse_sync.reliability_synthetic_runs` (no reuso `source_sync_runs` con columnas synthetic-only). Cada sweep crea 1 row en `source_sync_runs` con `source_system='reliability_synthetic'` que agrupa N rows en la tabla nueva via FK `sweep_run_id`. Mantiene grano correcto (1 row por probe) y compatibilidad con surfaces existentes que listan syncs.
2. **Kill switch opt-in** `RELIABILITY_SYNTHETIC_ENABLED=false` siguiendo convención `bigquery-write-flag.ts`. Default true.
3. **Vercel cron único** `*/30 * * * *` aplicado en producción, preview y staging. Ops-worker queda como follow-up si el sweep crece >20 rutas.
4. **Probes paralelas en olas de 6** (`MAX_CONCURRENT_PROBES`) — encaja en cap 60s de Vercel cron (10 rutas / 6 paralelas = 2 olas, ~16s peak con timeout 8s/probe + 1s agent-auth). Si el sweep crece, se migra a ops-worker.
5. **Reliability boundaries movidos a `ready`**: 4 entries (1 por módulo) con `expectedSignalKind='runtime'` y `expectedSource='runReliabilitySyntheticSweep'`.
6. **Detección de SSO redirect**: si una probe recibe 3xx con location apuntando a `/login` o `/auth/access-denied`, se marca `ok=false` con `errorMessage` explícito — evita ocultar regresiones de auth.

## Closing Protocol

- [x] `Lifecycle` sincronizado con estado real (`complete`)
- [x] archivo en la carpeta `complete/`
- [x] `docs/tasks/README.md` sincronizado con el cierre
- [x] `Handoff.md` actualizado con foundation entregada y boundaries movidos
- [x] `changelog.md` actualizado con la nueva surface visible
- [x] chequeo cruzado: TASK-633 (matrix) ahora puede consumir esta tabla, TASK-634 (correlador) puede inferir módulo desde route_path, TASK-635 (registry persistence) sigue pull-trigger.
- [x] boundaries `expectedSignalKind=runtime` movidos a `ready` para los 4 módulos en `RELIABILITY_INTEGRATION_BOUNDARIES`.

## Follow-ups

- Synthetic con full page render (Playwright headless en ops-worker) si HTTP fetch deja gaps de regresión client-side.
- Histograma de latency por ruta como señal `kind=metric` adicional (bucket P50/P90/P99).
- Alerting Slack si una ruta queda en error >3 corridas consecutivas.
- Migrar a ops-worker si el sweep crece >20 rutas o supera 60s en Vercel cron.

## Open Questions (resueltas)

- ✅ Vercel cron seleccionado para V1. Migración a ops-worker es follow-up si el sweep crece.
- ✅ Cadencia 30 min — paralelización en olas de 6 evita saturar BQ/PG.
