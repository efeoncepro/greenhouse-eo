# TASK-841 — Nubox ops-worker Config + Freshness Hardening

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Complete`
- Rank: `TBD`
- Domain: `finance / ops / data`
- Blocked by: `none`
- Branch: `develop` (por instrucción explícita del usuario; no cambiar rama)
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Restaurar y endurecer la sincronizacion Nubox en el runtime canonico `ops-worker`: configurar credenciales/secret refs Nubox en Cloud Run, validar replay de los tres jobs (`sync`, `quotes-hot-sync`, `balance-sync`) y corregir la observabilidad para que `conformed_sync` no parezca sano cuando `raw_sync` esta fallando o stale.

## Why This Task Exists

El 2026-05-09 se verifico en Cloud y runtime que Cloud Scheduler invoca correctamente los jobs Nubox en `ops-worker`, pero el servicio Cloud Run no tiene `NUBOX_API_BASE_URL` ni credenciales Nubox en su ambiente. Resultado observado:

- `ops-nubox-sync` corre y retorna HTTP 200, pero `raw_sync` falla con `NUBOX_API_BASE_URL is not configured`.
- `ops-nubox-quotes-hot-sync` falla repetidamente con HTTP 500 por la misma causa.
- `ops-nubox-balance-sync` corre HTTP 200, pero opera sobre conformed data existente.
- BigQuery raw Nubox queda stale desde 2026-05-03, mientras `greenhouse_conformed.nubox_*` muestra `synced_at` fresco por reprocesar snapshots viejos.
- PostgreSQL muestra `income.nubox_last_synced_at` y `expenses.nubox_last_synced_at` stale desde 2026-05-03.

La raiz no es Nubox API ni Cloud Scheduler: es un cutover incompleto de Vercel cron a `ops-worker`, mas una brecha de observabilidad que permite falsa salud operacional.

## Goal

- Declarar y provisionar la configuracion Nubox requerida por `ops-worker` de forma segura y reproducible.
- Validar replay controlado de raw -> conformed -> Postgres y de la hot lane de cotizaciones.
- Hacer que los signals/readers de salud distingan `raw fresh`, `conformed reprocessed`, `postgres projected` y `balance sync`.
- Prevenir que futuros conectores migren a `ops-worker` sin contrato de env/secrets/readiness.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_VERCEL_CRON_CLASSIFICATION_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`

Reglas obligatorias:

- Nubox sigue siendo source of truth documental/tributario para DTEs; Greenhouse sigue siendo source of truth de caja, pagos, conciliacion y `external_cash_signals`.
- Nubox no debe escribir directo en `income_payments` ni `expense_payments`; cualquier movimiento bancario Nubox entra por `greenhouse_finance.external_cash_signals`.
- `raw` BigQuery es la primera evidencia durable del source. Un `conformed_sync` fresco sobre raw viejo no puede considerarse sync sano.
- Cloud Scheduler + `ops-worker` es el hosting canonico para crons `async_critical`; no reintroducir Nubox en `vercel.json`.
- Secretos Nubox deben resolverse desde Secret Manager o secret refs seguros. No hardcodear tokens ni imprimir valores secretos en logs.
- Workarounds solo como mitigacion temporal, reversibles y documentados con condicion de retiro.

## Normative Docs

- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/MULTI_AGENT_WORKTREE_OPERATING_MODEL_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/tasks/complete/TASK-775-vercel-cron-async-critical-migration-platform.md`
- `docs/tasks/complete/TASK-260-migrate-nubox-sync-ico-member-sync-to-ops-worker.md`
- `docs/tasks/in-progress/TASK-640-nubox-v2-enterprise-enrichment.md`
- `docs/tasks/to-do/TASK-668-nubox-ops-replay-enterprise-promotion.md`

## Dependencies & Impact

### Depends on

- `services/ops-worker/server.ts` — endpoints vivos `POST /nubox/sync`, `/nubox/quotes-hot-sync`, `/nubox/balance-sync`.
- `services/ops-worker/deploy.sh` — deploy declarativo Cloud Run + Cloud Scheduler.
- `src/lib/nubox/client.ts` — requiere `NUBOX_API_BASE_URL`, `NUBOX_BEARER_TOKEN`/secret ref y `NUBOX_X_API_KEY`/secret ref.
- `src/lib/nubox/sync-nubox-orchestrator.ts` — orquestador canonico raw -> conformed -> Postgres.
- `src/lib/nubox/sync-nubox-raw.ts`
- `src/lib/nubox/sync-nubox-conformed.ts`
- `src/lib/nubox/sync-nubox-to-postgres.ts`
- `src/lib/nubox/sync-nubox-quotes-hot.ts`
- `src/lib/nubox/sync-nubox-balances.ts`
- `greenhouse_sync.source_sync_runs`
- `greenhouse_sync.source_sync_failures`
- BigQuery `greenhouse_raw.nubox_*_snapshots`
- BigQuery `greenhouse_conformed.nubox_sales`, `nubox_purchases`, `nubox_bank_movements`
- PostgreSQL `greenhouse_finance.income`, `expenses`, `external_cash_signals`

### Blocks / Impacts

- `TASK-640` Nubox V2 enterprise enrichment: no debe promoverse con raw stale.
- `TASK-668` Nubox ops replay enterprise promotion: necesita un runtime de replay confiable.
- `TASK-212`, `TASK-662`, `TASK-663`, `TASK-664`, `TASK-665`, `TASK-666`, `TASK-667`: dependen de salud basal del source adapter.
- Finance dashboards, quotes, income/expenses DTE coverage, VAT/materializaciones y HubSpot invoice mirror pueden consumir datos Nubox stale si esta task no se cierra.

### Files owned

- `services/ops-worker/deploy.sh`
- `services/ops-worker/server.ts`
- `services/ops-worker/server.test.ts`
- `services/ops-worker/README.md`
- `src/lib/nubox/client.ts`
- `src/lib/nubox/client.test.ts`
- `src/lib/nubox/sync-nubox-orchestrator.ts`
- `src/lib/nubox/sync-nubox-raw.ts`
- `src/lib/nubox/sync-nubox-conformed.ts`
- `src/lib/nubox/sync-nubox-quotes-hot.ts`
- `src/lib/reliability/**`
- `scripts/ci/**`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/operations/**` solo si se crea/actualiza runbook

## Current Repo State

### Already exists

- Cloud Scheduler jobs activos en `us-east4`:
  - `ops-nubox-sync` -> `https://ops-worker-y6egnifl6a-uk.a.run.app/nubox/sync`
  - `ops-nubox-quotes-hot-sync` -> `/nubox/quotes-hot-sync`
  - `ops-nubox-balance-sync` -> `/nubox/balance-sync`
- `ops-worker` esta `Ready` en Cloud Run.
- `vercel.json` ya no agenda Nubox, consistente con TASK-775.
- BigQuery tables Nubox existen:
  - `greenhouse_raw.nubox_sales_snapshots`
  - `greenhouse_raw.nubox_purchases_snapshots`
  - `greenhouse_raw.nubox_expenses_snapshots`
  - `greenhouse_raw.nubox_incomes_snapshots`
  - `greenhouse_conformed.nubox_sales`
  - `greenhouse_conformed.nubox_purchases`
  - `greenhouse_conformed.nubox_bank_movements`
- Unit tests Nubox focales pasan al 2026-05-09:
  - `src/lib/nubox/client.test.ts`
  - `src/lib/nubox/mappers.test.ts`
  - `src/lib/nubox/sync-plan.test.ts`
  - `src/lib/nubox/sync-nubox-to-postgres.test.ts`
  - `src/lib/nubox/dte-matching.test.ts`

### Gap

- `ops-worker` Cloud Run no tiene env/secrets Nubox declarados; `gcloud run services describe ops-worker` mostro solo Postgres/GCP env relevantes.
- `services/ops-worker/deploy.sh` usa `--set-env-vars` y no incluye `NUBOX_API_BASE_URL`, `NUBOX_BEARER_TOKEN_SECRET_REF` ni `NUBOX_X_API_KEY_SECRET_REF`.
- `source_sync_runs` muestra `raw_sync` failed y `quotes_hot_sync` failed por `NUBOX_API_BASE_URL is not configured`.
- `conformed_sync` puede terminar `succeeded` aunque raw no haya producido evidencia fresca.
- `postgres_projection` puede terminar `succeeded` usando conformed data derivada de raw viejo.
- No hay gate visible suficiente que alerte "raw stale + conformed fresh = falso positivo".

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Cloud Run Nubox config contract

- Extender `services/ops-worker/deploy.sh` para propagar la configuracion Nubox requerida por `src/lib/nubox/client.ts`.
- Preferir Secret Manager/secret refs; no introducir tokens planos en git ni logs.
- Asegurar `ensure_secret_accessor_binding` para los secretos Nubox que use `ops-worker`.
- Agregar validacion pre-deploy o preflight que falle rapido si falta `NUBOX_API_BASE_URL` o las secret refs requeridas para endpoints `/nubox/*`.
- Actualizar `services/ops-worker/README.md` con el contrato Nubox del worker.

### Slice 2 — Replay and runtime verification

- Desplegar `ops-worker` con la configuracion corregida usando el flujo canonico.
- Ejecutar replay controlado:
  - `gcloud scheduler jobs run ops-nubox-sync --location=us-east4`
  - `gcloud scheduler jobs run ops-nubox-quotes-hot-sync --location=us-east4`
  - `gcloud scheduler jobs run ops-nubox-balance-sync --location=us-east4`
- Verificar en Cloud Logging que los tres endpoints responden 2xx y sin `NUBOX_* is not configured`.
- Verificar en BigQuery que raw Nubox queda fresco despues del replay.
- Verificar en PostgreSQL que `source_sync_runs` refleja estados correctos y que `income/expenses.nubox_last_synced_at` avanzan cuando hay documentos proyectables.

### Slice 3 — Source freshness semantics

- Endurecer el estado del orquestador para que un fallo de `raw_sync` no pueda presentarse como sync sano agregado.
- Si `raw_sync` falla, el resultado del lane diario debe exponer `partial`/`degraded` aunque `conformed_sync` o `postgres_projection` terminen usando snapshots anteriores.
- Agregar pruebas que cubran:
  - raw failed + conformed succeeded => overall degraded/partial
  - raw stale + conformed fresh => signal error/warning
  - raw fresh + conformed/postgres succeeded => steady
- Mantener la tolerancia best-effort downstream, pero no esconder el estado de la primera evidencia durable.

### Slice 4 — Reliability signal and CI guard

- Agregar o actualizar reliability signal para Nubox source freshness bajo Finance/Sync Health.
- El signal debe comparar:
  - ultimo `raw_sync` exitoso por `source_system='nubox'`
  - ultimo `conformed_sync`
  - ultimo `postgres_projection`
  - ultimo `quotes_hot_sync`
  - ultimo `balance-sync` observable si queda modelado en logs/source runs
- Instalar guardrail reusable para futuros endpoints `ops-worker` que usen external clients:
  - endpoints Cloud Scheduler declarados
  - env/secrets requeridos documentados
  - readiness/preflight testable
- Actualizar docs de arquitectura y runbook si cambia el contrato operativo.

## Out of Scope

- No auto-adoptar `external_cash_signals` Nubox.
- No escribir directo en `income_payments` ni `expense_payments`.
- No cambiar el modelo documentos/caja de Finance.
- No implementar line items Nubox, PDF/XML durable artifacts ni graph V2; esos scopes viven en TASK-212/TASK-662/TASK-663.
- No ejecutar remediaciones historicas de phantoms fuera de lo necesario para validar freshness; usar runbooks existentes si aparecen cohortes historicas.
- No migrar nuevos conectores a `ops-worker` en esta task.

## Detailed Spec

### Evidencia runtime base 2026-05-09

Cloud Scheduler:

- `ops-nubox-sync`: `ENABLED`, schedule `30 7 * * *`, timezone `America/Santiago`.
- `ops-nubox-quotes-hot-sync`: `ENABLED`, schedule `*/15 * * * *`.
- `ops-nubox-balance-sync`: `ENABLED`, schedule `0 */4 * * *`.

Cloud Run logs:

- `/nubox/quotes-hot-sync` retorna HTTP 500 con `NUBOX_API_BASE_URL is not configured`.
- `/nubox/sync` retorna HTTP 200, pero el run interno registra `raw_sync` failed por falta de `NUBOX_API_BASE_URL`.
- `/nubox/balance-sync` retorna HTTP 200.

PostgreSQL:

- `greenhouse_sync.source_sync_runs` muestra `quotes_hot_sync` failed repetidamente por `NUBOX_API_BASE_URL is not configured`.
- `greenhouse_sync.source_sync_runs` muestra `raw_sync` failed para sales/purchases/expenses/incomes por `NUBOX_API_BASE_URL is not configured`.
- `greenhouse_finance.income` con `nubox_document_id IS NOT NULL`: 72; ultimo `nubox_last_synced_at`: `2026-05-03T07:30:11.104Z`.
- `greenhouse_finance.expenses` con `nubox_purchase_id IS NOT NULL`: 127; ultimo `nubox_last_synced_at`: `2026-05-03T07:30:25.247Z`.
- `greenhouse_finance.external_cash_signals` source `nubox`: 156; ultimo `observed_at`: `2026-05-01T07:30:28.295Z`.

BigQuery:

- raw sales latest: `2026-05-03 23:45:25`
- raw purchases latest: `2026-05-03 07:30:25`
- raw expenses latest: `2026-05-03 07:30:30`
- raw incomes latest: `2026-05-03 07:30:35`
- conformed sales/purchases/bank movements latest: `2026-05-09 11:30:02`, derivado de reprocesar raw viejo.

### Config contract expected

`src/lib/nubox/client.ts` requiere:

- `NUBOX_API_BASE_URL`
- `NUBOX_BEARER_TOKEN` o resolucion equivalente via `NUBOX_BEARER_TOKEN_SECRET_REF`
- `NUBOX_X_API_KEY` o resolucion equivalente via `NUBOX_X_API_KEY_SECRET_REF`

`ops-worker` debe recibir estos valores por deploy declarativo. Si se usan secret refs, el service account de Cloud Run debe tener `roles/secretmanager.secretAccessor` sobre esos secretos y el helper `resolveSecret` debe poder leerlos.

### Health semantics expected

Estado sano minimo:

- ultimo `raw_sync` exitoso Nubox dentro del SLA definido para full sync diario.
- `quotes_hot_sync` exitoso dentro del SLA de 15-30 minutos cuando la integracion Nubox esta ready.
- `conformed_sync` no mas reciente que raw por si solo; debe linkearse a una evidencia raw reciente o declararse degraded.
- `postgres_projection` debe reportar si proyecto desde conformed derivado de raw stale.
- `balance_sync` no debe compensar una raw lane rota; solo actualiza balances desde conformed.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `ops-worker` Cloud Run tiene contrato Nubox completo sin secretos planos en git.
- [x] `ops-nubox-sync` ejecuta con raw, conformed y postgres projection sin errores `NUBOX_* is not configured`.
- [x] `ops-nubox-quotes-hot-sync` ejecuta 2xx y registra `quotes_hot_sync` exitoso o partial explicito por datos, no por config faltante.
- [x] `ops-nubox-balance-sync` sigue ejecutando 2xx despues del cambio.
- [x] BigQuery raw Nubox muestra timestamps frescos post replay.
- [x] PostgreSQL `source_sync_runs` distingue correctamente raw/conformed/projection/hot lane.
- [x] Existe signal o guard que alerta si raw esta stale aunque conformed/projection parezcan recientes.
- [x] No se introdujo ningun write directo desde Nubox a `income_payments` / `expense_payments`.
- [x] La documentacion operativa refleja que `ops-worker` es owner de Nubox crons y de sus secretos runtime.

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm test src/lib/nubox/client.test.ts src/lib/nubox/mappers.test.ts src/lib/nubox/sync-plan.test.ts src/lib/nubox/sync-nubox-to-postgres.test.ts src/lib/nubox/dte-matching.test.ts`
- tests focales nuevos para reliability/freshness y deploy contract
- `node scripts/ci/vercel-cron-async-critical-gate.mjs`
- `gcloud run services describe ops-worker --region=us-east4`
- `gcloud scheduler jobs describe ops-nubox-sync --location=us-east4`
- `gcloud scheduler jobs describe ops-nubox-quotes-hot-sync --location=us-east4`
- `gcloud scheduler jobs describe ops-nubox-balance-sync --location=us-east4`
- `gcloud logging read ...` para confirmar runs 2xx y sin `NUBOX_* is not configured`
- BigQuery freshness query sobre `greenhouse_raw.nubox_*_snapshots` y `greenhouse_conformed.nubox_*`
- PostgreSQL query sobre `greenhouse_sync.source_sync_runs`, `source_sync_failures`, `income`, `expenses`, `external_cash_signals`

