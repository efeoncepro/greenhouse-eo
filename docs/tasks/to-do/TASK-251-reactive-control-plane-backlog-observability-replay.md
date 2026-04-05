# TASK-251 — Reactive Control Plane Backlog Observability & Replay

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `1`
- Domain: `ops`
- Blocked by: `none`
- Branch: `task/TASK-251-reactive-control-plane-backlog-observability-replay`
- Legacy ID: `none`
- GitHub Issue: `[TASK-251] Reactive Control Plane Backlog Observability & Replay`

## Summary

Crear una capability operativa para que Greenhouse mida backlog reactivo real, detecte lag del reactor y permita replay/drain scoped desde Admin Ops sin depender de corridas globales ciegas. La task nace del incidente `ISSUE-009`, donde existía backlog reactivo acumulado aunque los KPIs actuales mostraban `pendingProjections = 0` y `failedHandlers = 0`.

## Delta 2026-04-05

- `ISSUE-009` ya quedó resuelta en su capa de visibilidad operativa.
- `ISSUE-012` ya quedó resuelta en la capa de scheduler/auth: `requireCronAuth()` ahora acepta tráfico válido de Vercel Cron aunque `CRON_SECRET` falte.
- `Admin Center`, `Ops Health` y `/api/internal/projections` ya exponen backlog reactivo oculto y `lastReactedAt` vía `getOperationsOverview()`.
- El alcance remanente de esta task ya no es “hacer visible el bug”, sino completar la capability enterprise pendiente:
  - replay/drain scoped
  - `dryRun`
  - lag/alert semantics más robustas
  - guardrails operativos de remediación

## Why This Task Exists

El incidente `ISSUE-009` confirmó una brecha de plataforma, no solo un bug puntual.

Hoy Greenhouse ya distingue parcialmente:

- `outbox_events` para publicación
- `projection_refresh_queue` para intents persistentes
- `outbox_reactive_log` para retries/dead-letter y dedupe por handler

Pero el control plane operativo sigue ciego en la transición más delicada: eventos `published` de tipo reactivo que todavía no tienen ninguna huella en el ledger reactivo.

Eso genera tres problemas enterprise:

- un backlog real puede acumularse sin verse en `Ops Health` ni en `Admin Center`
- el operador no tiene replay scoped y seguro; hoy las acciones manuales son globales
- no existe una señal institucional de `reactor stalled` cuando el publish lane sigue avanzando pero el reactive lane dejó de drenar

La task formaliza la capability que falta para que Greenhouse trate el carril reactivo como un control plane observable, replayable y auditable, no solo como un cron best-effort.

## Goal

