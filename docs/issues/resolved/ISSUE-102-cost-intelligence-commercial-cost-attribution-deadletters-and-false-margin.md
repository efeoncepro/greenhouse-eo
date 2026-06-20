# ISSUE-102 — Cost Intelligence publicaba margen falso por Cost Attribution degradado

## Ambiente

dev/staging data plane (Cloud SQL `greenhouse_app`; mismo dominio Finance/Cost Intelligence que alimenta dashboards y Reliability Overview)

## Detectado

2026-06-20, durante la auditoría Finance (`docs/audits/finance/FINANCE_DOMAIN_AUDIT_2026-06-20.md`), hallazgos F7/F8.

## Síntoma

- `greenhouse_sync.handler_health` conservaba handlers `commercial_cost_attribution:*` en `failed` por `infra.db_privilege / permission denied for schema greenhouse_serving`.
- `greenhouse_sync.outbox_reactive_log` tenía dead letters activas para esos handlers.
- `greenhouse_serving.operational_pl_snapshots` publicaba junio 2026 con revenue real y costo `0`, por lo que el margen quedaba artificialmente inflado.

## Causa raíz

La causa raíz inicial de F7 ya había sido corregida antes de este cierre: el runtime de `commercial_cost_attribution` intentaba ejecutar DDL (`CREATE TABLE IF NOT EXISTS greenhouse_serving.commercial_cost_attribution`) desde el rol de aplicación. Eso dejó dead letters históricas que seguían contaminando `handler_health`.

F8 tenía una segunda clase de bug: `materializeOperationalPl()` tragaba fallos técnicos de Cost Attribution y seguía publicando snapshots. Además, cuando la capa upstream estaba vacía, no existía un health gate que distinguiera costo real `0` de costo desconocido.

## Impacto

- Dashboards y consumers de P&L podían tratar margen con costo `0` como canónico.
- Nexa o cualquier insight financiero apoyado en `operational_pl` podía razonar sobre un margen incompleto.
- Ops Health mostraba handlers históricos fallidos aunque el runtime ya podía procesar correctamente.

## Solución

Resuelto por `TASK-1190`:

- `scripts/reactive-backfill.ts` expone `--replay-failed-handlers` y `--handler=<key>` para replay focal de handlers históricos sin borrar evidencia.
- Replay focal de 9 handlers `commercial_cost_attribution:*`: `126` eventos drenados, `4` scopes coalesced, `0` failures.
- `materializeOperationalPl()` deja de capturar silenciosamente errores técnicos de `materializeCommercialCostAttributionForPeriod`.
- Nuevo signal `finance.operational_pl.cost_coverage_degraded` en Reliability Overview detecta períodos con revenue > 0, costo total = 0 y sin upstream en `commercial_cost_attribution` ni `client_labor_cost_allocation_consolidated`.

## Verificación

- `greenhouse_sync.handler_health`: `21` handlers `commercial_cost_attribution:*` en `healthy`, `0` en `failed`.
- `greenhouse_sync.outbox_reactive_log`: `0` dead letters activas CCA.
- Mayo 2026: `commercial_cost_attribution` conserva `3` rows / `2,706,028.15` CLP loaded cost; `operational_pl_snapshots` conserva costo por scope.
- Junio 2026: permanece con costo `0` porque no existe payroll period junio `approved/exported`; queda cubierto por `finance.operational_pl.cost_coverage_degraded`.
- Signal runtime: `severity=error`, períodos `2025-11`, `2025-12`, `2026-01`, `2026-06`.
- Gates: `pnpm task:lint --task TASK-1190`, `pnpm ops:lint --changed`, vitest focal `7/7`, `pnpm tsc --noEmit`.

## Estado

resolved (2026-06-20)

## Relacionado

- `TASK-1190` — `docs/tasks/complete/TASK-1190-cost-intelligence-recovery-and-health-gate.md`
- Auditoría Finance F7/F8 — `docs/audits/finance/FINANCE_DOMAIN_AUDIT_2026-06-20.md`
- Arquitectura Cost Intelligence — `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
- Arquitectura Commercial Cost Attribution — `docs/architecture/GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md`
