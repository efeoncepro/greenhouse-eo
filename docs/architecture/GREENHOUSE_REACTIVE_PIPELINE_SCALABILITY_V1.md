# GREENHOUSE_REACTIVE_PIPELINE_SCALABILITY_V1

> **Tipo de documento:** Evaluación arquitectónica — modelo actual vs modelo futuro
> **Versión:** 1.0
> **Creado:** 2026-04-15
> **Estado:** Evaluación abierta — sin commitment de ejecución
> **Documentos relacionados:**
> - [GREENHOUSE_REACTIVE_PROJECTIONS_ARCHITECTURE_V2.md](GREENHOUSE_REACTIVE_PROJECTIONS_ARCHITECTURE_V2.md)
> - [GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V2.md](GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V2.md)
> - [GREENHOUSE_REACTIVE_PROJECTIONS_SLO_V1.md](GREENHOUSE_REACTIVE_PROJECTIONS_SLO_V1.md)
> - [GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md](GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md) §4.9

---

## Propósito

Este documento evalúa la escalabilidad del pipeline reactivo actual de Greenhouse y documenta el modelo alternativo que habría que considerar **cuando** el volumen de eventos empiece a saturar el modelo actual. No es una task ni un plan de ejecución — es una nota técnica para referencia futura.

**Cuándo leer este documento:**
- Cuando `queue-depth` sostenido supere 500 en cualquier domain durante >15 min
- Cuando `oldest_event_age_seconds` supere 600s de forma recurrente
- Cuando usuarios reporten latencia visible en chains reactivos (ej: "reliquidé y el email llegó 10 min después")
- Cuando el costo de Cloud Run + Cloud Scheduler del ops-worker supere un umbral operativo
- Antes de onboardear un nuevo cliente que 10x-ee el volumen de eventos

---

## 1. Modelo actual — scheduler-poll

### 1.1 Topología

```
Vercel Next.js (runtime)                Cloud SQL (Postgres)
        │                                       │
        │  INSERT evento                        │
        └──────────────────────────────────────▶│
                                                │
                              greenhouse_sync.outbox_events
                              greenhouse_sync.refresh_queue
                                                │
                                                │
         Cloud Scheduler                        │
         ┌─────────────────────┐                │
         │ ops-reactive-*      │ POST           │
         │ every 2-15 min      │ ───▶ ops-worker (Cloud Run)
         └─────────────────────┘                │
                                                │
                                                ▼
                                       SELECT ... FOR UPDATE SKIP LOCKED
                                       LIMIT 500
                                                │
                                                ▼
                                      reactive handler pipeline
                                                │
                                                ▼
                             INSERT outbox_reactive_log
                             ON CONFLICT DO NOTHING
```

### 1.2 Componentes actuales

| Componente | Configuración | Ubicación |
|---|---|---|
| Outbox writer | Transaccional con el commit de negocio | `src/lib/sync/outbox.ts` |
| Refresh queue | `SELECT ... FOR UPDATE SKIP LOCKED` | `src/lib/sync/refresh-queue.ts` |
| Idempotencia | `outbox_reactive_log` con `ON CONFLICT DO NOTHING` | `src/lib/sync/reactive-run-tracker.ts` |
| Handler key | `buildReactiveHandlerKey(projection, eventType)` | `src/lib/sync/reactive-handler-key.ts` |
| Consumer | Pull batches por domain | `src/lib/sync/reactive-consumer.ts` |
| Worker runtime | Cloud Run `ops-worker` (shared staging/prod) | `services/ops-worker/server.ts` |
| Scheduling | 7 Cloud Scheduler jobs | `services/ops-worker/deploy.sh` |

### 1.3 Schedule actual

| Job | Cadencia | Domain |
|---|---|---|
| `ops-reactive-notifications` | `*/2 * * * *` | notifications (alta frecuencia) |
| `ops-reactive-organization` | `*/5 * * * *` | organization |
| `ops-reactive-finance` | `*/5 * * * *` | finance |
| `ops-reactive-delivery` | `*/5 * * * *` | delivery |
| `ops-reactive-people` | `2-59/5 * * * *` | people (offset +2min) |
| `ops-reactive-cost-intelligence` | `*/10 * * * *` | cost_intelligence |
| `ops-reactive-recover` | `*/15 * * * *` | recovery global (proyecciones stuck) |

### 1.4 Configuración de Cloud Run

- `min_instances=0` (scale-to-zero entre batches)
- `max_instances=5`
- `concurrency=4` (batches concurrentes por instancia)
- `cpu=2`, `memory=2Gi`
- `timeout=540s`
- `REACTIVE_BATCH_SIZE=500`

