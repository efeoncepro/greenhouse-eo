# TASK-1759 — Sacar el despacho de notificaciones del bus de webhooks: Greenhouse deja de hacerse POST a si mismo

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `webhook`
- Epic: `EPIC-041`
- Status real: `Diagnostico verificado contra codigo y runtime declarado; decision de arquitectura tomada; correccion no iniciada`
- Rank: `2`
- Domain: `platform|ops|finance`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

La suscripcion `wh-sub-notifications` acumula 15 dead-letters por `401 missing_signature` porque el emisor corre en el Cloud Run `ops-worker`, donde el secreto de firma no esta declarado, y el receptor corre en Vercel, donde si lo esta. El dispatcher, al no resolver el secreto, omite el header y envia igual: una suscripcion firmada se degrada a no firmada sin un solo log. Esta task no repara esa asimetria: elimina su causa estructural migrando el despacho de notificaciones a la projection reactiva, que es la primitiva canonica para efectos internos y ya existe y ya se usa para esto mismo.

## Why This Task Exists

El sintoma se reporto en `TASK-1432` (14 dead-letters, 2026-07-18) y otra vez en `TASK-1710` (15 dead-letters, 2026-08-15), sin causa ni dueño. La causa esta probada:

- El receptor exige firma cuando resuelve secreto y devuelve `401 missing_signature` cuando el header viene vacio (`src/app/api/internal/webhooks/notification-dispatch/route.ts:42-48`).
- El emisor firma dentro de un `if (secret)` sin `else`: si `resolveSecret` devuelve `null`, omite el header y hace el POST igual (`src/lib/webhooks/outbound.ts:77-83`, envio en `:104-109`). No hay log, no aborta, no marca configuracion faltante.
- El emisor vive en el `ops-worker`: `runWebhookDispatch` (`src/lib/cron-orchestrators/index.ts:52-62`) -> `handleWebhookDispatch` (`services/ops-worker/server.ts:2327-2331`, ruteo en `:3009`) -> Cloud Scheduler `ops-webhook-dispatch` cada 2 minutos (`services/ops-worker/deploy.sh:1417-1421`). Un grep repo-completo de `WEBHOOK_NOTIFICATIONS_SECRET` no devuelve ni un hit bajo `services/`: la variable no esta declarada en ese runtime.
- `resolveSecret` degrada a `null` en silencio cuando no hay ref ni env (`src/lib/secrets/secret-manager.ts:305-349`), y su warning de telemetria solo dispara para secretos de formato conocido (`:375-388`), que este no es. Cero señal.
- Son 15 y no 75 porque un `401` es 4xx no reintentable: dead-letter al primer intento (`src/lib/webhooks/retry-policy.ts:31-39`, `src/lib/webhooks/outbound.ts:161-167`). Son 15 eventos distintos quemados de a uno, un goteo lento.

Reparar el secreto seria la respuesta obvia y es la equivocada, por tres razones verificadas:

1. **La primitiva canonica ya existe y ya hace esto.** `src/lib/sync/projections/notifications.ts` es una projection reactiva que despacha notificaciones usando el mismo `NotificationService` y el mismo `sendEmail`, resolviendo destinatarios con el resolver canonico de `src/lib/notifications/person-recipient-resolver`. Corre en la lane `ops-reactive-notifications`, que ya existe (`services/ops-worker/deploy.sh`). Hay dos caminos paralelos hacia el mismo servicio.
2. **Repararlo reintroduce una notificacion duplicada.** El evento `finance.dte.discrepancy_found` esta mapeado en los dos caminos: en la projection reactiva y en `src/lib/webhooks/consumers/notification-mapping.ts`. La deduplicacion del consumer webhook filtra por `metadata->>'source' = 'webhook_notifications'` (`src/lib/webhooks/consumers/notification-dispatch.ts:46-67`), que no matchea lo que escribe la projection. Restaurar la firma haria que ese evento notifique dos veces.
3. **El bus outbound no tiene hoy un consumer externo real.** Las unicas dos suscripciones sembradas en el repo son `wh-sub-canary` y `wh-sub-notifications`, y ambas apuntan a Greenhouse. El bus se construyo en `TASK-006` para destinos externos (Slack, Nubox push, invalidacion de cache — el roadmap de `TASK-128`, nunca ejecutado) y termino usandose como transporte interno.

Usar una llamada HTTP con HMAC para que un proceso se comunique consigo mismo agrega una frontera de red y un mecanismo de autenticacion donde no hacia falta ninguno de los dos, y convierte un efecto interno en algo que puede fallar por configuracion de runtime. Eso es exactamente lo que paso durante meses, en silencio.

## Goal

