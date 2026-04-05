# TASK-262 — Migrar outbox-publish a ops-worker

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Bajo`
- Type: `implementation`
- Status real: `Diseno`
- Domain: `infrastructure`, `event-bus`
- Blocked by: `none`
- Branch: `task/TASK-262-outbox-publish-ops-worker`

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
