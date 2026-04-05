# TASK-258 — Migrar sync-conformed + sync-conformed-recovery a ops-worker

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Domain: `infrastructure`, `sync`
- Blocked by: `none`
- Branch: `task/TASK-258-sync-conformed-ops-worker`

## Summary

Los crons `sync-conformed` y `sync-conformed-recovery` son los candidatos mas urgentes para migrar de Vercel a Cloud Run `ops-worker`. Ambos tienen semantica de orquestacion compleja (Notion sync → conformed layer → data quality), 120s de maxDuration, y logica de retry/recovery. Son el mismo patron de workload que los crons reactivos ya migrados en TASK-254.

## Why This Task Exists

1. **sync-conformed** orquesta la transformacion de datos raw de Notion a la capa conformed con data quality post-checks. Es un workload de 120s que puede fallar parcialmente y necesita observabilidad.
2. **sync-conformed-recovery** procesa runs fallidos del sync conformed — es recovery de backlog con semantica de durabilidad critica.
3. Ambos cumplen 4/5 criterios de placement para Cloud Run (cola/backlog, >60s, retry/recovery, impacto operativo de fallo silencioso).
4. El patron ya esta establecido: `ops-worker` acepta nuevos endpoints, Cloud Scheduler crea los jobs.

## Goal

- Dos endpoints nuevos en `ops-worker`: `POST /sync/conformed` y `POST /sync/conformed-recovery`
- Dos Cloud Scheduler jobs nuevos apuntando a esos endpoints
- Las rutas de Vercel se mantienen como fallback manual pero se remueven de `vercel.json`
- Run tracking institucional via `source_sync_runs`

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` §6 — inventario canonico, placement criteria
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` — pipeline de sync conformed

## Dependencies & Impact

### Depends on

- TASK-254 completada — `ops-worker` ya deployado y funcional
- `src/lib/sync/notion-conformed-orchestrator.ts` — logica existente del sync
- `src/lib/sync/conformed-recovery.ts` — logica existente de recovery

### Blocks / Impacts

- Estabilidad del pipeline Notion → conformed → ICO — durabilidad mejorada
- TASK-251 (Reactive Control Plane) — beneficia de run tracking unificado

### Files owned

- `services/ops-worker/server.ts` — agregar 2 endpoints
- `services/ops-worker/deploy.sh` — agregar 2 scheduler jobs
- `vercel.json` — remover 2 cron entries

## Scope

### Slice 1 — Endpoints en ops-worker

- `POST /sync/conformed` — reutilizar logica de `src/app/api/cron/sync-conformed/route.ts`
- `POST /sync/conformed-recovery` — reutilizar logica de `src/app/api/cron/sync-conformed-recovery/route.ts`
- Run tracking con `writeReactiveRunStart/Complete/Failure` (renombrar a run tracker generico si aplica)

### Slice 2 — Scheduler jobs + vercel.json cleanup

- Agregar 2 jobs a `deploy.sh`: `ops-sync-conformed` y `ops-sync-conformed-recovery`
- Remover `sync-conformed` y `sync-conformed-recovery` de `vercel.json`
- Redeploy ops-worker con nueva imagen

### Slice 3 — Verificacion

- Health check del servicio
- Disparar ambos endpoints manualmente via gcloud proxy
- Verificar run tracking en `source_sync_runs`
- Verificar que Ops Health muestra el subsistema actualizado

## Out of Scope

- Refactorizar la logica interna del sync conformed
- Migrar otros crons (nubox-sync, entra-profile-sync)
- Cambios al pipeline Notion → raw BQ (eso lo maneja `notion-bq-sync` en Cloud Run separado)

## Acceptance Criteria

- [ ] `POST /sync/conformed` procesa correctamente el sync conformed desde ops-worker
- [ ] `POST /sync/conformed-recovery` procesa recovery runs desde ops-worker
- [ ] Cloud Scheduler jobs `ops-sync-conformed` y `ops-sync-conformed-recovery` creados y ENABLED
- [ ] `sync-conformed` y `sync-conformed-recovery` removidos de `vercel.json`
- [ ] Run tracking registrado en `source_sync_runs`
- [ ] `npx tsc --noEmit` y `pnpm lint` pasan

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- Disparar endpoints via gcloud proxy
- Verificar Cloud Scheduler jobs con `gcloud scheduler jobs list`