- El despacho de notificaciones deja de depender de una llamada HTTP de Greenhouse a si mismo y pasa a la lane reactiva, donde la firma, el 401 y la asimetria de runtime dejan de ser posibles por construccion.
- El bus de webhooks conserva su proposito legitimo — destinos externos — y gana la defensa que le faltaba: nunca mas enviar sin firma una suscripcion declarada como firmada, y observabilidad de secretos que no resuelven.
- Los 15 dead-letters se resuelven con criterio explicito por evento, sin acknowledgement masivo ni replay ciego que mande correos rancios de nomina.
- Queda escrita la regla que impide que el patron vuelva: una suscripcion de webhook nunca apunta a Greenhouse.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- NUNCA registrar una suscripcion de webhook cuyo `target_url` apunte a un host de Greenhouse. Un efecto interno se modela como projection reactiva sobre el outbox, no como POST a si mismo.
- NUNCA modificar `resolveSecret` en `src/lib/secrets/secret-manager.ts` para que lance en vez de devolver `null`. Ese resolver es compartido: el webhook inbound de Resend depende de recibir `null` y responder `503` (`src/app/api/webhooks/resend/route.ts`). Volverlo fail-closed global convertiria un 503 honesto en un 500 y romperia un carril que hoy funciona. El fix va en el caller.
- NUNCA cambiar el literal `webhook_notifications` de la clave de deduplicacion durante la migracion: es lo unico que impide re-notificar eventos ya entregados.
- NUNCA replayar los 15 dead-letters en bloque. Son eventos de nomina, ordenes de compra y cambios de compensacion de semanas atras, y salen por correo real.
- NUNCA usar `acknowledgeWebhookDeadLetters` para cerrar el hallazgo: solo estampa `acknowledged_at` y fuerza el contador a cero sin entregar nada.
- SIEMPRE aplicar un cambio de env var del `ops-worker` de forma aditiva (`--update-env-vars`) y declararlo ademas en `services/ops-worker/deploy.sh`. El deploy usa `--set-env-vars`, que es destructivo.

## Normative Docs

