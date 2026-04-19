# Commercial Cost Worker

Servicio dedicado en Cloud Run para materializar la base de costos comercial fuera del runtime web de Vercel.

## Que resuelve

Este worker separa del portal web las corridas pesadas que alimentan el programa de cost basis comercial. La meta es que el portal pueda disparar o inspeccionar refreshes sin ejecutar el calculo completo dentro de una request serverless.

## Que materializa hoy

- `people` -> refresca `member_capacity_economics`
- `roles` -> materializa `role_modeled_cost_basis_snapshots`
- `tools` -> refresca `provider_tooling_snapshots` + `tool_provider_cost_basis_snapshots`
- `bundle` -> orquesta `people` + `tools` + `commercial_cost_attribution` + `client_economics`

## Que aun no implementa

Estos endpoints quedan reservados para las siguientes tasks del programa y hoy responden `501`:

- `quotes/reprice-bulk`
- `margin-feedback/materialize`

## Trazabilidad operativa

Cada corrida deja dos rastros:

1. `greenhouse_sync.source_sync_runs`
   - `source_system = 'commercial_cost_worker'`
   - sirve para ver estado global de la corrida
2. `greenhouse_commercial.commercial_cost_basis_snapshots`
   - una fila por `scope + period + run`
   - guarda manifest de entrada, resumen, estado y tenant scope asociado
3. `greenhouse_commercial.role_modeled_cost_basis_snapshots`
   - una fila por `role_id + employment_type_code + period`
   - guarda costo modelado loaded, provenance, confidence y detail del supuesto
4. `greenhouse_commercial.tool_provider_cost_basis_snapshots`
   - una fila por `tool_id + provider_id + period + tenant_scope_key`
   - guarda costo resuelto, provenance, freshness, confidence y metadata FX

## Endpoints activos

- `GET /health`
- `POST /cost-basis/materialize`
- `POST /cost-basis/materialize/people`
- `POST /cost-basis/materialize/roles`
- `POST /cost-basis/materialize/tools`
- `POST /cost-basis/materialize/bundle`

## Relacion con ops-worker

`ops-worker` sigue teniendo `POST /cost-attribution/materialize` como lane existente y fallback manual. Pero el roadmap nuevo del programa de cost basis ya no debe seguir cargando ese servicio con stages adicionales del engine comercial.

La topologia objetivo es:

- `ops-worker` -> reactividad operativa + lanes existentes
- `commercial-cost-worker` -> base de costos comercial y sus siguientes etapas

## Operacion

- Deploy: `ENV=staging bash services/commercial-cost-worker/deploy.sh`
- Auto-deploy Cloud Run: `.github/workflows/commercial-cost-worker-deploy.yml`
- Auth de deploy: GitHub Actions + Workload Identity Federation usando el mismo `github-actions-deployer@efeonce-group.iam.gserviceaccount.com` del baseline del repo
- Scheduler base: `commercial-cost-materialize-daily`
- Region: `us-east4`
- Auth: IAM de Cloud Run con fallback opcional `CRON_SECRET`

## Estado validado 2026-04-19

- Workflow GitHub Actions validado: runs `24629415478` y `24629615574`
- Revisión lista en Cloud Run: `commercial-cost-worker-00002-9xj`
- Smoke run manual del scheduler: HTTP `200`
- Evidencia persistida:
  - `greenhouse_sync.source_sync_runs.sync_run_id = commercial-cost-6382a7ca-50fb-403c-b2c0-33dfba0f5503`
  - `greenhouse_commercial.commercial_cost_basis_snapshots.snapshot_key = ccb:bundle:2026-04:global:commercial-cost-6382a7ca-50fb-403c-b2c0-33dfba0f5503`
  - `records_written = 56`
  - `records_failed = 0`
- Corrección aplicada post-smoke: el join de `client_labor_cost_allocation` quedó endurecido con alias explícito en `member-period-attribution.ts` y test de regresión dedicado.
