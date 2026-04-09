# TASK-289 — Reviews Split: Client vs Agency Wait

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `5`
- Domain: `delivery`
- Blocked by: `none`
- Branch: `task/TASK-289-reviews-split-client-vs-agency`

## Summary

Agregar split "Esperando tu equipo" vs "Esperando agencia" a la vista de Revisiones. Los datos ya existen (`client_review_open`, `workflow_review_open`). Quick win con alto impacto: un Brand Manager con 4 stakeholders internos necesita saber que espera accion de SU lado.

## Why This Task Exists

La vista de Revisiones muestra una lista plana de items pendientes sin distinguir quien debe actuar. En un equipo enterprise con 3-5 revisores, saber "5 items esperan TU aprobacion hace 72h" vs "8 items estan en trabajo de la agencia" es la diferencia entre poder actuar y tener ansiedad. Los campos `client_review_open` y `workflow_review_open` ya existen en `v_tasks_enriched`.

## Goal

- Split visual en la cola de revisiones: items esperando al cliente vs items esperando a la agencia
- Tiempo de respuesta promedio por lado
- SLA badges de respuesta (24h/48h/72h)

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md` — §14.2 M2

## Dependencies & Impact

### Depends on

- `src/views/greenhouse/GreenhouseReviewQueue.tsx` — vista actual
- `src/app/api/reviews/queue/route.ts` — API actual
- Campos `client_review_open`, `workflow_review_open` en `v_tasks_enriched`

### Blocks / Impacts

- TASK-292 (Mis Revisiones) — reutilizara el split

### Files owned

- `src/views/greenhouse/GreenhouseReviewQueue.tsx`
- `src/app/api/reviews/queue/route.ts`

## Current Repo State

### Already exists

- `GreenhouseReviewQueue` con TanStack React Table, urgency badges (24h/48h/96h)
- `/api/reviews/queue` query funcional
- Campos en datos: `client_review_open`, `workflow_review_open`, `hours_since_update`
- Filter chips existentes: All, Open for review, Changes requested

### Gap

- No hay split por lado (quien espera)
- No hay tiempo de respuesta promedio por lado
- No hay SLA badges de respuesta

## Scope

### Slice 1 — Split en la API

- Agregar campo derivado `waiting_on` a la response: `'client'` si `client_review_open`, `'agency'` si `workflow_review_open`, `'both'` o `'none'`
- Agregar metricas agregadas: count por lado, avg response time por lado

### Slice 2 — Split en la UI

- Agregar filter chips: "Esperando tu equipo" (count), "Esperando agencia" (count)
- Columna o badge en la tabla indicando quien espera
- Color coding: items esperando al cliente en tono warning (accionable), items esperando agencia en tono info (en proceso)

### Slice 3 — Response time badges

- Calcular tiempo de respuesta promedio por lado (client vs agency)
- Mostrar como KPI cards arriba de la tabla
- SLA badges: <24h verde, 24-48h amarillo, >48h rojo

## Out of Scope

- Filtro por usuario individual (eso es TASK-292)
- Acciones write (aprobar/rechazar desde el portal)
- Notificaciones de escalation

## Acceptance Criteria

- [ ] Filter chips "Esperando tu equipo" y "Esperando agencia" funcionan con counts correctos
- [ ] Cada item en la tabla muestra badge de quien espera (client/agency)
- [ ] Items esperando al cliente tienen tono visual distinto (warning) vs agencia (info)
- [ ] Tiempo de respuesta promedio por lado visible como KPI
- [ ] `pnpm build` y `pnpm test` pasan

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- Preview con datos reales de un cliente Globe

## Closing Protocol

- [ ] Actualizar §14.2 M2 readiness a 100%

## Follow-ups

- TASK-292: Mis Revisiones con filtro personal