### 1.5 Capacidad teórica

```
500 eventos/batch × 4 concurrencia × 5 instancias = 10,000 eventos concurrentes máx
× 12 batches/hora (*/5)                           = 120,000 eventos/hora máx por domain
× 6 domains activos                                ≈ 720,000 eventos/hora teórico máx
```

En la práctica el techo real está ~30-40% de eso por cold starts, lock contention y overhead de boot de reactive handlers.

---

## 2. Problemas estructurales del modelo actual

### 2.1 Latencia compuesta en chains reactivos

Un evento puede disparar otros eventos. Ejemplo real observado hoy (2026-04-15) en el flujo de reliquidación payroll:

```
t=0:00  → Usuario recalcula entry payroll reliquidada
t=0:00  → Trigger supersede v1→v2, insert outbox(payroll.entry.superseded)
t=0:05  → ops-reactive-finance despierta, procesa supersede
          → insert outbox(finance.expense.payroll_delta_applied)
t=0:10  → ops-reactive-finance despierta otra vez, procesa delta
          → insert outbox(notifications.payroll_export_ready)
t=0:12  → ops-reactive-notifications despierta, dispara email
          → email enviado al usuario
Latencia total end-to-end: ~12 minutos
```

**Con push model (objetivo):** los 3 hops ocurren en <5 segundos.

### 2.2 Ausencia de backpressure

Si la tasa de arrivals supera la tasa de procesamiento:

- La cola crece sin límite
- No hay señal automática al productor (Vercel) para frenar
- No hay alerting automático sobre "backlog creciendo"
- Recovery requiere intervención manual (aumentar `max_instances` o `REACTIVE_BATCH_SIZE`)

El único safety net actual es `ops-reactive-recover` cada 15 min, que asume que los handlers *terminarán* eventualmente — no maneja el caso de saturación sostenida.

### 2.3 Cold start tax

Con `min_instances=0`:

```
6 domains × 12 wake-ups/hora = 72 cold starts/hora
× ~1.5s boot promedio         = 108 segundos/hora de overhead
```

Para batches de 10-20 eventos (típico en horas de bajo tráfico), el cold start es mayor que el trabajo real. En horas pico el overhead se amortiza, pero el escalado sigue siendo reactivo-a-reloj en lugar de reactivo-a-carga.

### 2.4 Ordering best-effort

`SELECT ... FOR UPDATE SKIP LOCKED` permite que dos instancias concurrentes tomen eventos del mismo `aggregate_id`. Si una instancia toma `entry.superseded` y otra toma `entry.created` del mismo payroll period, el orden de procesamiento depende de quién termina primero — no es determinista.

**Caso que puede romper (aún no observado en prod):**

```
Thread A: toma entry.created (v2), procesa primero
Thread B: toma entry.superseded (v1), procesa después
          → downstream ve v2 antes que v1 marque v1 como superseded
          → estado intermedio: dos active entries por (period_id, member_id)
          → viola partial unique index → rollback → reprocesa → loop
```

Hoy no pasa porque el volumen es bajo y la idempotencia atrapa la mayoría, pero es un sharp edge latente.

### 2.5 Observabilidad opaca

- Métricas actuales: `source_sync_runs` con `source_system='reactive_worker'`, visible en Admin > Ops Health
- Granularidad: por batch, no por evento
- No hay tracing per-event ni correlación entre producer → consumer
- Debugging requiere buscar en logs de Cloud Run y cruzar con `outbox_events` manualmente

---

## 3. Modelo alternativo — Pub/Sub push

### 3.1 Topología propuesta

```
Vercel Next.js (runtime)                Cloud SQL (Postgres)
        │                                       │
        │  INSERT evento + trigger publish      │
        └──────────────────────────────────────▶│
                                                │
                              greenhouse_sync.outbox_events
                              greenhouse_sync.outbox_publisher_state
                                                │
                                                │
                                  outbox publisher
                                 (Cloud Run service
                                  o cron alta frecuencia)
                                                │
                                                ▼
                              ┌─────────────────────────────┐
                              │ Pub/Sub Topics              │
                              │  greenhouse.reactive.       │
                              │  {organization,finance,     │
                              │   people,delivery,          │
                              │   cost_intelligence,        │
                              │   notifications}            │
                              │ ordering_key = aggregate_id │
                              └─────────────────────────────┘
                                                │
                                                │ push (OIDC auth)
                                                ▼
                                       ops-worker Cloud Run
                                       POST /reactive/push
                                                │
                                                ▼
                                      reactive handler pipeline
                                      (idempotente con
                                       outbox_reactive_log)
                                                │
                            ack ───────────────────────── nack
                                                          │
                                                          ▼
                                              Dead Letter Topic
                                              + alerting
```

