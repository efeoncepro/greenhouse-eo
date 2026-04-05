# TASK-259 — Migrar entra-profile-sync a ops-worker

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Status real: `Diseno`
- Domain: `infrastructure`, `identity`
- Blocked by: `none`
- Branch: `task/TASK-259-entra-sync-ops-worker`

## Summary

El cron `entra-profile-sync` usa 300s de maxDuration (el maximo de Vercel), procesa per-user upserts (avatar + identity link + datos profesionales) y no tiene logica de retry. A medida que el directorio de Entra crece, el riesgo de timeout aumenta. Migrar a `ops-worker` elimina el limite de tiempo y agrega run tracking.

## Why This Task Exists

- `entra-profile-sync` es el cron mas largo del portal (300s maxDuration)
- Procesa N usuarios secuencialmente: fetch foto de Microsoft Graph → upload GCS → update PG para cada uno
- Sin retry: si falla a mitad, los usuarios restantes no se procesan hasta la proxima corrida (24h despues)
- El volumen solo puede crecer (nuevos colaboradores, clientes futuros)

## Goal

- Endpoint nuevo en `ops-worker`: `POST /sync/entra-profiles`
- Cloud Scheduler job `ops-entra-profile-sync` reemplaza el entry de `vercel.json`
- Run tracking institucional con conteo de usuarios procesados

## Dependencies & Impact

### Depends on

- TASK-254 completada — ops-worker funcional
- TASK-256 completada — logica de sync ya implementada en `src/lib/entra/profile-sync.ts`

### Files owned

- `services/ops-worker/server.ts` — agregar endpoint
- `services/ops-worker/deploy.sh` — agregar scheduler job
- `vercel.json` — remover `entra-profile-sync`

## Scope

### Slice 1 — Endpoint + scheduler

- `POST /sync/entra-profiles` — reutilizar `fetchEntraUsers()` + `syncEntraProfiles()`
- Job `ops-entra-profile-sync`: `0 8 * * *` (misma hora que el Vercel cron actual)
- Remover de `vercel.json`

### Slice 2 — Verificacion

- Disparar endpoint, verificar avatar + identity link para al menos 1 usuario
- Verificar run tracking

## Out of Scope

- Cambios a la logica de sync (profile-sync.ts, graph-client.ts)
- Agregar retry per-user (mejora futura)
- Migrar `entra-webhook-renew` (trigger simple, se queda en Vercel)

## Acceptance Criteria

- [ ] `POST /sync/entra-profiles` funciona desde ops-worker
- [ ] Scheduler job creado y ENABLED
- [ ] `entra-profile-sync` removido de `vercel.json`
- [ ] Run tracking en `source_sync_runs`
- [ ] `npx tsc --noEmit` pasa