- `docs/tasks/to-do/TASK-1710-reliability-remediation-control-plane-delivery-data.md` — umbrella que reporto el sintoma; esta task cierra su fila `Webhooks`.
- `docs/tasks/to-do/TASK-1432-greenhouse-reliability-recovery-control.md` — umbrella previa con el mismo hallazgo.
- `docs/tasks/complete/TASK-129-in-app-notifications-via-webhook-bus.md` — origen de `wh-sub-notifications`; esta task revierte su decision de transporte, no su funcionalidad.
- `docs/tasks/to-do/TASK-128-webhook-consumers-roadmap.md` — consumers externos previstos para el bus; sigue siendo el destino legitimo de esta infraestructura.
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` — si la migracion nace detras de flag, registrar la fila en el mismo PR.

## Dependencies & Impact

### Depends on

- `greenhouse_sync.outbox_events` y el consumer reactivo (`src/lib/sync/reactive-consumer.ts`)
- Lane `ops-reactive-notifications` (`services/ops-worker/deploy.sh`)
- `src/lib/notifications/notification-service.ts` y `src/lib/notifications/person-recipient-resolver.ts`
- `src/lib/webhooks/consumers/notification-mapping.ts` — se reutiliza tal cual, no se reescribe

### Blocks / Impacts

- `TASK-1710` y `TASK-1432` — cierra la fila `Webhooks` de ambas.
- `TASK-128` — el bus queda libre para su proposito real; agregar `Delta` con la regla de no auto-destino.
- `TASK-129` — su decision de transporte queda superseded; agregar `Delta`.
- Cualquier suscripcion futura con `auth_mode: 'hmac_sha256'`: el guardrail del Slice 2 cambia su comportamiento de "enviar sin firma" a "no enviar y reintentar".

### Files owned

- `src/lib/webhooks/outbound.ts`
- `src/lib/webhooks/signing.ts`
- `src/lib/webhooks/consumers/notification-dispatch.ts`
- `src/lib/webhooks/consumers/notification-mapping.ts`
- `src/app/api/internal/webhooks/notification-dispatch/route.ts`
- `src/app/api/admin/ops/webhooks/seed-notifications/route.ts`
- `src/lib/sync/projections/notifications.ts`
- `src/lib/reliability/queries/` — señal nueva `[verificar nombre de archivo al crear]`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- Projection reactiva de notificaciones funcionando: `src/lib/sync/projections/notifications.ts`, con `NotificationService`, `sendEmail`, `wasEmailAlreadySent` y el resolver canonico de destinatarios. Cubre 15 event types (leave requests, payroll calculado, lifecycle de cliente, margen, DTE, identidad, servicios).
- Lane `ops-reactive-notifications` declarada y corriendo en el `ops-worker`.
- Mapeo completo de 19 event types del lado webhook (`src/lib/webhooks/consumers/notification-mapping.ts:65-392`), incluyendo `payroll_period.exported`, `compensation_version.created`, `finance.sii_claim.detected`, `finance.purchase_order.expiring`, `finance.hes.approved`, `finance.hes.rejected`, `assignment.created`, `assignment.removed`, `member.created`.
- Deduplicacion por `eventId` en el consumer webhook (`notification-dispatch.ts:46-67`), cruzando `notifications` y `notification_log`.
- Verificacion HMAC con comparacion en tiempo constante (`src/lib/webhooks/signing.ts:18-28`).
- Politica de reintentos que distingue 4xx de 5xx (`src/lib/webhooks/retry-policy.ts:31-39`).
- Helper `ensure_secret_accessor_binding` y patron documentado de declaracion de `*_SECRET_REF` en `services/ops-worker/deploy.sh`, con el aprendizaje del incidente del 2026-07-10 escrito en el propio archivo.

### Gap

- El dispatcher envia sin firma cuando el secreto no resuelve, sin log ni señal (`outbound.ts:77-83`).
- No existe observabilidad de suscripciones cuya firma no puede resolverse en el runtime del emisor. El fallo es invisible hasta que alguien lee dead-letters a mano.
- No existe replay de `webhook_deliveries` en `dead_letter`: el dispatcher solo levanta `pending` y `retry_scheduled` (`src/lib/webhooks/store.ts:180-191`) y no hay endpoint de replay bajo `src/app/api/admin/ops/webhooks/`. Lo unico disponible es `acknowledgeWebhookDeadLetters` (`src/lib/webhooks/endpoint-health.ts:145-177`), que no reprocesa.
- El dispatcher solo crea deliveries para eventos con `occurred_at > NOW() - INTERVAL '24 hours'` (`src/lib/webhooks/dispatcher.ts:48-56`), asi que un replay por re-matcheo de eventos no alcanzaria a los 15.
- `verifySignature` no valida ventana de timestamp: el header entra al HMAC pero no hay tolerancia ni rechazo por antiguedad (`signing.ts:18-28`). Un replay firmado con timestamp viejo seria aceptado.
- El `ON CONFLICT DO UPDATE` del seed no actualiza `secret_ref` ni `auth_mode` (`seed-notifications/route.ts:37-42`): re-sembrar la suscripcion nunca repara una referencia de secreto torcida.
- `finance.dte.discrepancy_found` esta mapeado en los dos caminos con claves de deduplicacion distintas.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: emisor en el Cloud Run `ops-worker` (`services/ops-worker/**`), receptor en Vercel (`src/app/api/internal/webhooks/**`), logica compartida en `src/lib/webhooks/**`.
- Future candidate home: `worker`
- Boundary: tras la migracion, `src/lib/webhooks/**` queda como transporte hacia destinos externos exclusivamente. Los efectos internos se modelan como `ProjectionDefinition` en `src/lib/sync/projections/**`. Ningun consumer nuevo de notificaciones entra por el bus.
- Server/browser split: `server-only` en ambos lados; ninguna pieza tiene superficie de browser.
- Build impact: `none`
- Extraction blocker: la lane reactiva depende del `ops-worker` y de su acceso a PostgreSQL y a Resend; no se extrae por separado mientras el worker sea el unico drenador del outbox.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `webhook`
- Source of truth afectado: `greenhouse_sync.outbox_events` como origen; `notifications` y `notification_log` como destino; `greenhouse_sync.webhook_subscriptions` y `webhook_deliveries` como transporte a retirar para este caso.
- Consumidores afectados: personas reales que reciben notificaciones in-app y correo (nomina, finanzas, asignaciones, identidad).
- Runtime target: `worker`

### Contract surface

- Contrato existente a respetar: `ProjectionDefinition` (`src/lib/sync/projection-registry.ts`), `WebhookEnvelope` (`src/lib/webhooks/types.ts`), `NotificationService.dispatch`.
- Contrato nuevo o modificado: projection reactiva de notificaciones ampliada con los 19 event types del bus; guardrail de firma en el dispatcher; señal de confiabilidad nueva; ventana de timestamp en la verificacion.
- Backward compatibility: `gated` — la migracion nace detras de flag para permitir shadow y corte reversible.
- Full API parity: el despacho de notificaciones queda como efecto de dominio gobernado por el outbox, consumible por cualquier runtime que drene la lane, sin depender de una ruta HTTP interna.

### Data model and invariants

- Entidades/tablas/views afectadas: `notifications`, `notification_log`, `greenhouse_sync.webhook_subscriptions`, `greenhouse_sync.webhook_deliveries`, `greenhouse_sync.outbox_events`.
- Invariantes que no se pueden romper:
  - La clave de deduplicacion conserva el literal `webhook_notifications` en `metadata->>'source'`. Cambiarlo re-notifica todo lo ya entregado.
  - Ningun evento queda cubierto por los dos caminos a la vez. `finance.dte.discrepancy_found` tiene exactamente un dueño al cerrar la migracion.
  - Una suscripcion con `auth_mode: 'hmac_sha256'` nunca sale sin header de firma.
  - `webhook_deliveries` no se borra: una entrega historica se archiva con razon, nunca se elimina.
  - Retirar `wh-sub-notifications` es desactivarla, no borrar su fila ni sus entregas.
- Write-target allowlist: no se introducen tablas nuevas. Si el dominio de notificaciones tiene boundary test con allowlist, verificarlo sin agregar destinos.
- Tenant/space boundary: los destinatarios se resuelven con `person-recipient-resolver` y por `ROLE_CODES`; la migracion no cambia esa derivacion.
- Idempotency/concurrency: deduplicacion por `eventId` mas `user_id` mas `category` mas `source`; la lane reactiva ya colapsa eventos por scope y registra cada intento en `outbox_reactive_log`.
- Audit/outbox/history: `outbox_reactive_log` y `handler_health` reemplazan a `webhook_deliveries` como rastro de este flujo. `notification_log` sigue siendo el registro de entrega.

### Migration, backfill and rollout

- Migration posture: `none` en schema. El cambio es de transporte y de configuracion de suscripcion.
- Default state: `flag OFF`. La projection nace apagada; se enciende en staging, se verifica en shadow y recien despues se retira la suscripcion.
- Backfill plan: no hay backfill de datos. Los 15 dead-letters se resuelven en el Slice 6 con criterio por evento, no con un job masivo.
- Rollback path: apagar el flag reactiva el camino previo. Como el camino previo esta roto en produccion desde hace meses, el rollback real deja el sistema en el estado actual, no peor.
- External coordination: si durante el Slice 1 se decide declarar el secreto en el `ops-worker` como medida puente, requiere editar `services/ops-worker/deploy.sh`, aplicar `--update-env-vars` en vivo y verificar el binding `secretAccessor` de la service account. Coordinar con quien opere GCP.

### Security and access

- Auth/access gate: HMAC-SHA256 para el bus externo; la lane reactiva corre con la identidad del worker y no expone superficie HTTP nueva.
- Sensitive data posture: los payloads incluyen datos de nomina, compensacion y finanzas. No loggear cuerpos de evento ni valores de secreto. El error nuevo del guardrail reporta el nombre de la referencia, jamas el valor.
- Error contract: los fallos del guardrail se registran como estado de delivery y señal de confiabilidad; no cruzan a superficie cliente. El receptor conserva `canonicalErrorResponse` donde ya aplica.
- Abuse/rate-limit posture: la ventana de timestamp del Slice 5 cierra la aceptacion de replays firmados antiguos. La deduplicacion por `eventId` actua como guardia de replay a nivel de efecto.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/webhooks src/lib/sync src/lib/notifications`, `pnpm local:check`.
- DB/runtime checks: `SELECT` a `webhook_subscriptions` confirmando `auth_mode`, `secret_ref` y `target_url` reales; `SELECT` a `webhook_deliveries` en `dead_letter` con `event_id` y `occurred_at`; `handler_health` de la projection nueva.
- Integration checks: ejercicio end-to-end en staging con un evento real de baja consecuencia, confirmando entrega in-app y correo.
- Reliability signals/logs: señal nueva de secretos de firma no resueltos; `handler_health` de la lane de notificaciones.
- Production verification sequence: ver `Rollout Plan & Risk Matrix`.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

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

### Slice 1 — Hacer visible el secreto que no resuelve

- Crear un reader que, por cada fila de `webhook_subscriptions` con `auth_mode` que exija firma, reporte si su `secret_ref` resuelve en el runtime del emisor.
- Registrar la señal de confiabilidad `webhooks.subscription.signing_secret_unresolved`, steady 0, severidad `error` con cualquier valor mayor que cero.
- Ejecutarlo contra la base real y dejar el inventario de las suscripciones existentes como evidencia en la task.
- Entregable: el fallo que estuvo invisible meses queda medido antes de que el guardrail cambie ningun comportamiento.

### Slice 2 — Guardrail: no enviar sin firma lo que se declaro firmado

- En `src/lib/webhooks/outbound.ts:77-83`, cuando `auth_mode` exige firma y el secreto no resuelve, no enviar. Marcar la delivery como `retry_scheduled` con error `signing_secret_unresolved` — recuperable, no `dead_letter`, porque la causa es configuracion y no un rechazo del destino.
- Emitir la señal del Slice 1 desde ese punto.
- Entregable: una suscripcion firmada jamas vuelve a degradarse a no firmada en silencio.

### Slice 3 — Migrar el despacho a la projection reactiva

- Extender `src/lib/sync/projections/notifications.ts` (o registrar una projection hermana en la misma lane) para cubrir los 19 event types de `notification-mapping.ts`, reutilizando ese modulo de mapeo tal cual.
- Conservar la clave de deduplicacion con el literal `webhook_notifications`.
- Resolver la colision de `finance.dte.discrepancy_found`: elegir dueño unico y declararlo en la task con su razon.
- Nace detras de flag, apagada, con su fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR.
- Entregable: camino reactivo completo, apagado, listo para shadow.

### Slice 4 — Retirar la suscripcion y cerrar la puerta

- Desactivar `wh-sub-notifications` (`active=false`), sin borrar la fila ni sus entregas historicas.
- Agregar guardia en el path de alta de suscripciones que rechace un `target_url` apuntando a un host de Greenhouse, con mensaje que explique la alternativa.
- Actualizar `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` con la decision: el bus es para destinos externos; los efectos internos son projections.
- Entregable: el patron no puede repetirse por descuido.

### Slice 5 — Ventana de timestamp en la verificacion HMAC

- Agregar tolerancia de antiguedad en `verifySignature` (`src/lib/webhooks/signing.ts:18-28`), rechazando timestamps fuera de ventana.
- Tests que fijen aceptacion dentro de ventana y rechazo fuera.
- Entregable: el bus externo deja de aceptar replays firmados antiguos.

### Slice 6 — Resolver los 15 dead-letters con criterio

- Listar los 15 con `event_id`, `event_type` y `occurred_at`.
- Clasificar cada uno: sigue siendo accionable para su destinatario, o ya perdio vigencia.
- Los vigentes se entregan por el camino reactivo nuevo. Los vencidos se archivan con razon escrita por evento.
- No usar `acknowledgeWebhookDeadLetters` como atajo de cierre.
- Entregable: cero dead-letters activos, con una linea de justificacion por evento.

## Out of Scope

- Los dead-letters reactivos de `contract_mrr_arr`: carril distinto, tabla distinta, dueño distinto (`TASK-1758`).
- El timeout del `reliability_control_plane`: pertenece a `TASK-928`.
- El webhook inbound de Resend (`src/app/api/webhooks/resend/route.ts`). Es otro subsistema — direccion opuesta, firma Svix, secreto distinto, runtime distinto — y hoy funciona correctamente con postura fail-closed. Esta task no lo toca.
- Construir el replay generico de `webhook_deliveries` en dead-letter. Si al ejecutar el Slice 6 se concluye que hace falta como capability permanente, es task propia: un command con allowlist explicita de `webhook_delivery_id`, `dryRun` y auditoria.
- Los consumers externos previstos en `TASK-128` (Slack, Nubox push, invalidacion de cache). Esta task deja el bus sano para ellos, no los implementa.
- Migrar `wh-sub-canary` a otro transporte. Es una suscripcion de prueba y su auto-destino es deliberado; evaluar aparte si conviene conservarla.

## Detailed Spec

### La asimetria, en una figura

```
  ops-worker (Cloud Run)                      Vercel
  ────────────────────────                    ──────────────────────
  Scheduler ops-webhook-dispatch */2min
        │
        ▼
  dispatchPendingWebhooks
        │  resolveSecret('WEBHOOK_NOTIFICATIONS_SECRET')
        │      → null   (la var NO esta declarada aca)
        │
        │  if (secret) { firmar }     ← sin else, sin log
        ▼
  POST sin x-greenhouse-signature  ───────▶  notification-dispatch
                                                   │ resolveSecret → OK
                                                   │ (la var SI esta aca)
                                                   ▼
                                             401 missing_signature
                                                   │
                                             4xx → dead_letter (intento 1)
