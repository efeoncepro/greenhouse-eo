# Plan — TASK-254 Operational Cron Durable Worker Migration

## Discovery summary

- Se corrigió una colisión documental previa: `TASK-253` ya existía como task cerrada en el registry, por lo que esta lane se reasignó al siguiente ID libre, `TASK-254`, antes de continuar con el plan.
- `TASK-254` es ejecutable y no depende de otra task cerrada previamente, pero por ser `P0` + `Effort=Alto` requiere checkpoint humano antes de cualquier implementación.
- El repo real confirma que el problema no es solo de auth o de una route puntual:
  - `vercel.json` agenda `16` cron routes activas.
  - `outbox-react` corre cada `5` minutos con `maxDuration = 60`.
  - `outbox-react-delivery` corre cada `5` minutos con `maxDuration = 30`.
  - `projection-recovery` corre cada `15` minutos con `maxDuration = 30`.
- El carril reactivo implementado en `src/lib/sync/reactive-consumer.ts` ya es un worker operativo real:
  - hace scanning de backlog `published`
  - dedupe por `greenhouse_sync.outbox_reactive_log`
  - enqueue persistente a `greenhouse_sync.projection_refresh_queue`
  - refresh inline por handler
  - retries / `dead-letter`
  - devuelve `runId`, pero no persiste corridas en `greenhouse_sync.source_sync_runs`
- `src/lib/sync/refresh-queue.ts` confirma que existe una cola persistente con `FOR UPDATE SKIP LOCKED`, `claimOrphanedRefreshItems()` y estados `pending/processing/completed/failed`. `projection-recovery` no es un cron liviano: es otro worker de control plane.
- `src/lib/operations/get-operations-overview.ts` ya expone backlog reactivo oculto (`reactiveBacklog`), pero todavía no expone una señal canónica de `last successful worker run` del reactor.
- `ISSUE-009` y `ISSUE-012` ya quedaron resueltas en observabilidad y auth, pero ambas dejan claro el mismo patrón: Vercel sigue siendo el executor primario de un carril que necesita durabilidad operativa.
- El patrón Cloud Run reutilizable ya existe y está probado en el mismo monorepo:
  - `services/ico-batch/server.ts`
  - `services/ico-batch/Dockerfile`
  - auth vía Cloud Run IAM
  - monorepo import de `src/lib/*`
- Discrepancia arquitectónica detectada:
  - `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` ya dice `Cloud Scheduler -> Cloud Run` para cron/batch en GCP.
  - ese mismo documento todavía enumera “Reactive consumers del outbox” como caso que puede quedarse en Vercel si dura `< 30s`.
  - `TASK-254` existe justamente porque ese criterio ya quedó corto: aquí la necesidad no es solo duración, sino durabilidad, backlog y recovery.
- Discrepancia de región a resolver en Discovery/Execution:
  - `TASK-241` y Cloud SQL trabajan con `us-east4`.
  - partes de `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` todavía listan `us-central1` para Cloud Run / Scheduler.
  - el plan debe normalizar en `us-east4` salvo que infraestructura confirme otro baseline deliberado.
- Candidatos confirmados de primera ola:
  - `/api/cron/outbox-react`
  - `/api/cron/outbox-react-delivery`
  - `/api/cron/projection-recovery`
- Candidatos que Discovery debe clasificar pero no mezclar automáticamente en la primera ola:
  - `/api/cron/outbox-publish`
  - `/api/cron/webhook-dispatch`
  - `/api/cron/email-delivery-retry`

## Skills

- Slice 1: `gcp-cloud-run`
  - criterio de service shape, auth IAM, scheduler integration y region/config baseline para Cloud Run.
- Slice 2: `greenhouse-backend`
  - diseño del worker HTTP, shape de endpoints, reuse de `src/lib/sync/*` y separación entre route portal y executor durable.
- Slice 2: `greenhouse-postgres`
  - reuse de `greenhouse_sync.source_sync_runs` o equivalente para run tracking del worker sin inventar otra capa de persistencia.
- Slice 3: `gcp-cloud-run`
  - Cloud Scheduler, invoker auth, rollback y slimming de Vercel cron responsibility.
- Slice 4: `greenhouse-backend` + `greenhouse-postgres`
  - surfacing de `last successful worker run`, verification contract y observabilidad mínima en Ops.

## Subagent strategy

`sequential`

- No conviene forkear esta lane.
- El diseño del worker, el cutover de scheduler y el run tracking comparten demasiadas decisiones de arquitectura como para dividirlas sin riesgo de drift.
- El agente principal debe mantener una sola línea entre inventory, Cloud Run shape, tracking PostgreSQL y surfaces operativas.

## Checkpoint

`human`

Justificación:

- `Priority = P0`
- `Effort = Alto`
- toca infraestructura de ejecución, scheduler, docs canónicas y superficies operativas sensibles

## Execution order

1. **Lifecycle y baseline de task**
   - mover `TASK-254` a `in-progress`
   - dejar `plan.md` versionado
   - alinear índice + handoff para que el resto de agentes no tome la lane por fuera del plan

