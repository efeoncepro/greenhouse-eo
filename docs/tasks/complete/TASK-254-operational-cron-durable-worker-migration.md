# TASK-254 — Operational Cron Durable Worker Migration

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Cerrada`
- Rank: `1`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-254-operational-cron-durable-worker-migration`
- Legacy ID: `none`
- GitHub Issue: `[TASK-254] Operational Cron Durable Worker Migration`

## Summary

Migrar los cron operativos que hoy se comportan como workers durables fuera de Vercel y dejar a Vercel solo como portal runtime o trigger liviano. La primera ola urgente cubre el control plane reactivo (`outbox-react*`, `projection-recovery`) porque hoy la plataforma ya mostró que ese carril se atasca por una mezcla de scheduler HTTP, runtime serverless y guardrails incompletos.

## Why This Task Exists

`ISSUE-009` y `ISSUE-012` mostraron dos caras del mismo problema.

- `ISSUE-009` probó que el backlog reactivo podía crecer silenciosamente durante días.
- `ISSUE-012` probó que una variación de configuración (`CRON_SECRET`) podía detener el carril entero aunque el schedule existiera.

El fix de `ISSUE-012` corrige el bug puntual del gate de auth, pero no cambia el hecho estructural: Greenhouse sigue ejecutando workers operativos stateful dentro de requests cron de Vercel.

El carril reactivo no es un cron liviano. Hace scanning de backlog, dedupe por ledger, enqueue persistente, refresh inline y recovery de orphans. Eso ya se parece más a un worker durable que a una function HTTP periódica. La política cloud existente (`TASK-241`) ya movió los batch pesados a Cloud Run por timeout; esta task extiende esa lógica a los cron que, aunque no siempre excedan `30s`, requieren durabilidad operativa, run audit y separación clara entre scheduler y executor.

## Goal

- Definir una matriz canónica de workload placement para todos los cron actuales: `keep in Vercel`, `trigger only`, `migrate to Cloud Run/Tasks`, `deprecate`.
- Sacar del path primario de Vercel el control plane reactivo y el recovery de orphans.
- Dejar run tracking y heartbeat institucional para el carril reactivo, de forma que Ops pueda saber si el worker realmente está vivo.
- Reducir el blast radius de fallas de configuración o runtime serverless sobre los cron operativos más sensibles.

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
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`

Reglas obligatorias:

- Vercel no debe quedar como ejecutor primario de workers stateful con backlog, recovery o semántica de durabilidad, aunque la ejecución típica no exceda `30s`.
- Scheduler y execution plane deben separarse explícitamente: `Cloud Scheduler` o `Cloud Tasks` disparan; `Cloud Run` ejecuta.
- El cutover no puede romper la idempotencia del ledger reactivo ni el contrato de `projection_refresh_queue`.
- No mezclar en esta task el replay scoped enterprise de `TASK-251`; esta lane resuelve infraestructura de ejecución y fiabilidad del worker, no UX/admin remediation.

## Normative Docs

- `docs/issues/resolved/ISSUE-009-reactive-event-backlog-can-accumulate-without-ops-visibility.md`
- `docs/issues/resolved/ISSUE-012-reactive-cron-routes-fail-closed-without-cron-secret.md`
- `docs/tasks/complete/TASK-241-batch-processes-cloud-run-migration.md`
- `docs/tasks/to-do/TASK-251-reactive-control-plane-backlog-observability-replay.md`

## Dependencies & Impact

### Depends on

- `vercel.json`
- `src/app/api/cron/outbox-react/route.ts`
- `src/app/api/cron/outbox-react-delivery/route.ts`
- `src/app/api/cron/projection-recovery/route.ts`
- `src/lib/sync/reactive-consumer.ts`
- `src/lib/sync/refresh-queue.ts`
- `src/lib/cloud/cron.ts`
- `services/ico-batch/server.ts`
- `services/ico-batch/Dockerfile`

### Blocks / Impacts

- `TASK-251` — necesita un execution plane confiable para que replay y lag semantics no vivan sobre un scheduler frágil
- `TASK-252` — el Ops Copilot no debe recomendar acciones sobre un carril cuyo worker primario siga siendo inestable
- `Admin Center` y `Ops Health`
- todos los cron operativos que hoy corren en `vercel.json`

### Files owned

- `vercel.json`
- `src/app/api/cron/outbox-react/route.ts`
- `src/app/api/cron/outbox-react-delivery/route.ts`
- `src/app/api/cron/projection-recovery/route.ts`
- `src/lib/sync/reactive-consumer.ts`
- `src/lib/sync/refresh-queue.ts`
- `src/lib/operations/get-operations-overview.ts`
- `services/ops-worker/server.ts` [a crear]
- `services/ops-worker/Dockerfile` [a crear]
- `services/ops-worker/README.md` [a crear]
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `docs/tasks/in-progress/TASK-254-operational-cron-durable-worker-migration.md`

## Current Repo State

### Already exists

- `vercel.json` schedulea múltiples cron operativos, incluidos `/api/cron/outbox-publish`, `/api/cron/outbox-react`, `/api/cron/outbox-react-delivery` y `/api/cron/projection-recovery`
- `src/lib/sync/reactive-consumer.ts` ya implementa el worker real del carril reactivo: scanning de eventos `published`, dedupe por `outbox_reactive_log`, enqueue a `projection_refresh_queue`, refresh inline y ledger por handler
- `src/app/api/cron/projection-recovery/route.ts` ya barre orphans de `projection_refresh_queue` como segundo worker operativo periódico
- `services/ico-batch/` ya prueba el patrón Cloud Run reutilizable dentro del monorepo para procesos operativos pesados
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` ya declara que el trigger periódico ideal es `Cloud Scheduler -> Cloud Run`
- `ISSUE-012` ya quedó resuelta en auth: Vercel Cron válido ya no depende de `CRON_SECRET`

