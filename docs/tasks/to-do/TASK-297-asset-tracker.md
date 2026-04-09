# TASK-297 — Asset Tracker: Revision History per Asset

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `13`
- Domain: `delivery`
- Blocked by: `TASK-286`
- Branch: `task/TASK-297-asset-tracker`

## Summary

Crear vista de historial de revisiones por asset para client_specialist. Un Compliance Officer de banco necesita saber: "que revise la semana pasada, en que ronda va, y se incorporo mi feedback?" Es audit trail y memoria de trabajo.

## Why This Task Exists

Los datos de versionado por asset existen (`frame_versions`, `client_change_round_final`, `workflow_change_round`) pero son snapshot, no log temporal. No hay forma de ver el historial de revisiones de un asset especifico ni rastrear la participacion de un usuario en las rondas. Para enterprise compliance, el audit trail es un requerimiento.

## Goal

- Pagina `/asset-tracker` con historial de assets tocados por el usuario
- Por cada asset: rondas, estado actual, ultimo feedback, version delta
- Audit trail filtrable por proyecto/campana

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md` — §14.1 V9

## Dependencies & Impact

### Depends on

- TASK-286 (view code `cliente.asset_tracker`)
- TASK-292 (Mis Revisiones) — identity-delivery mapping reutilizable
- `v_tasks_enriched` — datos base de assets

### Blocks / Impacts

- Ninguno directo

### Files owned

- `src/app/(dashboard)/asset-tracker/page.tsx`
- `src/app/api/asset-tracker/route.ts`
- `src/views/greenhouse/GreenhouseAssetTracker.tsx`

## Current Repo State

### Already exists

- `frame_versions`, `client_change_round_final`, `workflow_change_round` en BQ
- `open_frame_comments`, `hours_since_update`
- `greenhouse_core.audit_events` tabla en PG (existe pero no conectada a assets)
- CSC phase por task

### Gap

- Los datos son snapshot, no log temporal — no hay serie de eventos por asset
- No hay "version que revise" vs "version actual"
- No hay agregacion por usuario
- No hay API ni UI
- El modelo de historial no existe — requiere diseno

## Scope

### Slice 1 — Diseno del modelo de datos

- Evaluar opciones: derivar historial desde syncs de Notion (timestamps de `_synced_at`), o crear tabla de revision events, o usar diffs de snapshots
- Disenar query que reconstruya historial por asset desde los datos disponibles
- Documentar limitaciones si el historial no es completo

### Slice 2 — API route

- Crear `/api/asset-tracker/route.ts`
- Guard: `requireClientTenantContext()`
- Query: assets tocados por el usuario (via mapping de TASK-292), con rondas, estado, timestamps
- Filtros: proyecto, campana, periodo

### Slice 3 — Page y view component

- Lista de assets con: nombre, proyecto, rondas, estado actual, ultima actividad
- Expandible: historial de rondas (si disponible), cambio de estado, timestamps
- Filtros: proyecto, campana
- Solo visible para `client_specialist`

## Out of Scope

- Creacion de tabla nueva de revision events (evaluar si es necesario en Discovery)
- Comentarios inline en assets
- Diff visual de versiones

## Acceptance Criteria

- [ ] Pagina `/asset-tracker` muestra assets tocados por el usuario
- [ ] Cada asset muestra rondas acumuladas y estado actual
- [ ] Filtro por proyecto funciona
- [ ] Solo visible para `client_specialist`
- [ ] `pnpm build` pasa

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`

## Open Questions

- Es viable reconstruir historial desde snapshots de Notion sync, o se necesita tabla nueva de revision events?
- El historial necesita ser completo (todas las rondas) o basta con las ultimas N?
