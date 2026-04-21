# TASK-551 — Outbox Reactive Decoupling from Analytics Publish

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
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-551-outbox-reactive-decoupling`
- Legacy ID: `follow-up de investigacion E2E 2026-04-20 sobre latencia de correos de permisos`
- GitHub Issue: `none`

## Summary

Desacoplar el carril reactivo operacional del publish analítico a BigQuery para que notificaciones y otras proyecciones internas no esperen a que `outbox-publish` transicione el evento a `published`. El objetivo es bajar latencia operacional sin romper el contrato transaccional del outbox ni el feed analítico.

## Why This Task Exists

La investigación E2E de 2026-04-20 mostró que el flujo de permisos sí funciona de punta a punta, pero con una latencia evitable en el control plane:

1. `publishOutboxEvent()` inserta eventos con `status = 'pending'`.
2. `publishPendingOutboxEvents()` los mueve a `published` sólo después de escribir a BigQuery.
3. `processReactiveEvents()` consume exclusivamente eventos `published`.

Eso significa que una acción operacional urgente, como un correo transaccional de permisos, depende indirectamente de que el carril analítico (`outbox-publish -> BigQuery`) haya corrido y esté sano. El sistema sigue siendo durable, pero mezcla dos responsabilidades con perfiles distintos:

- **operacional**: disparar proyecciones y notificaciones internas con baja latencia
- **analítica**: replicar el outbox a `greenhouse_raw.postgres_outbox_events`

Ese acoplamiento no es enterprise-grade. Si BigQuery se atrasa o falla, el portal no debería demorar correos, invalidaciones o materializaciones operativas urgentes.

## Goal

- Separar el concepto de "evento listo para consumidores internos" del concepto de "evento exportado a BigQuery".
- Mantener el outbox como contrato transaccional append-only, con idempotencia y replay seguro.
- Hacer que el reactive consumer procese eventos operacionales sin depender del éxito ni de la cadencia del publicador analítico.
- Dejar observabilidad explícita del tramo `occurred -> reacted` y del tramo `occurred -> published_to_bigquery`.

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
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_ARCHITECTURE_V2.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`

Reglas obligatorias:

- El outbox sigue siendo **transaccional y append-only**; no mover emails ni proyecciones al request síncrono del módulo de negocio.
- El path operacional interno no puede depender del éxito del feed analítico a BigQuery.
- `greenhouse_sync.outbox_reactive_log` y `greenhouse_sync.projection_refresh_queue` deben conservar su semántica de idempotencia y recuperación.
- BigQuery sigue siendo consumidor asíncrono del outbox; esta task no lo elimina ni lo reemplaza.
- El diseño nuevo debe ser **genérico** para todos los dominios reactivos, no un bypass especial para `notifications` o para permisos.

## Normative Docs

- `docs/tasks/complete/TASK-254-operational-cron-durable-worker-migration.md`
- `docs/tasks/to-do/TASK-262-migrate-outbox-publish-to-ops-worker.md`
- `docs/tasks/complete/TASK-379-reactive-projections-enterprise-hardening.md`
- `Handoff.md` — sesión `2026-04-20 — Resend deliverability hardening para permisos/correos reactivos`
- `project_context.md` — deltas de `outbox-publish`, `ops-worker` y flush reactivo best-effort

## Dependencies & Impact

### Depends on

- `src/lib/sync/publish-event.ts`
- `src/lib/sync/outbox-consumer.ts`
- `src/lib/sync/reactive-consumer.ts`
- `src/lib/sync/event-catalog.ts`
- `src/lib/sync/projections/notifications.ts`
- `src/lib/hr-core/postgres-leave-store.ts`
- `services/ops-worker/server.ts`
- `src/app/api/admin/ops/outbox/publish/route.ts`
- `src/app/api/admin/ops/reactive/run/route.ts`

### Blocks / Impacts