### Gap

- Greenhouse todavía no distingue formalmente entre `cron liviano` y `worker durable` cuando ambos se disparan en horario
- el carril reactivo no tiene un execution plane durable fuera de Vercel
- no existe un run audit/heartbeat canónico del worker reactivo comparable a `source_sync_runs` del publish lane
- `projection-recovery` sigue viviendo como cron Vercel aunque opera una cola persistente y corrige fallas del worker inline
- no existe una matriz única que diga qué cron se quedan en Vercel, cuáles migran a Cloud Run y cuáles deben pasar a `Cloud Tasks`

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

### Slice 1 — Cron inventory and workload placement matrix

- clasificar todos los entries actuales de `vercel.json` como `keep in Vercel`, `trigger only`, `migrate to Cloud Run`, `candidate for Cloud Tasks`, o `deprecate`
- actualizar la política cloud para que el criterio no dependa solo de duración (`>30s`), sino también de durabilidad, backlog, retries, recovery y blast radius operacional
- dejar explícito qué cron entran en la primera ola urgente y cuáles quedan para follow-on

### Slice 2 — Durable worker for reactive control plane

- crear un worker Cloud Run dedicado para ejecutar el carril reactivo fuera de Vercel
- soportar al menos:
  - process backlog catch-all
  - process backlog por dominio
  - recovery de orphans de `projection_refresh_queue`
- agregar run tracking o heartbeat institucional del worker para que Ops pueda saber si el executor está vivo y avanzando

### Slice 3 — Scheduler cutover and Vercel slimming

- crear jobs `Cloud Scheduler` para el worker reactivo y su recovery
- sacar de `vercel.json` la responsabilidad primaria de ejecutar esos workers
- dejar las routes Vercel migradas como fallback manual, health probe, trigger liviano o eliminarlas, según la decisión de Discovery
- documentar un rollback corto y verificable en caso de falla del cutover

### Slice 4 — Ops verification and runtime hardening

- validar que el backlog reactivo vuelve a drenar sin depender del cron Vercel primario
- exponer en surfaces operativas una señal mínima de `last successful worker run` o equivalente institucional
- dejar alerting/failure path claro para el worker migrado

## Out of Scope

- implementar en esta misma task el replay scoped, `dryRun` y affordances admin de `TASK-251`
- migrar todos los cron de `vercel.json` a Cloud Run en una sola ola
- rediseñar la lógica de negocio de las proyecciones o de los handlers reactivos
- mover rutas portal-facing normales fuera de Vercel
- rehacer `services/ico-batch` salvo que Discovery justifique compartir infraestructura o utilidades

## Detailed Spec

La decisión que esta task debe institucionalizar es:

**No todo cron es un batch pesado, pero sí existen cron que, aunque duren poco, operan como workers durables y no deben depender del runtime HTTP de Vercel como ejecutor primario.**