```

### Decision de arquitectura

**Decision.** El despacho de notificaciones se modela como projection reactiva sobre el outbox. El bus de webhooks queda reservado para destinos externos. Greenhouse no se hace POST a si mismo.

**Alternativas rechazadas.**

- *Declarar el secreto en el `ops-worker` y dejar todo como esta.* Restaura la entrega en minutos, pero conserva la frontera de red innecesaria, mantiene viva la duplicacion de `finance.dte.discrepancy_found` y deja el flujo expuesto a la misma clase de fallo en cada cambio de runtime. Sirve como medida puente si el operador decide que la interrupcion no puede esperar a la migracion; no sirve como solucion.
- *Mover el receptor al `ops-worker` para que emisor y receptor compartan runtime.* Elimina la asimetria pero conserva el HTTP y el HMAC entre dos partes del mismo proceso. Es complejidad sin contraparte.
- *Hacer que el receptor acepte sin firma cuando el emisor es interno.* Debilita una defensa real para tapar un problema de configuracion. Rechazada sin mas.

**Por que la projection es la primitiva correcta.** El repo ya canonizo el patron: `src/lib/sync/projections/notifications.ts` despacha notificaciones por esa via, la lane `ops-reactive-notifications` existe, y los correos transaccionales de hiring y el del ebook de growth ya viven ahi. La migracion no inventa nada: mueve un caso al lugar donde sus hermanos ya estan.

**Los cuatro pilares.**

| Pilar | Como queda |
|---|---|
| Seguridad | Desaparece una superficie HTTP interna autenticada por HMAC. Para el bus externo que queda, el Slice 2 impide enviar sin firma y el Slice 5 cierra la aceptacion de replays antiguos. |
| Robustez | El fallo por configuracion de runtime deja de ser posible en este flujo: no hay secreto que resolver. La deduplicacion por `eventId` se conserva intacta. |
| Resiliencia | El rastro pasa de `webhook_deliveries` a `outbox_reactive_log` mas `handler_health`, que si tiene endpoint de replay (`POST /api/admin/ops/replay-reactive`) — capacidad que el carril de webhooks no tiene. |
| Escalabilidad | Se elimina un round-trip HTTP por notificacion y la dependencia de que dos runtimes compartan configuracion. |

**Costo honesto.** El bus queda con una sola suscripcion viva (`wh-sub-canary`) hasta que aterricen los consumers externos de `TASK-128`. Es infraestructura construida esperando su caso de uso real, y esta task la deja sana en vez de mal usada.

### Consulta de confirmacion previa

```sql
SELECT subscription_id, target_url, auth_mode, secret_ref, active, paused_at
  FROM greenhouse_sync.webhook_subscriptions;

