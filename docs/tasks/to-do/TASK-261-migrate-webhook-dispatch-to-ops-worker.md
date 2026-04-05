# TASK-261 — Migrar webhook-dispatch a ops-worker

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Status real: `Diseno`
- Domain: `infrastructure`, `webhooks`
- Blocked by: `none`
- Branch: `task/TASK-261-webhook-dispatch-ops-worker`

## Summary

El cron `webhook-dispatch` corre cada 2 minutos con 60s de maxDuration y despacha webhooks pendientes a endpoints externos. La latencia de los destinos es impredecible — un endpoint lento o caido puede hacer que el batch consuma todo el timeout y el backlog crezca mas rapido de lo que se drena. Sin run tracking, el problema es invisible hasta que el receptor externo reporta que no le llegan datos.

## Why This Task Exists

- Cumple 4/5 criterios de placement: cola (webhook queue), posible >60s (latencia externa), retry implícito (queue semantics), fallo silencioso con impacto (receptores no reciben datos)
- Cada 2 minutos es la frecuencia mas alta de todos los crons — mas oportunidad de acumulacion
- Endpoints externos pueden tener latencia variable, timeouts, o estar caidos temporalmente
- Sin run tracking no hay visibilidad de cuantos webhooks se despacharon, cuantos fallaron, o si hay backlog

## Goal

- Endpoint nuevo en `ops-worker`: `POST /dispatch/webhooks`
- Cloud Scheduler job `ops-webhook-dispatch` cada 2 minutos
- Run tracking con conteo de webhooks despachados/fallidos
- Remover de `vercel.json`

## Dependencies & Impact

### Depends on

- TASK-254 completada — ops-worker funcional
- `src/app/api/cron/webhook-dispatch/route.ts` — logica existente

### Files owned

- `services/ops-worker/server.ts` — agregar endpoint
- `services/ops-worker/deploy.sh` — agregar scheduler job
- `vercel.json` — remover `webhook-dispatch`

## Scope

### Slice 1 — Endpoint + scheduler

- `POST /dispatch/webhooks` — reutilizar logica del route handler
- Job `ops-webhook-dispatch`: `*/2 * * * *` (misma frecuencia actual)
- Run tracking: webhooks despachados, fallidos, latencia promedio

### Slice 2 — Verificacion

- Disparar endpoint via gcloud proxy
- Verificar run tracking en `source_sync_runs`
- Verificar que Ops Health refleja el subsistema

## Out of Scope

- Refactorizar logica de dispatch o retry de webhooks
- Implementar circuit breaker para destinos lentos (mejora futura)
- Migrar `email-delivery-retry` (similar pero bajo impacto, se queda en Vercel)

## Acceptance Criteria

- [ ] `POST /dispatch/webhooks` funciona desde ops-worker
- [ ] Scheduler job creado y ENABLED cada 2 min
- [ ] `webhook-dispatch` removido de `vercel.json`
- [ ] Run tracking en `source_sync_runs`
- [ ] `npx tsc --noEmit` pasa