## Closing Protocol

Cerrar una task es obligatorio y forma parte de Definition of Done. Si la implementacion termino pero estos items no se ejecutaron, la task sigue abierta.

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado con evidencia de Cloud Run, Cloud Scheduler, BigQuery y PostgreSQL
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre TASK-640, TASK-668 y tasks Nubox V2 relacionadas
- [x] docs de arquitectura/runbook quedan sincronizadas si cambia el contrato operativo de Nubox en `ops-worker`

## Follow-ups

- Evaluar si `TASK-668` debe absorber replay enterprise, historical sweep y promotion gates una vez que esta task cierre el runtime basal.
- Evaluar `TASK-399` para generalizar el guard de env/secrets/readiness a todos los source adapters.
- Evaluar alerta Sentry/Slack especifica para `source_sync_runs` failed/stale si Reliability Control Plane no cubre suficiente visibilidad.

## Open Questions

- `NUBOX_API_BASE_URL` permanece como env no secreto: no contiene material sensible y el deploy declarativo evita drift.
- `ops-worker` recibe `NUBOX_BEARER_TOKEN_SECRET_REF`/`NUBOX_X_API_KEY_SECRET_REF`; no se montan tokens planos.
- `balance_sync` registra su propia fila en `greenhouse_sync.source_sync_runs` para que freshness no dependa solo de Cloud Logging/Scheduler.