SELECT d.subscription_id, d.status, d.attempt_count, d.error_message,
       e.event_type, e.occurred_at
  FROM greenhouse_sync.webhook_deliveries d
  JOIN greenhouse_sync.outbox_events e ON e.event_id = d.event_id
 WHERE d.status = 'dead_letter'
 ORDER BY e.occurred_at DESC;
```

La segunda query produce el insumo del Slice 6: sin `event_type` y `occurred_at` no se puede decidir que sigue siendo accionable.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (señal) -> Slice 2 (guardrail). La señal va primero a proposito: el guardrail cambia el comportamiento de toda suscripcion firmada, y hay que saber cuales quedarian bloqueadas antes de bloquearlas.
- Slice 3 (projection) -> Slice 4 (retiro). Nunca retirar la suscripcion antes de tener el camino nuevo verificado en staging.
- Slice 4 -> Slice 6. Los dead-letters se resuelven cuando ya existe un camino que puede entregarlos.
- Slice 5 puede correr en paralelo desde que Slice 2 cerro.
- El Slice 6 nunca se ejecuta como operacion masiva. Es evento por evento.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Replay de los 15 manda correos de nomina y ordenes de compra de semanas atras a personas reales | payroll | high | Slice 6 obliga clasificacion por evento; prohibicion explicita de replay masivo | revision humana del listado con `occurred_at` |
| Doble notificacion de `finance.dte.discrepancy_found` durante el shadow | finance | medium | Resolver dueño unico en el Slice 3 antes de encender el flag | conteo de `notification_log` por `eventId` |
| El guardrail detiene entregas de otra suscripcion firmada cuyo secreto tampoco resuelve | ops | medium | Slice 1 mide el universo antes de aplicar el guardrail; `retry_scheduled` deja la entrega recuperable en vez de matarla | `webhooks.subscription.signing_secret_unresolved` |
| Cambiar el literal de deduplicacion re-notifica todo lo ya entregado | identity | low | Invariante escrito; test que fija el literal | conteo de `notification_log` |
| Un `--set-env-vars` durante la medida puente borra `RESEND_API_KEY_SECRET_REF` y mata el correo del worker en silencio | cloud | medium | Solo `--update-env-vars` en vivo mas declaracion en `deploy.sh`; verificar la revision activa despues de aplicar | ausencia de filas nuevas en `email_deliveries` |
| Retirar la suscripcion deja eventos sin cubrir porque la projection no mapeo alguno de los 19 | platform | medium | Shadow con ambos caminos y comparacion de cobertura antes del retiro | diff de event types cubiertos |
| El flag se enciende solo en Vercel y no en el worker | cloud | medium | La lane vive en el `ops-worker`; declarar el runtime en la fila del ledger y verificar en la revision activa | `handler_health` de la projection sin invocaciones |

### Feature flags / cutover

La projection del Slice 3 nace detras de un flag de entorno en estado apagado, con su fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` creada en el mismo PR. El flag se lee en el `ops-worker`, que es donde corre la lane: encenderlo en Vercel no produce ningun efecto. Se declara en `services/ops-worker/deploy.sh` para que el `--set-env-vars` destructivo del deploy no lo borre, y se aplica en vivo con `--update-env-vars` para efecto inmediato. Hacer solo lo segundo lo pierde en el siguiente deploy, en silencio.