La primera ola mínima debe cubrir al menos:

1. `outbox-react`
2. `outbox-react-delivery`
3. `projection-recovery`

Discovery debe decidir si `outbox-publish` y `webhook-dispatch` también entran en la misma ola o quedan solo clasificados para follow-up.

La implementación objetivo debe separar tres planos:

1. **Scheduler plane**
   - `Cloud Scheduler` define la cadencia

2. **Execution plane**
   - `Cloud Run` ejecuta el worker con timeout, logging y auth GCP nativos

3. **Portal plane**
   - Vercel mantiene routes sólo cuando agregan valor de portal, fallback manual o integración liviana

El worker reactivo nuevo debe respetar estos contratos:

- idempotencia del ledger `greenhouse_sync.outbox_reactive_log`
- integridad de `greenhouse_sync.projection_refresh_queue`
- soporte a dominio opcional sin duplicar lógica del consumer
- respuesta auditable con conteos y `runId`
- observabilidad mínima de éxito/falla por corrida

La política de workload placement actual debe ampliarse con una regla adicional:

- **si un cron procesa backlog, reintenta orphans, depende de una cola persistente o es parte del control plane operativo, debe correr en un worker durable aunque no supere el umbral nominal de 30 segundos**

## Acceptance Criteria

- [ ] existe una matriz documentada para todos los cron de `vercel.json` con decisión `keep / trigger / migrate / deprecate`
- [ ] `outbox-react` y `projection-recovery` ya no dependen de Vercel como executor primario scheduleado
- [ ] existe un worker Cloud Run operativo para el carril reactivo con auth y logging institucionales
- [ ] Ops puede ver al menos una señal verificable de corrida exitosa reciente del worker reactivo
- [ ] la documentación cloud y el playbook reactivo quedan alineados con la nueva regla de workload placement

## Verification

- `pnpm exec eslint src/app/api/cron src/lib/sync src/lib/operations services/ops-worker`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec vitest run src/lib/cron/**/*.test.ts src/lib/sync/**/*.test.ts src/app/api/cron/**/*.test.ts`
- validación manual de cron/worker en `staging`: backlog reactivo drena, `lastReactedAt` avanza y el worker deja evidencia de corrida reciente

## Closing Protocol

- [ ] actualizar `Handoff.md` con el cutover real de scheduler/executor y cualquier rollback pendiente
- [ ] actualizar `project_context.md` con la regla ampliada de workload placement para cron worker-like
- [ ] revisar `docs/tasks/to-do/` por tasks que asuman que el carril reactivo seguirá corriendo primariamente en Vercel y agregar delta si corresponde

## Follow-ups

- clasificar y migrar, si aplica, `outbox-publish`, `webhook-dispatch`, `email-delivery-retry` y otros cron operativos que Discovery marque como worker-like
- evaluar `Cloud Tasks` para fan-out de dominios o shards del backlog si el volumen sigue creciendo
- endurecer `TASK-251` y `TASK-252` sobre el nuevo execution plane una vez estabilizado el cutover

## Open Questions

- ~~decidir si el worker nuevo vive como servicio dedicado~~ → **Decidido**: servicio dedicado `services/ops-worker/`
- ~~decidir si `outbox-react-delivery` queda como endpoint dedicado~~ → **Decidido**: endpoint dedicado `POST /outbox-react-delivery` con `domain=delivery`
- decidir si `outbox-publish` entra en la misma ola o si sólo se documenta como candidato posterior → **Decidido**: queda como candidato posterior (classified `trigger only`)

## Implementation Notes (2026-04-05)

### Archivos creados

- `services/ops-worker/server.ts` — HTTP server con 4 endpoints
- `services/ops-worker/Dockerfile` — two-stage esbuild build
- `services/ops-worker/deploy.sh` — deploy idempotente a Cloud Run + 3 Cloud Scheduler jobs
- `services/ops-worker/.dockerignore`
- `services/ops-worker/README.md`
- `src/lib/sync/reactive-run-tracker.ts` — run tracking sobre `source_sync_runs`

### Archivos modificados

- `vercel.json` — 3 cron eliminados (16 → 13)
- `src/lib/operations/get-operations-overview.ts` — subsistema Reactive Worker
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` — v1.2

### Verificación

- `tsc --noEmit` OK, `pnpm lint` OK, `pnpm build` OK
- Deploy a Cloud Run pendiente como acción infrastructure separada
