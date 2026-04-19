# Commercial Cost Worker

Servicio dedicado en Cloud Run para materializar la base de costos comercial fuera del runtime web de Vercel.

## Que resuelve

Este worker separa del portal web las corridas pesadas que alimentan el programa de cost basis comercial. La meta es que el portal pueda disparar o inspeccionar refreshes sin ejecutar el calculo completo dentro de una request serverless.

## Que materializa hoy

- `people` -> refresca `member_capacity_economics`
- `tools` -> refresca `provider_tooling_snapshots`
- `bundle` -> orquesta `people` + `tools` + `commercial_cost_attribution` + `client_economics`

## Que aun no implementa

Estos endpoints quedan reservados para las siguientes tasks del programa y hoy responden `501`:

- `roles`
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

## Endpoints activos

- `GET /health`
- `POST /cost-basis/materialize`
- `POST /cost-basis/materialize/people`
- `POST /cost-basis/materialize/tools`
- `POST /cost-basis/materialize/bundle`

## Relacion con ops-worker

`ops-worker` sigue teniendo `POST /cost-attribution/materialize` como lane existente y fallback manual. Pero el roadmap nuevo del programa de cost basis ya no debe seguir cargando ese servicio con stages adicionales del engine comercial.

La topologia objetivo es:

- `ops-worker` -> reactividad operativa + lanes existentes
- `commercial-cost-worker` -> base de costos comercial y sus siguientes etapas

## Operacion

- Deploy: `ENV=staging bash services/commercial-cost-worker/deploy.sh`
- Scheduler base: `commercial-cost-materialize-daily`
- Region: `us-east4`
- Auth: IAM de Cloud Run con fallback opcional `CRON_SECRET`