Secuencia de corte: flag encendido en staging con la suscripcion aun activa (shadow, comparando cobertura) -> verificacion de que no hay duplicados -> retiro de la suscripcion en staging -> repetir en produccion con 24 horas de enfriamiento.

El guardrail del Slice 2 va sin flag: es una correccion de seguridad cuyo comportamiento previo es enviar sin firma, y no existe razon para conservar ese estado de forma gradual.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del PR; se pierde la señal, nada mas cambia | <5 min | si |
| Slice 2 | revert del PR; el dispatcher vuelve a enviar sin firma | <5 min | si |
| Slice 3 | apagar el flag; el camino reactivo queda inerte | <5 min | si |
| Slice 4 | reactivar la suscripcion con `active=true`; la fila no se borro | <10 min | si |
| Slice 5 | revert del PR | <5 min | si |
| Slice 6 | sin retorno: una notificacion entregada a una persona no se puede recoger. Por eso la decision es por evento y con revision humana previa | no aplica | no |

### Production verification sequence

1. Ejecutar las dos queries de confirmacion y guardar la salida como estado previo.
2. Merge del Slice 1. Verificar la señal contra la base real y registrar el inventario de suscripciones.
3. Merge del Slice 2. Confirmar en `webhook_deliveries` que las entregas afectadas quedan `retry_scheduled` y no `dead_letter`.
4. Merge del Slice 3 con flag apagado. Confirmar que nada cambio.
5. Encender el flag en staging. Ejercitar un evento real de baja consecuencia end-to-end: llega in-app y llega correo, una sola vez.
6. Comparar cobertura de event types entre ambos caminos. Stop si falta alguno.
7. Retirar la suscripcion en staging. Verificar que las notificaciones siguen llegando.
8. Repetir 5-7 en produccion con 24 horas de enfriamiento.
9. Ejecutar el Slice 6 con el listado clasificado y revisado por un humano.
10. Observar 7 dias: `handler_health` de la projection estable y la señal del Slice 1 en cero.

### Out-of-band coordination required