### 3.2 Componentes nuevos

| Componente | Responsabilidad |
|---|---|
| `outbox_publisher_state` (tabla) | Tracking de `last_published_event_id` para garantizar publicación exactamente-una-vez desde outbox a Pub/Sub |
| Outbox publisher (servicio) | Lee outbox pendiente, publica a Pub/Sub con `ordering_key = aggregate_id`, marca como publicado |
| Pub/Sub topics por domain | Un topic por domain para permitir cutover gradual y aislamiento de fallas |
| Push subscriptions | Una por domain, apuntando a `/reactive/push` con OIDC auth |
| Dead Letter Topics | Por domain, con alerting automático cuando `oldest_unacked_message_age > threshold` |
| Endpoint `/reactive/push` | Valida OIDC token de Pub/Sub, deserializa, invoca handler, responde ack/nack |

### 3.3 Características clave

| Aspecto | Scheduler-poll | Pub/Sub push |
|---|---|---|
| Latencia p50 | 2-3 min | <1s |
| Latencia p99 | 5-10 min | <5s |
| Throughput máx | ~30-40k/hora efectivo | Limitado solo por `max_instances` Cloud Run |
| Ordering | Best-effort | FIFO por `aggregate_id` |
| Backpressure | Ninguno | Pub/Sub flow control + DLQ |
| Cold starts | 72/hora | 0 en steady state (auto-scale por carga) |
| Costo idle | ~$0 | ~$0 (Pub/Sub subscription sin tráfico es gratis) |
| Costo burst | Lineal con instancias | Más eficiente (sin wake-up waste) |
| Observability | Batches opacos | Per-message tracing nativo |
| Retry | Manual en `ops-reactive-recover` | Exponencial nativo |
| DLQ | Ninguno | Nativo |

### 3.4 Idempotencia — sin cambios

La lógica actual es robusta y no necesita rehacerse:

- `outbox_reactive_log` con `ON CONFLICT DO NOTHING` sigue siendo el guardián
- Pub/Sub entrega **at-least-once**, no exactly-once
- El handler debe aceptar duplicados sin efectos secundarios (ya lo hace)

### 3.5 Plan de cutover gradual (cuando se decida ejecutar)

1. **Slice 1:** Publisher foundation — publica a Pub/Sub sin consumidor. Verifica mensajes en console.
2. **Slice 2:** Endpoint push en ops-worker — deploya sin subscription creada.
3. **Slice 3:** Cutover de domain `organization` (bajo impacto) — crear subscription, desactivar scheduler, observar 48h.
4. **Slice 4:** Rollout secuencial a domains restantes con ventana de observación entre cada uno.
5. **Slice 5:** Cleanup — eliminar schedulers reemplazados, mantener `recover` como safety net, documentar nuevo playbook.

**Rollback en cualquier slice:** reactivar scheduler, eliminar subscription. El outbox y los handlers no cambian — solo cambia el transport.

---

## 4. Señales que indican que es momento de ejecutar esta migración

Esta tabla define los triggers objetivos para abrir una task formal y ejecutar la migración. Mientras ninguno se cruce, el modelo actual es suficiente.

| Métrica | Umbral | Fuente | Acción |
|---|---|---|---|
| `queue_depth` por domain | >500 sostenido >15 min | `ops-worker /reactive/queue-depth` | Abrir task |
| `oldest_event_age_seconds` | >600 recurrente | Mismo endpoint | Abrir task |
| Chains reactivos end-to-end | >10 min p95 | Medición ad-hoc | Abrir task |
| Cold start count | >100/hora | Cloud Run metrics | Considerar `min_instances=1` antes de migrar |
| Costo mensual ops-worker | >umbral operativo (TBD) | Billing | Evaluar costo-beneficio |
| Incidentes por ordering | ≥1 confirmado | Bug report | Abrir task urgente |
| Volumen de eventos/día | ×5 sobre baseline actual | `outbox_events` count | Preparar task |

---

## 5. Mitigaciones intermedias (sin migrar)

Mientras ninguno de los triggers de §4 se cruce, hay hardening barato que se puede aplicar al modelo actual para extender su vida útil:

### 5.1 `min_instances=1` en horas pico

- **Costo:** ~$15/mes adicional
- **Beneficio:** Elimina 72 cold starts/hora, reduce latencia p95 en batches pequeños
- **Cómo:** Editar `services/ops-worker/deploy.sh` para `MIN_INSTANCES=1`
- **Cuándo:** Si cold starts empiezan a aparecer como porcentaje significativo del costo