2. **Workload placement matrix**
   - inventariar los `16` cron actuales de `vercel.json`
   - clasificar cada uno como `keep`, `trigger only`, `migrate`, `candidate`, `deprecate`
   - actualizar `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` con la regla ampliada para workers durables

3. **Worker service shape**
   - crear `services/ops-worker/` reutilizando el patrón de `services/ico-batch/`
   - endpoints mínimos esperados:
     - `GET /health`
     - `POST /reactive/process`
     - `POST /reactive/process-domain`
     - `POST /reactive/recover`
   - auth preferida: Cloud Run IAM; bearer shared secret solo como fallback explícito si hiciera falta

4. **Run tracking / heartbeat**
   - introducir helper compartido para persistir corridas del worker reactivo
   - priorizar reuse de `greenhouse_sync.source_sync_runs` antes de abrir esquema o tabla nueva
   - exponer `last successful run` y `last failed run` de forma consumible para Ops

5. **Scheduler cutover**
   - definir jobs `Cloud Scheduler` para el worker reactivo catch-all o domain-aware
   - definir job de recovery para orphans
   - decidir si Vercel conserva estas routes como fallback manual, health probe o si salen del schedule por completo

6. **Ops surfacing mínima**
   - extender `getOperationsOverview()` y `GET /api/internal/projections` para incluir señal de worker run reciente
   - evitar mezclar aquí replay scoped y `dryRun`; eso queda en `TASK-251`

7. **Verification + docs finales**
   - tests focalizados del worker wrapper y tracking
   - typecheck/lint
   - handoff + project context + cloud infra + reactive playbook

## Files to create

- `docs/tasks/plans/TASK-254-plan.md`
- `services/ops-worker/server.ts`
- `services/ops-worker/Dockerfile`
- `services/ops-worker/README.md`
- `services/ops-worker/deploy.sh`
- `src/lib/sync/reactive-run-tracker.ts`
- `src/lib/sync/reactive-run-tracker.test.ts`
- `src/app/api/cron/**/*.test.ts` [solo si falta cobertura del wrapper/cutover]

## Files to modify

- `docs/tasks/in-progress/TASK-254-operational-cron-durable-worker-migration.md`
  - lifecycle in-progress y posteriores deltas si cambia el diseño
- `docs/tasks/README.md`
  - mover estado efectivo a in-progress y mantener próximo ID coherente
- `docs/tasks/TASK_ID_REGISTRY.md`
  - lifecycle/path actualizados
- `vercel.json`
  - quitar schedule primario de routes migradas o convertirlas en fallback según decisión final
- `src/app/api/cron/outbox-react/route.ts`
  - reducirla a fallback/manual trigger o dejar wrapper mínimo, no executor primario
- `src/app/api/cron/outbox-react-delivery/route.ts`
  - misma decisión que arriba
- `src/app/api/cron/projection-recovery/route.ts`
  - misma decisión que arriba
- `src/lib/sync/reactive-consumer.ts`
  - reuse por el worker Cloud Run y, si aplica, hooks de tracking/heartbeat
- `src/lib/sync/refresh-queue.ts`
  - reuse de recovery y posible surfacing de metadata adicional de run
- `src/lib/operations/get-operations-overview.ts`
  - señal de corrida reciente del worker
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
  - matriz de placement y región canónica
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
  - execution plane nuevo + rollback + observabilidad del worker
- `Handoff.md`
  - checkpoint y resultados del cutover
- `project_context.md`
  - regla ampliada de placement para cron worker-like

## Files to delete

- Ninguno asumido al inicio.
- La eliminación de schedules o wrappers Vercel debe ocurrir solo después del checkpoint y una vez validado el cutover.

## Risk flags

- Riesgo alto de scope creep si esta lane intenta absorber el replay scoped, el `dryRun` y la UX admin de `TASK-251`.
- Riesgo de contradicción documental si no se resuelve la región canónica (`us-east4` vs `us-central1`) antes del deploy plan.
- Riesgo de duplicar lógica si `services/ops-worker/` reescribe el consumer en vez de envolver `src/lib/sync/reactive-consumer.ts` y `refresh-queue.ts`.
- Riesgo operacional si se remueven schedules de Vercel antes de tener Cloud Scheduler + observabilidad de worker funcionando.
- Riesgo de auth drift si Cloud Run IAM y fallback bearer se mezclan sin un contrato explícito.

## Open questions

- ¿El endpoint primario debe ser catch-all con `domain` opcional o endpoints separados por dominio para mantener paridad conceptual con las routes actuales?
- ¿`outbox-publish` entra en esta misma ola por ser también un backlog worker, o solo se clasifica y se deja para follow-up?
- ¿Conviene registrar corridas reactivas en `greenhouse_sync.source_sync_runs` o hace falta una tabla separada solo si el shape actual no alcanza?
- ¿Se mantiene `outbox-react-delivery` como schedule separado por volumen/aislamiento o se absorbe en un scheduler único del worker?