## Closing Notes 2026-05-09

- `services/ops-worker/deploy.sh` declara `NUBOX_API_BASE_URL`,
  `NUBOX_BEARER_TOKEN_SECRET_REF` y `NUBOX_X_API_KEY_SECRET_REF`; falla rápido
  si faltan y concede `secretAccessor` a la service account runtime.
- Cloud Run staging fue remediado con env refs y Secret Manager IAM; replay de
  Scheduler dejó `raw_sync` y `quotes_hot_sync` exitosos sin errores
  `NUBOX_* is not configured`.
- `balance_sync` ahora tiene tracking propio en
  `greenhouse_sync.source_sync_runs`.
- `runNuboxSyncOrchestration()` expone `partial` cuando alguna fase queda
  degradada aunque downstream procese best-effort.
- `finance.nubox.source_freshness` alerta raw/hot/balance stale y falsa salud
  `conformed/postgres` sobre raw viejo.
- `postgres_projection` ahora registra fallas por documento en
  `source_sync_failures` y puede terminar `partial` sin abortar todo el lote.
- Se corrigió la causa raíz fiscal observada en runtime: Nubox `BHE` con
  retención conserva `expenses.total_amount` como neto pagable y
  `effective_cost_amount` como bruto fiscal/operativo.
- Validación live Postgres posterior al fix:
  `nubox-pg-c5593626-9573-407a-8475-8f86dea37252` terminó `succeeded`,
  `records_read=231`, `records_projected_postgres=214`,
  `projectionFailures=0`.
