# TASK-260 — Migrar nubox-sync + ico-member-sync a ops-worker

## Delta 2026-05-03 — Cerrada por TASK-775 Slices 3 + 9

Cerrada como **superada por TASK-775** (Vercel Cron Async-Critical Migration Platform). Ambos crons del scope original migrados al patrón canónico:

- **`nubox-sync`** → Cloud Scheduler `ops-nubox-sync` (TASK-775 Slice 3). Orchestrator puro `runNuboxSyncOrchestration` en `src/lib/nubox/sync-nubox-orchestrator.ts`. Endpoint Cloud Run via `wrapCronHandler` (audit log + runId estable + `captureWithDomain('sync')` + sanitización 502). ✅ Goal cubierto al 100%.
- **`ico-member-sync`** → Cloud Scheduler `ops-ico-member-sync` (TASK-775 Slice 9 — agregado tras detección 2026-05-03 de que QA usa `/people/[id]/ico` en staging para validar el motor ICO; clasificación corregida de `tooling` a `async_critical`). Orchestrator puro `runIcoMemberSync` en `src/lib/cron-orchestrators/index.ts`. Endpoint Cloud Run via `wrapCronHandler` (`domain: 'delivery'`). Pattern `ico-` agregado al reader runtime + CI gate para que cualquier futuro cron `/api/cron/ico-*` async-critical sea detectado automáticamente, no por caso. ✅ Goal cubierto al 100%.
- **Bonus cleanup**: entry `/api/cron/ico-materialize` eliminada de vercel.json (era duplicado huérfano — el cron real corre en `ico-batch-worker` Cloud Run via Cloud Scheduler `ico-materialize-daily`). Mapping defensivo agregado al snapshot canónico para que si alguien re-agrega la entry por error, el reader la reconoce como cubierta.

**Status final**: Lifecycle `complete` por consolidación bajo TASK-775. 100% del scope original entregado con patrón canónico (helper `wrapCronHandler` + orchestrator puro + Cloud Scheduler idempotente + reliability signal + CI gate).

## Status

- Lifecycle: `complete` (cerrada por TASK-775 Slices 3 + 9 — 2026-05-03)
- Lifecycle (legacy): `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Domain: `infrastructure`, `finance`, `delivery`
- Blocked by: `none`
- Branch: `task/TASK-260-nubox-ico-member-ops-worker`

## Summary

Dos crons con riesgo de fallo silencioso: `nubox-sync` (ETL 3 fases, 120s, tolerancia parcial) e `ico-member-sync` (upserts BQ→PG por fila, sin alerting). Ambos se benefician de run tracking y observabilidad en `ops-worker`.

## Why This Task Exists

1. **nubox-sync**: ETL de 3 fases (Nubox API → raw BQ → conformed → PG projection). Si una fase falla, las siguientes continuan con datos incompletos. Sin run tracking, el fallo es invisible.
2. **ico-member-sync**: Sincroniza metricas ICO por miembro desde BigQuery a Postgres. Upserts por fila sin alerting — si falla silenciosamente, los datos de ICO quedan stale sin que nadie lo detecte.
3. Adicionalmente, `ico-materialize` esta duplicado en Vercel + Cloud Run. Al migrar `ico-member-sync`, se puede limpiar el duplicado.

## Goal

- Dos endpoints nuevos en `ops-worker`: `POST /sync/nubox` y `POST /sync/ico-members`
- Dos Cloud Scheduler jobs nuevos
- Remover ambos de `vercel.json`
- Opcionalmente: remover `ico-materialize` de `vercel.json` (ya corre en `ico-batch-worker`)

## Dependencies & Impact

### Depends on

- TASK-254 completada — ops-worker funcional
- `src/app/api/cron/nubox-sync/route.ts` — logica existente
- `src/app/api/cron/ico-member-sync/route.ts` — logica existente

### Files owned

- `services/ops-worker/server.ts` — agregar 2 endpoints
- `services/ops-worker/deploy.sh` — agregar 2 scheduler jobs
- `vercel.json` — remover 2-3 cron entries

## Scope

### Slice 1 — nubox-sync endpoint

- `POST /sync/nubox` — reutilizar logica del route handler existente
- Job `ops-nubox-sync`: `30 7 * * *`
- Run tracking con detalle de fase (raw, conformed, projection)

### Slice 2 — ico-member-sync endpoint

- `POST /sync/ico-members` — reutilizar logica existente
- Job `ops-ico-member-sync`: `30 10 * * *`
- Cleanup: remover `ico-materialize` de `vercel.json` (duplicado)

### Slice 3 — Verificacion

- Disparar ambos endpoints via gcloud proxy
- Verificar run tracking
- Verificar que Ops Health refleja los nuevos subsistemas

## Out of Scope

- Refactorizar logica interna de nubox-sync o ico-member-sync
- Agregar alerting a ico-member-sync (mejora futura)
- Migrar `nubox-balance-sync` (ligero, se queda en Vercel)

## Acceptance Criteria

- [ ] `POST /sync/nubox` y `POST /sync/ico-members` funcionan desde ops-worker
- [ ] Scheduler jobs creados y ENABLED
- [ ] `nubox-sync` e `ico-member-sync` removidos de `vercel.json`
- [ ] `ico-materialize` removido de `vercel.json` (ya en Cloud Run)
- [ ] Run tracking en `source_sync_runs`
- [ ] `npx tsc --noEmit` pasa