- latencia operacional de correos transaccionales (`leave_request_*`, `leave_review_confirmation`) y cualquier otra proyección reactiva urgente
- `TASK-262` — requiere re-scope o al menos coordinación, porque mover `outbox-publish` a `ops-worker` no resuelve por sí solo este acoplamiento
- futuras tasks de observabilidad de notificaciones, webhook dispatch y proyecciones reactivas
- cualquier dominio cuyo SLA interno no deba quedar subordinado a BigQuery

### Files owned

- `src/lib/sync/publish-event.ts`
- `src/lib/sync/outbox-consumer.ts`
- `src/lib/sync/reactive-consumer.ts`
- `src/lib/sync/reactive-consumer.test.ts`
- `src/lib/sync/event-catalog.ts`
- `src/lib/sync/projections/notifications.ts`
- `src/lib/hr-core/postgres-leave-store.ts`
- `services/ops-worker/server.ts`
- `src/app/api/admin/ops/outbox/publish/route.ts`
- `src/app/api/admin/ops/reactive/run/route.ts`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_ARCHITECTURE_V2.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`
- `docs/tasks/to-do/TASK-262-migrate-outbox-publish-to-ops-worker.md`

## Current Repo State

### Already exists

- `publishOutboxEvent()` inserta en `greenhouse_sync.outbox_events` con `status = 'pending'`.
- `publishPendingOutboxEvents()` lee `pending`, publica a BigQuery y luego marca `status = 'published'`.
- `processReactiveEvents()` sólo selecciona eventos `published`.
- `ops-worker` ya ejecuta el carril reactivo por dominio, incluido `notifications`, y existe fallback manual vía admin routes.
- la investigación E2E de permisos confirmó que el flujo de negocio y Resend funcionan; el gap real está en la latencia entre `occurred_at` y `published/reacted_at`.

### Gap

- la disponibilidad del evento para consumidores internos y la publicación analítica comparten la misma compuerta de estado
- un atraso o falla de BigQuery puede retrasar notificaciones y otras acciones operacionales aunque el evento ya exista en Postgres
- la cadencia del publicador (`every 5 minutes` hoy) impone un piso de latencia innecesario al carril reactivo
- no existe una separación explícita de observabilidad entre:
  - `evento persistido`
  - `evento reaccionable internamente`
  - `evento exportado a BigQuery`

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

### Slice 1 — Contract split for operational vs analytical readiness

- diseñar y aplicar el nuevo contrato del outbox para separar **readiness operacional** de **publish analítico**
- elegir una solución canónica entre:
  - nuevas columnas/estado orthogonal en `greenhouse_sync.outbox_events`, o
  - ledger/tabla separada para publish a BigQuery
- dejar una migración segura que no rompa backlog existente ni replay

### Slice 2 — Refactor del publisher y del reactive consumer

- hacer que `processReactiveEvents()` lea eventos operacionales listos sin depender de `status = 'published'`
- hacer que `publishPendingOutboxEvents()` deje de ser dueño del permiso para reaccionar internamente
- preservar idempotencia, retry y dedupe existentes

### Slice 3 — Ops-worker, admin routes y observabilidad

- alinear `ops-worker` y las routes admin con el contrato nuevo
- agregar métricas/contadores de latencia por tramo:
  - `occurred -> operational_ready`
  - `operational_ready -> reacted`
  - `occurred -> analytics_published`
- exponer señales suficientes para investigar lag sin mirar manualmente varias tablas

### Slice 4 — End-to-end validation on notifications

- probar el caso real de permisos/leave flow en staging
- demostrar que una solicitud aprobada puede generar `email_deliveries` sin esperar el ciclo de BigQuery
- validar que BigQuery sigue recibiendo el evento por su carril asíncrono propio

## Out of Scope

- cambiar templates, subjects o copy de emails
- mover el envío de correos al request síncrono del módulo HR
- reemplazar BigQuery como consumer analítico del outbox
- rediseñar los módulos de negocio que publican eventos (`hr`, `finance`, `commercial`)
- introducir un broker externo nuevo (Kafka, Pub/Sub, etc.) en esta misma task

## Detailed Spec

La decisión de diseño obligatoria es:

**Un evento puede ser reaccionable internamente antes de estar exportado a BigQuery.**

El contrato actual une ambas cosas:

```text
pending -> outbox-publish -> published -> reactive consumer
```

El contrato objetivo debe separar los carriles:

```text
transaction commit
  -> internal reactive path
  -> analytical publish path
