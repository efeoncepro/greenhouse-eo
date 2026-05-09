# Plan — TASK-841 Nubox ops-worker Config + Freshness Hardening

## Discovery summary

Runtime real confirmado el 2026-05-09: Cloud Scheduler invoca `ops-nubox-sync`, `ops-nubox-quotes-hot-sync` y `ops-nubox-balance-sync` contra Cloud Run `ops-worker`, pero la revision viva `ops-worker-00169-gdq` no tiene `NUBOX_API_BASE_URL`, `NUBOX_BEARER_TOKEN_SECRET_REF` ni `NUBOX_X_API_KEY_SECRET_REF`.

`src/lib/nubox/client.ts` ya soporta `NUBOX_BEARER_TOKEN_SECRET_REF` y `NUBOX_X_API_KEY_SECRET_REF` via `resolveSecret`. El gap vive en el contrato declarativo de `services/ops-worker/deploy.sh`, que usa `--set-env-vars` y por tanto elimina cualquier env var no declarada en cada redeploy.

BigQuery raw Nubox sigue stale desde 2026-05-03; conformed se ve fresco el 2026-05-09 porque reprocesa snapshots viejos. PostgreSQL confirma `raw_sync=failed`, `quotes_hot_sync=failed`, `conformed_sync=succeeded` y `postgres_projection=succeeded`, lo que hoy puede producir falsa salud.

## Access model

No aplica cambio de acceso.

- `routeGroups`: sin cambios.
- `views` / `authorizedViews`: sin cambios.
- `entitlements`: sin cambios.
- `startup policy`: sin cambios.

## Architecture decision

- ADR existente: las decisiones vigentes viven en `GREENHOUSE_SOURCE_SYNC_PIPELINES_V1`, `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1`, `GREENHOUSE_VERCEL_CRON_CLASSIFICATION_V1`, `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1` y `GREENHOUSE_FINANCE_ARCHITECTURE_V1`.
- ADR nuevo: no requerido; no cambia source of truth ni topologia, cierra drift de implementacion contra contratos existentes.
- Reversibilidad: alta para env contract y signals; media para el cambio de semantica del resultado agregado, pero compatible hacia adelante.

## Open questions resolved

- `NUBOX_API_BASE_URL`: queda como env no secreto. Es endpoint no credencial; Secret Manager queda reservado a tokens/API keys.
- Credenciales: usar `NUBOX_BEARER_TOKEN_SECRET_REF` y `NUBOX_X_API_KEY_SECRET_REF`, no montar tokens planos como env. Reusa `resolveSecret`, reduce exposicion y mantiene rotacion por Secret Manager.
- `balance_sync`: debe registrar `source_sync_runs` con `source_object_type='balance_sync'`. Cloud Logging no basta para freshness/replay/auditoria institucional.

## Skills

- `greenhouse-agent`: protocolo repo/Next/worker y reuse-before-create.
- `greenhouse-finance-accounting-operator`: frontera Nubox fiscal/documental vs caja/pagos.
- `software-architect-2026`: self-critique de decision, reversibilidad, observabilidad y cognitive debt.

## Subagent strategy

Secuencial. El cambio cruza deploy script, runtime sync y reliability wiring de forma acoplada; paralelizar aumentaria riesgo de edits solapados.

## Execution order

1. Migraciones: no crear DDL. `source_sync_runs` ya soporta `status='partial'` y `source_object_type='balance_sync'`.
2. Tipos / contratos: extender tipos de resultado Nubox para `status: succeeded | partial | failed | skipped` y resumen de fases.
3. Queries / readers / helpers: agregar reader deterministic de Nubox freshness en `src/lib/reliability/queries/`.
4. API routes / handlers / workers: endurecer `runNuboxSyncOrchestration`, `runNuboxBalanceSync` y `services/ops-worker/deploy.sh`.
5. Events / publishers / consumers: sin outbox nuevo; solo preservar `finance.balance_divergence.detected`.
6. Reliability signals / observability / lint rules: wirear signal bajo Finance/Sync Health y agregar guard/test de contrato deploy Nubox.
7. UI / views / pages: sin UI nueva; el Reliability Overview consumira el signal existente por registry.
8. Docs / handoff / changelog / arquitectura: actualizar README ops-worker, docs arquitectura/runbook, task lifecycle, changelog y Handoff.
9. Verificacion: `pnpm pg:doctor`, tests focales Nubox/reliability/deploy, `pnpm lint`, `pnpm exec tsc --noEmit`, `node scripts/ci/vercel-cron-async-critical-gate.mjs`, gcloud/BQ/PG replay checks.

## Files to modify

- `services/ops-worker/deploy.sh` — contrato env/secrets Nubox, IAM secretAccessor, fail-fast predeploy.
- `services/ops-worker/README.md` — contrato operativo Nubox y replay.
- `src/lib/nubox/sync-nubox-orchestrator.ts` — estado agregado honesto.
- `src/lib/nubox/sync-nubox-balances.ts` — run tracking `balance_sync`.
- `src/lib/reliability/get-reliability-overview.ts`, `src/lib/reliability/signals.ts`, `src/lib/reliability/registry.ts` — wiring signal.
- `src/lib/reliability/queries/*` — reader/test Nubox freshness.
- `docs/architecture/*` y `Handoff.md` — deltas operativos.

## Files to create

- `src/lib/reliability/queries/nubox-source-freshness.ts`
- `src/lib/reliability/queries/nubox-source-freshness.test.ts`
- `services/ops-worker/deploy-contract.test.ts` o equivalente focal si el harness Vitest acepta `services/**`.

## Risk flags

- Cloud Run `ops-worker` es infraestructura compartida staging/production; no desplegar desde dirty tree con cambios ajenos.
- `--set-env-vars` es destructivo: cualquier variable omitida desaparece en redeploy.
- Replay Nubox escribe raw/conformed/PG; debe ejecutarse despues del contrato cloud y con logs/queries de verificacion.
- `conformed_sync` fresh sobre raw stale debe quedar visible como degraded, no como outage total si downstream puede seguir en best-effort.

## Checkpoint

TASK-841 es `P1 / Medio`, por lo que requiere aprobacion humana antes de implementar codigo.