- Exponer backlog reactivo real como métrica de primer nivel, separado de `pendingProjections` y `failedHandlers`.
- Introducir replay/drain manual scoped, idempotente y auditable para Admin Ops.
- Degradar y alertar cuando el reactor quede atrasado aunque el publish lane siga sano.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`

Reglas obligatorias:

- El runtime debe distinguir explícitamente cuatro estados distintos: publish backlog, reactive backlog oculto, queue backlog persistente y handler degradation.
- Ningún replay nuevo puede drenar backlog global de forma implícita desde una acción de usuario final; las acciones manuales deben ser admin-only, scoped y auditables.
- El replay o drain debe respetar idempotencia del ledger reactivo y no romper el contrato `(event_id, handler)` ya definido.
- La observabilidad nueva debe vivir sobre readers y APIs canónicas existentes antes de abrir dashboards o shells paralelas.

## Normative Docs

- `docs/operations/ISSUE_OPERATING_MODEL_V1.md`
- `docs/issues/resolved/ISSUE-009-reactive-event-backlog-can-accumulate-without-ops-visibility.md`
- `docs/tasks/to-do/TASK-135-ops-health-sentry-reactive-refresh.md`

## Dependencies & Impact

### Depends on

- `src/lib/sync/outbox-consumer.ts`
- `src/lib/sync/reactive-consumer.ts`
- `src/lib/sync/refresh-queue.ts`
- `src/lib/sync/event-catalog.ts`
- `src/lib/operations/get-operations-overview.ts`
- `src/app/api/internal/projections/route.ts`
- `src/app/api/admin/ops/replay-reactive/route.ts`
- `src/app/api/admin/ops/reactive/run/route.ts`

### Blocks / Impacts

- `ISSUE-009` — entrega la capability estructural que evita recurrencia silenciosa del incidente
- `TASK-135` — comparte surface en `Ops Health`, pero esta lane cubre backlog reactivo real y replay, no incidentes de Sentry
- `TASK-148` — future Agency event emission necesita este control plane para no crecer sobre una observabilidad incompleta
- `Admin Center`, `Ops Health` y acciones operativas manuales del portal

### Files owned

- `src/lib/operations/get-operations-overview.ts`
- `src/lib/sync/reactive-consumer.ts`
- `src/lib/sync/refresh-queue.ts`
- `src/lib/sync/event-catalog.ts`
- `src/app/api/internal/projections/route.ts`
- `src/app/api/admin/ops/replay-reactive/route.ts`
- `src/app/api/admin/ops/reactive/run/route.ts`
- `src/views/greenhouse/admin/AdminOpsHealthView.tsx`
- `src/views/greenhouse/admin/AdminCenterView.tsx`
- `src/views/greenhouse/admin/AdminOperationalActionsPanel.tsx`
- `docs/tasks/to-do/TASK-251-reactive-control-plane-backlog-observability-replay.md`

## Current Repo State

### Already exists

- `publishPendingOutboxEvents()` ya distingue el carril `pending -> published` y deja tracking de sync runs
- `processReactiveEvents()` ya usa `outbox_reactive_log` keyed por `(event_id, handler)` y `projection_refresh_queue` como cola persistente de intents
- existen cron routes para `outbox-publish`, `outbox-react` y `projection-recovery`
- existen acciones manuales admin para publish/reactive/replay, pero hoy son globales y sin scoping fino
- `getOperationsOverview()` ya expone `pendingProjections`, `failedHandlers`, `outboxEvents24h` y otras señales operativas
- `GET /api/internal/projections` ya devuelve stats por proyección y queue health básica

### Gap

- no existe una métrica canónica para eventos reactivos `published` sin fila en `outbox_reactive_log`
- `Ops Health` y `Admin Center` pueden mostrar estado sano aunque el reactive lane esté atrasado
- no existe semántica institucional de `reactive lag` o `reactor stalled`
- el replay manual actual no filtra por dominio, `event_type`, tiempo ni modo dry-run
- el operador no puede distinguir rápido si el problema vive en publish, en el ledger reactivo o en la cola persistente

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Reactive backlog truth layer

- Agregar readers canónicos para medir backlog reactivo real: total, últimas `24h`, oldest/newest, top event types y último `reacted_at`
- Separar explícitamente backlog `published -> reactive ledger` de `projection_refresh_queue` y de `retry/dead-letter`
- Exponer esa verdad operativa en `getOperationsOverview()` y `GET /api/internal/projections`

### Slice 2 — Scoped replay and drain actions

- Endurecer la acción manual reactiva para aceptar scope explícito por dominio, `event_type`, rango temporal, batch size y `dryRun`
- Diferenciar `run current backlog` de `replay unreacted reactive events`
- Devolver resultado auditable y legible para operador: cuántos candidatos hubo, cuántos se ejecutaron, cuántos quedaron fuera por dedupe o por scope

### Slice 3 — Ops surfacing and alert semantics

- Mostrar la nueva señal en `Admin Center` y `Ops Health` con semántica visible de backlog oculto vs cola persistente
- Marcar degradación cuando entren eventos reactivos nuevos y `last_reacted_at` quede rezagado más allá del umbral definido
- Agregar affordance operativa clara para replay manual sin convertir la UI en consola de debugging ad hoc

### Slice 4 — Focused verification and enterprise guardrails

- Cubrir con tests las nuevas derivaciones de backlog, filtros de replay y response shaping de Ops
- Validar con escenario manual o dataset real que el incidente de `ISSUE-009` ya queda visible aunque `pendingProjections = 0`
- Dejar documentación corta o delta contractual si la métrica nueva cambia el significado visible de `Ops Health`

## Out of Scope

- Resolver en esta misma lane la causa exacta de cada handler o proyección atrasada del backlog actual
- Migrar el reactor a Cloud Run o rediseñar toda la arquitectura de outbox/webhooks
- Reemplazar dashboards nativos de observabilidad externa como Sentry, Slack o tooling cloud
- Cambiar contratos de negocio de eventos de dominio solo para acomodar esta capability

## Detailed Spec

La capability debe institucionalizar un modelo operativo de cuatro carriles:

1. **Publish backlog**
   - eventos `pending` que todavía no fueron publicados

2. **Reactive backlog real**
   - eventos reactivos `published` sin fila en `outbox_reactive_log`

3. **Queue backlog persistente**
   - intents en `projection_refresh_queue` con `status in ('pending','processing')`

4. **Handler degradation**
   - filas en `outbox_reactive_log` con `result in ('retry','dead-letter')`

La surface target no debe colapsar estas cuatro capas bajo la etiqueta genérica de “proyecciones pendientes”.

El replay manual enterprise debe respetar este contrato mínimo:

- input admin-only
- filtros opcionales: `domain`, `eventType`, `occurredAfter`, `occurredBefore`, `batchSize`, `dryRun`
- response con conteo de candidatos, ejecutados, omitidos por dedupe y errores
- no debe depender de drenar backlog global sin scoping

El health model debe degradar al menos cuando ocurra esta condición:

- existen eventos reactivos nuevos `published`
- existe backlog reactivo real `> 0`
- `last_reacted_at` no avanza dentro del umbral acordado

El agente que tome la task debe decidir en Discovery si la mejor implementación vive:

- inline en `getOperationsOverview()` y `GET /api/internal/projections`, o
- en un helper nuevo shared dentro de `src/lib/sync/` o `src/lib/operations/`

pero no debe duplicar SQL derivado en múltiples surfaces sin una capa shared.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `Ops Health` y/o `Admin Center` muestran backlog reactivo real separado de `pendingProjections` y `failedHandlers`
- [ ] existe una acción admin manual scoped para replay/drain reactivo con filtros y `dryRun`
- [ ] la health surface se degrada cuando el reactive lane está atrasado aunque el publish lane siga sano
- [ ] existe al menos una verificación automatizada para el cálculo de backlog reactivo oculto y para el scoping del replay
- [ ] `ISSUE-009` queda verificablemente visible desde las surfaces operativas aun antes de que el backlog llegue a `projection_refresh_queue`

## Verification

- `pnpm exec eslint src/lib/operations src/lib/sync src/app/api/admin/ops src/app/api/internal src/views/greenhouse/admin`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec vitest run src/lib/sync/**/*.test.ts src/views/greenhouse/admin/**/*.test.tsx src/app/api/admin/ops/**/*.test.ts`
- validación manual en `/admin/ops-health` y/o `/admin` con escenario donde exista backlog reactivo real pero `pendingProjections = 0`

## Closing Protocol

- [ ] Actualizar `Handoff.md` con el nuevo significado operativo de backlog reactivo visible
- [ ] Actualizar `project_context.md` si la task introduce una nueva señal canónica o un nuevo contrato de replay operativo
- [ ] Revisar `docs/tasks/to-do/` por tasks que hoy asumen que `pendingProjections` equivale a backlog total y agregar delta si corresponde

## Follow-ups

- Si el backlog actual requiere reparación específica por dominio, abrir tasks o issues derivados por consumer afectado en vez de inflar esta lane
- Si el replay scoped revela limitaciones de volumen o timeout, evaluar un follow-on hacia worker dedicated / Cloud Run para operaciones pesadas

## Open Questions

- Si la degradación debe calcularse por umbral fijo global o por dominio del projection registry
- Si el replay scoped debe vivir como evolución de `replay-reactive` o como endpoint separado para no mezclar `run` vs `replay`
