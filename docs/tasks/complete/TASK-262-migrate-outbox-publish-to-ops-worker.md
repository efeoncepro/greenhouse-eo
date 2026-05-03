# TASK-262 — Migrar outbox-publish a ops-worker

## Status

- Lifecycle: `complete` (absorbida en TASK-773 el 2026-05-03)
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Bajo`
- Type: `implementation`
- Status real: `Absorbida en TASK-773 — Outbox Publisher Cloud Scheduler Cutover + Reliability + E2E Pre-Merge Gate`
- Domain: `infrastructure`, `event-bus`
- Blocked by: `none`
- Branch: `develop` (vía TASK-773)

## Absorción (2026-05-03)

Esta task fue absorbida íntegramente en **TASK-773** (`docs/tasks/in-progress/TASK-773-outbox-publisher-cloud-scheduler-cutover.md`). TASK-773 es un superset estricto:

- ✅ TASK-262 Slice 1 (Endpoint + scheduler) → cubierto por TASK-773 Slice 2 (helper canónico extendido + endpoint `POST /outbox/publish-batch`) y Slice 3 (Cloud Scheduler `ops-outbox-publish` cron `*/2 min`, más frecuente que el original `*/5` para mejor SLA).
- ✅ TASK-262 Slice 2 (Verificación) → cubierto por TASK-773 Slice 5 (cutover zero-downtime con doble publisher 24h + backfill drenaje).
- ➕ TASK-773 agrega adicionalmente: state machine canónica `pending → publishing → published/failed/dead_letter` (Slice 1 migration), 2 reliability signals `sync.outbox.unpublished_lag` + `sync.outbox.dead_letter` (Slice 4), lint rule custom `finance-route-requires-e2e-evidence` + protocol E2E pre-merge (Slice 6), invariantes en CLAUDE.md (Slice 7).

**Por qué se absorbió**: el incidente runtime detectado 2026-05-03 (TASK-772 followup — pago de Figma no rebajaba TC en staging) reveló que el bug raíz NO es solo "outbox-publish está en Vercel" sino "el patrón Vercel cron deja invisible toda una clase de bugs en staging + no hay reliability signal que lo detecte". TASK-773 ataca esa raíz arquitectónica completa.

Para detalle de implementación, lifecycle final y verificación, ver `docs/tasks/complete/TASK-773-outbox-publisher-cloud-scheduler-cutover.md` cuando cierre.

## Summary

`outbox-publish` es el fundamento del event bus de Greenhouse: saca eventos de la tabla outbox de Postgres y los publica a BigQuery. El reactor (`outbox-react`) que consume esos eventos ya fue migrado a `ops-worker` en TASK-254. Tener el publicador en Vercel y el reactor en Cloud Run es un split innecesario del mismo pipeline. Si el publicador falla silenciosamente, el reactor no tiene nada que procesar y todo el pipeline downstream (proyecciones, conformed, ICO) se detiene.

## Why This Task Exists

1. **Fundamento del event bus**: todo el sistema reactivo depende de que `outbox-publish` corra correctamente. Sin el, no hay eventos en BigQuery, no hay proyecciones, no hay conformed layer.
2. **Pipeline partido**: el reactor ya esta en Cloud Run (`ops-worker`), pero el publicador que lo alimenta sigue en Vercel. Es incoherente — un fallo en Vercel detiene el pipeline de Cloud Run.
3. **Sin visibilidad**: hoy no tiene run tracking. Si falla, el unico sintoma es que el hidden backlog reactivo crece — pero eso podria confundirse con un problema del reactor.
4. **Frecuencia alta**: corre cada 5 minutos. Con run tracking en `source_sync_runs`, Ops Health puede mostrar la cadencia real del publicador.

## Goal

- Endpoint nuevo en `ops-worker`: `POST /outbox/publish`
- Cloud Scheduler job `ops-outbox-publish` cada 5 minutos
- Run tracking con conteo de eventos publicados
- Remover de `vercel.json`
- El pipeline completo (publish → react → projections) corre en Cloud Run

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` §6 — inventario canonico
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — catalogo de eventos outbox

## Dependencies & Impact

### Depends on

- TASK-254 completada — ops-worker funcional
- `src/app/api/cron/outbox-publish/route.ts` — logica existente del publicador

### Blocks / Impacts

- Todo el pipeline reactivo — el publicador alimenta al reactor
- TASK-258 (sync-conformed) — depende de eventos publicados
- Ops Health — nuevo subsistema "Outbox Publish" con visibilidad de cadencia

### Files owned

- `services/ops-worker/server.ts` — agregar endpoint
- `services/ops-worker/deploy.sh` — agregar scheduler job
- `vercel.json` — remover `outbox-publish`

## Scope

### Slice 1 — Endpoint + scheduler

- `POST /outbox/publish` — reutilizar logica de `src/app/api/cron/outbox-publish/route.ts`
- Job `ops-outbox-publish`: `*/5 * * * *` (misma frecuencia actual)
- Run tracking: eventos publicados, fallidos, duracion

### Slice 2 — Verificacion

- Disparar endpoint via gcloud proxy
- Verificar que eventos aparecen en BigQuery
- Verificar que el reactor los procesa en la siguiente corrida
- Verificar run tracking en `source_sync_runs`
- Confirmar pipeline end-to-end: publish → react → projections en Cloud Run

## Out of Scope

- Refactorizar logica interna del publicador
- Cambiar destino de publicacion (sigue siendo BigQuery)
- Migrar el outbox schema o la tabla de eventos

## Acceptance Criteria

- [ ] `POST /outbox/publish` funciona desde ops-worker
- [ ] Scheduler job `ops-outbox-publish` creado y ENABLED cada 5 min
- [ ] `outbox-publish` removido de `vercel.json`
- [ ] Run tracking en `source_sync_runs` con conteo de eventos
- [ ] Pipeline end-to-end verificado: publish + react corren ambos en Cloud Run
- [ ] `npx tsc --noEmit` pasa