```

Requisitos del diseño:

1. **Durabilidad**
   - el evento sigue quedando persistido en Postgres en la misma transacción del write domain

2. **No inline side effects**
   - el módulo de negocio no manda email directamente; sigue publicando outbox y el consumer reactivo hace el trabajo

3. **Idempotencia**
   - `outbox_reactive_log` sigue siendo el ledger de `(event_id, handler)`
   - el publicador a BigQuery debe conservar su propio tracking sin reusar esa misma compuerta como semántica operacional

4. **Replay / backfill**
   - el diseño debe permitir reprocesar backlog histórico sin perder el feed analítico

5. **Compatibilidad operacional**
   - las rutas existentes (`/api/admin/ops/outbox/publish`, `/api/admin/ops/reactive/run`) siguen disponibles, aunque cambie su semántica interna

6. **Observabilidad**
   - la plataforma debe poder contestar por qué un evento está:
     - persistido pero no reaccionado
     - reaccionado pero no exportado
     - exportado pero con downstream retrasado

### Guidance de implementación

- Si el diseño elegido toca `greenhouse_sync.outbox_events.status`, la migración debe evitar romper los jobs y readers legacy en el cutover.
- Si el diseño elegido crea una tabla/ledger nuevo para analytics publish, `TASK-262` debe actualizarse para reflejar que `outbox-publish` ya no es el gate del carril reactivo.
- `notifications` es el piloto de verificación, no un caso especial: la arquitectura resultante debe servir igual para `people`, `finance`, `delivery` y otros dominios reactivos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] existe un contrato explícito que separa readiness operacional de publish analítico del outbox
- [ ] `processReactiveEvents()` puede consumir eventos operacionales sin depender del éxito/cadencia de `outbox-publish`
- [ ] `publishPendingOutboxEvents()` sigue exportando el outbox a BigQuery sin convertirse en prerequisito del carril reactivo
- [ ] un flujo E2E de permisos en staging genera filas en `greenhouse_notifications.email_deliveries` antes o independientemente del tramo analítico a BigQuery
- [ ] la observabilidad deja distinguir claramente `persisted`, `reacted`, y `analytics published`
- [ ] `TASK-262` queda sincronizada o explicitamente re-scoped respecto al nuevo contrato

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit`
- `pnpm exec vitest run src/lib/sync/reactive-consumer.test.ts`
- validación manual en staging del flujo `/api/hr/core/leave/requests` -> review -> `email_deliveries`
- validación manual/operativa del feed analítico a BigQuery posterior al cambio

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `docs/tasks/to-do/TASK-262-migrate-outbox-publish-to-ops-worker.md` quedo actualizado si la nueva arquitectura cambia su scope

## Follow-ups

- reducir cadencia operativa de `outbox-publish` y/o jobs de notificaciones si, después del desacople, sigue existiendo latencia material
- extender dashboards operativos para mostrar percentiles de `occurred -> reacted`
- evaluar si otros lanes near-real-time (`webhook-dispatch`, alerting, delivery) necesitan la misma separación conceptual

## Open Questions

- ¿Conviene modelar la separación como nuevas columnas en `outbox_events` o como ledger/tabla dedicada del publish analítico?
- ¿El cutover debe hacerse en un solo paso o con compatibilidad dual temporal para readers legacy?
- ¿La métrica canónica de SLA operativo vivirá en Postgres, Cloud Monitoring, o ambas?
