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

Todos los endpoints reservados originalmente ya están activos. No queda ningún `501` publicado.

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
- `POST /quotes/reprice-bulk`
- `POST /margin-feedback/materialize` (TASK-482)

## Margin Feedback Loop (TASK-482)

`POST /margin-feedback/materialize` converge el feedback de rentabilidad ya
existente: reutiliza los materializers de quotation y contract sin duplicarlos,
genera señales de calibración y emite el evento canónico
`commercial.margin_feedback.batch_completed` para consumers downstream.

Body aceptado (todos los campos opcionales):

```json
{
  "year": 2026,
  "month": 4,
  "monthsBack": 1
}
```

Defaults: si no se indica período, usa el mes actual; `monthsBack` cae a `1`
(re-materializa mes actual + mes anterior) y se clampa a `[0, 12]`.

Respuesta (200):

```json
{
  "service": "commercial-cost-worker",
  "timestamp": "2026-04-21T22:00:00.000Z",
  "result": {
    "runId": "mfb-…",
    "periods": [{ "year": 2026, "month": 3 }, { "year": 2026, "month": 4 }],
    "quotationCount": 12,
    "contractCount": 3,
    "calibrationSignals": {
      "quotationDriftDistribution": {
        "p50Pct": -1.2, "p90Pct": -8.4, "maxAbsPct": 14.3, "sampleSize": 12
      },
      "quotationDriftBucketCounts": { "aligned": 7, "warning": 4, "critical": 1 },
      "contractDriftDistribution": { "p50Pct": 0.5, "p90Pct": -4.1, "maxAbsPct": 6.8, "sampleSize": 3 },
      "contractDriftBucketCounts": { "aligned": 2, "warning": 1, "critical": 0 },
      "topDriftByPricingModel": [
        { "pricingModel": "retainer", "commercialModel": "retainer", "meanDriftPct": -6.3, "sampleSize": 4 }
      ]
    },
    "serviceGrainAvailable": false,
    "startedAt": "2026-04-21T22:00:00.000Z",
    "completedAt": "2026-04-21T22:00:04.120Z",
    "durationMs": 4120
  }
}
```

Notas operativas:

- Es **idempotente** — delega a los materializers que UPSERT por
  `(quotation_id|contract_id, period_year, period_month)`. Re-ejecutar el
  mismo período sobrescribe el snapshot con las cifras más recientes.
- **No muta el catálogo comercial.** Los `calibrationSignals` son lecturas
  agregadas sobre los snapshots; la recalibración manual de assumptions vive
  en el lane comercial y se decide fuera del worker.
- **`serviceGrainAvailable: false`** mientras TASK-452 no cierre
  (`greenhouse_serving.service_attribution` no existe). El probe chequea
  `information_schema` y flipea automáticamente cuando la tabla aparezca;
  el enriquecimiento de drift por servicio se agrega entonces en un
  follow-up sin romper el contrato actual.
- Scheduler: `margin-feedback-materialize-daily` corre a las **5:10 AM
  America/Santiago**, 10 minutos después del `commercial-cost-materialize-daily`
  para que `commercial_cost_attribution` esté fresca antes de calcular
  drift. Si el cost-basis base retrasa, el feedback loop levanta las cifras
  del snapshot previo — sin error — y la severidad se alinea cuando el
  próximo run re-materialize.

Manual trigger contra staging vía `pnpm staging:request`:

```bash
pnpm staging:request POST '/margin-feedback/materialize' '{"monthsBack":2}'
```


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