### 5.2 Cadencia de schedulers más agresiva en domains críticos

- Bajar `ops-reactive-notifications` de `*/2` a `*/1`
- Bajar `ops-reactive-finance` de `*/5` a `*/2`
- **Costo:** ~2x ejecuciones (Cloud Scheduler es virtualmente gratis)
- **Beneficio:** Reduce latencia p50 a la mitad
- **Tradeoff:** Más contention en `refresh_queue`, más cold starts

### 5.3 Alerting sobre `queue_depth`

- Crear Cloud Monitoring alert policy: `queue_depth > 500 for 15m` → notificación
- **Costo:** cero
- **Beneficio:** Detecta saturación antes que el usuario
- **Archivo:** agregar a `scripts/setup-reactive-alerting.sh` (a crear)

### 5.4 Batch size adaptativo

- Hoy `REACTIVE_BATCH_SIZE=500` es fijo
- Podría variar por domain: notifications=100 (latencia), cost_intelligence=2000 (throughput)
- **Beneficio:** Mejor utilización de cada batch según perfil

### 5.5 Separar ops-worker staging/prod

- Hoy es un solo servicio compartido
- Separar permite deploy safety y rollback independiente
- **Costo:** Duplicar Cloud Run + Cloud Scheduler jobs
- **Beneficio:** Aislamiento real de blast radius entre environments
- **Cuándo:** Antes de abrir la migración push, para facilitar el rollout gradual

---

## 6. Decisiones diferidas

Estas son decisiones que **no se han tomado** y que deben resolverse antes de ejecutar la migración:

1. **¿Outbox publisher como servicio Cloud Run separado o como cron dentro de ops-worker?** Tradeoff: aislamiento de fallos vs overhead operativo.
2. **¿Un topic por domain o un topic único con attribute filtering?** Tradeoff: aislamiento de cutover vs simplicidad.
3. **¿Ordering strict por `aggregate_id` o best-effort?** Pub/Sub ordering tiene penalidad de throughput — puede que best-effort + idempotencia robusta sea suficiente.
4. **¿Mantener `ops-reactive-recover` como safety net o reemplazarlo con un reconciliador separado?**
5. **¿Observabilidad via Cloud Trace o instrumentación custom en outbox_reactive_log?**
6. **¿Separar ops-worker staging/prod antes, durante, o después de la migración?**

---

## 7. Alternativas consideradas y descartadas

### 7.1 Kafka (Managed Service for Apache Kafka)
- **Por qué se consideró:** Ordering estricto, replay histórico, throughput masivo.
- **Por qué se descarta:** Overhead operativo excesivo para el volumen actual y proyectado a 2 años. Pub/Sub cubre 100% de los casos de uso de Greenhouse.

### 7.2 Debezium / logical decoding
- **Por qué se consideró:** CDC desde Postgres directamente a Pub/Sub, sin outbox publisher.
- **Por qué se descarta:** Acoplamiento fuerte con schema de Postgres, complejidad de operación, y no resuelve el problema del double-write (outbox sigue siendo necesario para garantizar la emisión transaccional).

### 7.3 Cloud Tasks
- **Por qué se consideró:** Cola de tareas per-evento con retry nativo.
- **Por qué se descarta:** No tiene ordering keys ni fan-out. Pub/Sub es mejor fit para "evento publicado, N consumidores potenciales".

### 7.4 Mantener scheduler-poll y escalar horizontalmente
- **Por qué se consideró:** Cero cambios arquitectónicos.
- **Por qué se descarta:** Solo resuelve throughput, no latencia ni ordering. El techo de latencia es inherente al modelo poll — subir `max_instances` de 5 a 50 no cambia que el batch se dispara cada 5 min.

---

## 8. Referencias externas

- [Pub/Sub push subscriptions docs](https://cloud.google.com/pubsub/docs/push)
- [Pub/Sub ordering keys](https://cloud.google.com/pubsub/docs/ordering)
- [Transactional Outbox Pattern](https://microservices.io/patterns/data/transactional-outbox.html)
- [Cloud Run push authentication](https://cloud.google.com/run/docs/authenticating/service-to-service)

---

## 9. Historial de revisiones

| Versión | Fecha | Autor | Cambios |
|---|---|---|---|
| 1.0 | 2026-04-15 | Julio Reyes + Claude | Creación inicial tras revisión del estado del ops-worker y discusión de techo de escalabilidad. Estado: evaluación abierta, sin commitment de ejecución. |