Requiere coordinacion con quien opere GCP para el flag del `ops-worker` y, si se toma la medida puente, para el binding `secretAccessor`. Requiere aviso a People Ops y Finanzas antes del Slice 6: si algun evento vencido se decide entregar, alguien recibira una notificacion sobre un hecho de hace semanas y debe estar advertido. El retiro de la suscripcion no requiere coordinacion externa porque el destino es Greenhouse mismo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La señal `webhooks.subscription.signing_secret_unresolved` existe, esta registrada y devuelve un valor medido contra la base real.
- [ ] El inventario de suscripciones con `auth_mode`, `secret_ref`, `target_url` y resultado de resolucion quedo registrado en la task o en `Handoff.md`.
- [ ] `src/lib/webhooks/outbound.ts` no envia cuando el `auth_mode` exige firma y el secreto no resuelve, y marca `retry_scheduled` con error identificable.
- [ ] Existe test que falla si el dispatcher vuelve a enviar sin header de firma una suscripcion declarada como firmada.
- [ ] La projection reactiva cubre los 19 event types de `notification-mapping.ts`, verificado por comparacion explicita de listas.
- [ ] La clave de deduplicacion conserva el literal `webhook_notifications`, fijado por test.
- [ ] `finance.dte.discrepancy_found` tiene exactamente un dueño, declarado en la task con su razon.
- [ ] El flag esta declarado en `services/ops-worker/deploy.sh` y registrado en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` con su runtime.
- [ ] El ejercicio end-to-end en staging entrego in-app y correo exactamente una vez, con evidencia.
- [ ] `wh-sub-notifications` quedo `active=false`, con su fila y sus entregas historicas intactas.
- [ ] Existe guardia que rechaza registrar una suscripcion cuyo `target_url` apunte a un host de Greenhouse, con test.
- [ ] `verifySignature` rechaza timestamps fuera de ventana, con test de aceptacion y de rechazo.
- [ ] Los 15 dead-letters quedan en cero activos, con una linea de justificacion por evento indicando si se entrego o se archivo.
- [ ] `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` documenta la decision y la regla de no auto-destino.
- [ ] `TASK-1710`, `TASK-1432`, `TASK-129` y `TASK-128` recibieron `Delta`.
- [ ] El webhook inbound de Resend sigue respondiendo correctamente, verificado explicitamente como control de no-regresion.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm vitest run src/lib/webhooks src/lib/sync src/lib/notifications src/app/api/webhooks`
- `pnpm test` como gate de cierre antes de mover el archivo a `complete/`
- `pnpm build` como gate de cierre, con autorizacion previa del operador por el costo de memoria
- Verificacion manual contra PostgreSQL via `pnpm pg:connect:shell` con las dos queries de confirmacion
- Ejercicio end-to-end en staging con evidencia de entrega unica

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] La clasificacion evento por evento de los 15 dead-letters quedo registrada en `Handoff.md`, no solo en la consola del agente.
- [ ] El estado final del flag por runtime quedo reflejado en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.

## Follow-ups

- Replay gobernado de `webhook_deliveries` en dead-letter como capability permanente, si el Slice 6 demuestra que hace falta: command con allowlist explicita de `webhook_delivery_id`, `dryRun` y auditoria.
- Evaluar si `wh-sub-canary` debe conservarse una vez que el bus quede sin suscripciones internas.
- Retomar `TASK-128` con los consumers externos reales, ahora que el bus queda sano y con la regla de no auto-destino escrita.
- Auditar si otros flujos internos usan el bus de webhooks como transporte, mas alla de las dos suscripciones sembradas en el repo.

## Open Questions

1. **Dueño de `finance.dte.discrepancy_found`.** Esta mapeado en la projection reactiva y en el mapeo del bus, con destinatarios posiblemente distintos. Comparar ambos mapeos antes de elegir; no asumir que el de la projection es el correcto solo por estar vivo.
2. **Medida puente.** Si el operador decide que la interrupcion no puede esperar a la migracion, declarar el secreto en el `ops-worker` restaura la entrega en minutos. Es andamiaje que se retira al cerrar el Slice 4, y reintroduce temporalmente la duplicacion de la pregunta 1. Es decision del operador, no del agente.
3. **Alcance del corte de vigencia en el Slice 6.** Falta definir a partir de que antiguedad un evento deja de ser accionable, y si el criterio es uniforme o depende del tipo. Un aviso de orden de compra por vencer caduca distinto que un cambio de compensacion.
4. **Ventana de timestamp del Slice 5.** Elegir la tolerancia concreta y verificar que ningun destino externo futuro quede excluido por reloj desincronizado.

## Delta 2026-08-21 (2) — Medición runtime: la suscripción SÍ funcionó; es una regresión fechada

Medido contra PostgreSQL el 2026-08-21, después de escribir esta task. La premisa original —"el secreto nunca estuvo declarado en el runtime del emisor, así que nunca funcionó"— es **incorrecta**:

```
    mes     |   status    | count | http
 2026-03-01 | dead_letter |     1 |  500
 2026-04-01 | succeeded   |     6 |  200
 2026-05-01 | succeeded   |    29 |  200
 2026-06-01 | succeeded   |    11 |  200
 2026-06-01 | dead_letter |    13 |  401
 2026-07-01 | dead_letter |     1 |  401
 2026-08-01 | dead_letter |     1 |  401
```

**46 entregas exitosas** entre 2026-04-08 y 2026-06-12. El primer `401 missing_signature` es del **2026-06-15**; los 15 restantes van hasta el 2026-08-01. El `500` de marzo es un fallo distinto y anterior. Total real: **16** dead-letters, no 15.

Correcciones sobre esta task:

- La pregunta de Discovery deja de ser "por qué falta el secreto" y pasa a ser **"qué cambió el 2026-06-15"**. Candidato principal: un `deploy.sh` del `ops-worker` que borró con `--set-env-vars` una variable aplicada out-of-band con `--update-env-vars`. Es exactamente el modo de falla que el propio `services/ops-worker/deploy.sh` documenta y que ocurrió el 2026-07-10 con `GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED`. Verificar el historial de revisiones de Cloud Run alrededor de esa fecha antes de asumir.
- La configuración de la suscripción está **correcta** en la base: `auth_mode='hmac_sha256'`, `secret_ref='WEBHOOK_NOTIFICATIONS_SECRET'`, `active=true`. La hipótesis (a) del `secret_ref` torcido queda descartada con evidencia.
- Composición real de los 16: **13 `member.created`** (2026-03-29 a 2026-06-26), **2 `payroll_period.exported`** (2026-07-06 y 2026-08-01), **1 `compensation_version.created`** (2026-06-15). Ese detalle es el insumo del Slice 6: los `member.created` viejos casi con seguridad ya no son accionables.
- Está **congelado**: el último dead-letter es del 2026-08-01, hace 20 días. No crece.

**Hallazgo de seguridad adicional, no contemplado en el scope original.** El `target_url` de las suscripciones `wh-sub-notifications` y `wh-sub-canary` contiene el token `x-vercel-protection-bypass` **en texto plano como query param, persistido en `greenhouse_sync.webhook_subscriptions`**. Viola la regla de no poner datos sensibles en URLs y deja un secreto de bypass en una columna legible. Agregar al Slice 4: al retirar la suscripción, el token queda igualmente expuesto en la fila histórica y en `wh-sub-canary`, que sigue activa. Decidir rotación con el operador.

La decisión de arquitectura del `Detailed Spec` —migrar a projection reactiva— **se sostiene sin cambios**: sigue siendo cierto que la primitiva canónica ya existe, que `finance.dte.discrepancy_found` está duplicado en ambos caminos, y que ninguna de las tres suscripciones reales tiene un destino externo verdadero.

Contexto de programa: `EPIC-041`.

## Delta 2026-08-21 (3) — El motivo de esta task no son los dead-letters: son dos avisos que nadie recibe

Verificado contra runtime el 2026-08-21. Tres correcciones al encuadre, y la tercera cambia la prioridad.

**1. Las notificaciones SÍ funcionan hoy.** `greenhouse_notifications.email_deliveries` muestra actividad continua los últimos 7 días, **100% `sent`, cero `failed`, cero `bounced`** (48 el 2026-08-19, 7 el 2026-08-20). Los 12 handlers `notification_dispatch:*` están `healthy` con `consecutive_failures = 0`. El webhook `wh-sub-notifications` es un carril **secundario y paralelo** que además apunta a staging (`dev-greenhouse.efeoncepro.com`), no el camino principal. Nada de esta task es una interrupción de servicio.

**2. Cobertura real, evento por evento.** Los 19 event types del bus no son equivalentes entre sí:

| Evento | ¿Se pierde algo hoy? |
| --- | --- |
| `payroll_period.exported` | **No** — lo cubre la projection `payroll_export_ready_notification`. El email de 2026-07 salió el 2026-08-01 |
| `assignment.created / updated / removed` | **No hoy** — cero eventos emitidos en 120 días. Pero es una bomba dormida: en cuanto alguien mueva una asignación, ese aviso tampoco saldrá |
| `member.created` | **SÍ** — 13 dead-letters (HTTP **500**, no 401). `notification_log` categoría `system_event` tiene su última fila el `2026-06-12`. Cada colaborador nuevo desde entonces no generó su aviso a admins |
| `compensation_version.created` | **SÍ** — el aviso *"Tu compensación fue actualizada"*. Última entrega exitosa `2026-06-01`; el evento del `2026-06-15` murió. **A la persona a la que le cambiaron la compensación no se le avisó** |

**3. Ese es el motivo de la task.** Está escrita como si importara por los 16 dead-letters congelados. No: los dead-letters son un backlog acotado, viejo y en su mayoría no accionable. Lo que importa es que **dos tipos de aviso quedaron huérfanos** — ninguna otra projection los cubre — y uno de ellos tiene consecuencia sobre una persona concreta que no fue informada de un cambio en su compensación.

Consecuencias operativas:

- **`Rank` pasa a `2`** en el orden de `EPIC-041`, detrás de `TASK-1760`. Es lo único del programa con consecuencia humana directa.
- **El Slice 3 es el que cierra el problema**, no el Slice 6. Al cubrir los 19 event types en la projection reactiva, `member.created` y `compensation_version.created` vuelven a emitirse. El Slice 6 (los 16 dead-letters) sigue siendo lo último y sigue siendo evento por evento.
- **`member.created` falló con HTTP 500, no 401.** Es una causa distinta a la del resto y hay que diagnosticarla aparte: el 500 sale del receptor, no de la firma ausente. Puede que el consumer reviente con ese payload. Verificarlo antes de asumir que la migración lo arregla sola.
- Si se busca la ruta más corta al valor sin esperar la migración completa, la alternativa acotada es **agregar esos dos event types a la projection reactiva existente** (`src/lib/sync/projections/notifications.ts`, que ya cubre 15 tipos) sin retirar todavía el bus. Es un subconjunto del Slice 3 y no compromete ninguna decisión de arquitectura.
