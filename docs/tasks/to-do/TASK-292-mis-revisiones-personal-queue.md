# TASK-292 — Mis Revisiones: Personal Review Queue

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Bajo-Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `8`
- Domain: `delivery`
- Blocked by: `TASK-286`
- Branch: `task/TASK-292-mis-revisiones-personal-queue`

## Summary

Crear cola de revisiones filtrada por usuario para client_specialist. En una empresa grande con 3-5 revisores, cada uno necesita ver SU cola, no la de toda la cuenta. El Content Manager de rutas domesticas no necesita ver los assets de cargo.

## Why This Task Exists

La vista de Reviews muestra TODOS los items pendientes de la cuenta sin distinguir a quien le tocan. En equipos enterprise con multiples specialists asignados a proyectos/campanas distintas, la lista completa es ruido. Cada specialist necesita entrar, ver "tienes 4 items pendientes", y actuar.

## Goal

- Pagina `/my-reviews` con cola filtrada al usuario actual
- Prioridad por urgencia (>24h, >48h, >96h)
- Historial de rondas acumuladas por asset
- Quick actions (abrir en Frame)

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md` — §12.3, §14.1 V8

## Dependencies & Impact

### Depends on

- TASK-286 (view code `cliente.mis_revisiones`)
- TASK-289 (reviews split) — reutilizar split client/agency
- `src/views/greenhouse/GreenhouseReviewQueue.tsx` — base para la vista
- `src/app/api/reviews/queue/route.ts` — API base

### Blocks / Impacts

- Ninguno directo

### Files owned

- `src/app/(dashboard)/my-reviews/page.tsx`
- `src/app/api/reviews/my-queue/route.ts`
- `src/views/greenhouse/GreenhouseMyReviewQueue.tsx`

## Current Repo State

### Already exists

- `GreenhouseReviewQueue` con TanStack React Table, urgency badges
- `/api/reviews/queue` query con `assignee_member_id`, `assignee_name`, `assignee_role`
- `client_review_open`, `workflow_review_open` flags
- `hours_since_update` calculado

### Gap

- No hay filtro por `userId` en la API
- Falta mapeo `client_users.user_id` ↔ `assignee_member_id` (identity vs delivery domains)
- No hay vista personal separada
- No hay historial de rondas por asset

## Scope

### Slice 1 — Identity-delivery mapping

- Investigar como mapear `client_users.user_id` (session) a `assignee_member_id` (delivery tasks)
- Opciones: via `identity_profile_id`, via email, via tabla de mapping directa
- Implementar el mapping mas robusto

### Slice 2 — API filtrada

- Crear `/api/reviews/my-queue/route.ts` o agregar param `?userId=X` a la API existente
- Filtrar: solo tasks donde `assignee_member_id` corresponda al usuario logueado
- Incluir: rondas acumuladas (`client_change_round_final`), ultimo estado

### Slice 3 — Vista personal

- Crear pagina y view `GreenhouseMyReviewQueue`
- KPI cards: "Tienes X items pendientes", "X esperan >48h"
- Tabla filtrada con urgency badges
- Por cada item: asset name, proyecto, rondas acumuladas, tiempo de espera
- Link directo a Frame.io si `page_url` disponible

## Out of Scope

- Feedback inline (aprobar/rechazar desde portal)
- Asset Tracker completo (eso es TASK-297)
- Modificar la vista de Reviews general (TASK-289)

## Acceptance Criteria

- [ ] Pagina `/my-reviews` muestra solo items asignados al usuario logueado
- [ ] KPI "Tienes X items pendientes" es correcto
- [ ] Urgency badges (24h/48h/96h) funcionan
- [ ] Rondas acumuladas por asset visibles
- [ ] Si el usuario no tiene items, empty state honesto
- [ ] Solo visible para `client_specialist`
- [ ] `pnpm build` pasa

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`

## Closing Protocol

- [ ] Documentar el mapping identity-delivery utilizado

## Follow-ups

- TASK-297: Asset Tracker con historial completo
