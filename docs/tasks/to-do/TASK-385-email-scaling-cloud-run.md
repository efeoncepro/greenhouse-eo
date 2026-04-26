# TASK-385 — Email Scaling Cloud Run

## Delta 2026-04-26 — sigue vigente, ortogonal al Notification Hub (TASK-690)

**No deprecada.** Esta task resuelve un problema de transport (timeout de Vercel serverless en broadcasts > 50 destinatarios), NO de routing. El Notification Hub se encarga del routing per-recipient + per-channel; el adapter `email` del Hub sigue llamando al transport actual hasta que la escala lo requiera.

**Scope ajustado:**

- El path Cloud Run que esta task entrega lo invoca el adapter `src/lib/notifications/hub/adapters/email.ts` cuando `recipients.length > 50`. Por debajo del threshold, el adapter sigue usando el path Vercel/Resend directo.
- La detección "es broadcast vs transactional" deja de ser implícita: el `notification_intent.recipient_kind = 'channel_static'` o un nuevo `recipient_kind = 'broadcast'` (a evaluar en TASK-693) marca la fila para el adapter scale-out. El adapter inspecciona el batch y rutea Cloud Run si supera el threshold.
- **NO bloqueada por el Hub**: pueden coexistir. Si esta task se ejecuta antes que TASK-692 (cutover del Hub), el Cloud Run worker queda accesible vía el helper `sendBroadcastEmail()` y el Hub lo invoca cuando llega.
- Cuando el Hub adquiera capacity de digest (TASK-387), broadcasts diarios de digest van por este mismo path Cloud Run.

## Orden de implementación recomendado

Esta task es **ortogonal al Hub** — puede ejecutarse en cualquier orden:

- Si se ejecuta **antes** que TASK-690: el helper `sendBroadcastEmail()` queda listo y el adapter `email` del Hub lo invocará cuando llegue.
- Si se ejecuta **después** que TASK-692 (cutover Hub): se integra directo en el adapter `src/lib/notifications/hub/adapters/email.ts` con la lógica de threshold `recipients.length > 50`.
- Si se ejecuta **junto a TASK-387** (digest): los digests email van directo por este path desde el día 1 del digest.

Recomendación: priorizar por urgencia operativa (timeout de 60s siendo o no problema actual), no por dependencia con el Hub.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `ops`
- Blocked by: `TASK-383`, `TASK-384`
- Branch: `task/TASK-385-email-scaling-cloud-run`
- Legacy ID: none
- GitHub Issue: none

## Summary

Los envíos broadcast a múltiples destinatarios corren hoy en Vercel serverless con un límite de 60 segundos. Para la escala actual (<100 empleados) el Batch API de Resend es suficiente. Cuando el volumen supere ~200 destinatarios por envío, o cuando el tiempo de preparación de templates + llamada a Resend supere el timeout, los envíos empezarán a fallar silenciosamente. Esta task mueve los envíos broadcast de >50 destinatarios al ops-worker de Cloud Run para eliminar el límite de tiempo.

**Esta task es diferida. No iniciar hasta que se cumpla al menos uno de estos triggers:**
- Un envío broadcast falla por timeout en Vercel
- La base de empleados supera 150 personas
- El tiempo promedio de envío broadcast supera 30 segundos en producción

## Why This Task Exists

`deliverBroadcastBatch()` en `delivery.ts` prepara todos los destinatarios en paralelo y luego hace una llamada a `resend.batch.send()`. Para 80 empleados esto es rápido. Para 500 (escala futura de Efeonce con múltiples clientes) la fase de preparación paralela (context resolution × N, template render × N) puede superar fácilmente los 60s de Vercel.

El ops-worker de Cloud Run ya existe, ya consume del outbox, y ya no tiene límite de tiempo de ejecución. El patrón de offload está establecido para otros módulos.

## Goal

- Envíos broadcast con >50 destinatarios se encolan en el outbox en lugar de ejecutarse inline en Vercel
- El ops-worker de Cloud Run consume el evento de outbox y ejecuta `deliverBroadcastBatch()`
- Envíos con ≤50 destinatarios siguen funcionando inline (sin cambio de comportamiento)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` — §4.9 y §5 sobre ops-worker
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — patrón de outbox event

Reglas obligatorias:

- El ops-worker consume eventos del outbox vía el patrón existente — no crear un segundo canal de comunicación
- La lógica de `deliverBroadcastBatch()` debe ser importable desde el contexto del ops-worker (sin dependencias de NextAuth o módulos exclusivos de Next.js)
- El umbral de 50 destinatarios debe ser configurable via env var (`EMAIL_INLINE_BATCH_THRESHOLD`)
- Si el evento de outbox falla en Cloud Run, debe quedar en estado reintentable — no perder el envío

## Normative Docs

- `services/ops-worker/` — estructura del ops-worker, Dockerfile, deploy script
- `src/lib/email/delivery.ts` — `deliverBroadcastBatch()` a extraer/compartir
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` — patrón de despliegue Cloud Run
- `CLAUDE.md` sección "Cloud Run ops-worker" — notas sobre ESM/CJS shims y esbuild

## Dependencies & Impact

### Depends on

- `TASK-383` (observabilidad) — necesario para detectar fallos en el worker antes de migrar tráfico
- `TASK-384` (compliance) — el worker debe respetar el priority bypass verificado en TASK-384
- `services/ops-worker/` — debe existir y estar deployado
- `greenhouse_notifications.email_deliveries` — el worker escribe en la misma tabla

### Blocks / Impacts

- Ninguna task bloqueada actualmente
- Modifica el flujo de `sendEmail()` para envíos broadcast grandes — cualquier agente que pruebe ese path necesita saber del cambio

### Files owned

- `src/lib/email/delivery.ts` — agregar lógica de routing (inline vs outbox)
- `services/ops-worker/src/handlers/email-batch.ts` — nuevo handler en el worker
- `src/lib/email/batch-runner.ts` — posible extracción de `deliverBroadcastBatch()` a módulo compartido
- `vercel.json` — sin cambios (el cron de retry existente maneja los fallbacks)

## Current Repo State

### Already exists

- `services/ops-worker/` — Cloud Run worker deployado con patrón de outbox consumer
- `deliverBroadcastBatch()` en `src/lib/email/delivery.ts` — lógica a reutilizar
- Patrón de outbox event en `GREENHOUSE_EVENT_CATALOG_V1.md`
- `resend.batch.send()` funciona correctamente para ≤50 destinatarios en Vercel

### Gap

- No existe routing de envíos grandes al outbox
- `deliverBroadcastBatch()` tiene dependencias implícitas de contexto Next.js que pueden requerir shims en el worker
- No existe handler de email batch en el ops-worker

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Extracción de lógica batch a módulo compartible

- Extraer la lógica core de `deliverBroadcastBatch()` a `src/lib/email/batch-runner.ts` sin dependencias de Next.js
- El módulo debe funcionar tanto en Vercel (Next.js) como en Node.js standalone (ops-worker)
- Verificar con `esbuild --bundle` que el módulo bundlea sin errores en el contexto del worker

### Slice 2 — Routing en sendEmail()

- En `sendEmail()`: si `priority === 'broadcast'` y `recipients.length > EMAIL_INLINE_BATCH_THRESHOLD` (default: 50) → insertar outbox event `email.broadcast_batch_enqueued` con el payload completo
- Si ≤ umbral → comportamiento actual sin cambios
- El outbox event debe incluir todos los datos necesarios para que el worker reconstruya el envío: `recipients`, `context`, `emailType`, `domain`, `sourceEventId`, `actorEmail`

### Slice 3 — Handler en ops-worker

- Crear `services/ops-worker/src/handlers/email-batch.ts` que consuma eventos `email.broadcast_batch_enqueued`
- Importar `deliverBroadcastBatch()` desde el módulo compartido del Slice 1
- Registrar el handler en el consumer del outbox del worker
- Deploy y smoke test con un envío de prueba de >50 destinatarios simulados

## Out of Scope

- Modificar el Batch API de Resend (ya funciona correctamente)
- Envíos con adjuntos — estos ya van por el path secuencial y se mantienen así
- UI para monitorear el estado de envíos encolados
- Observabilidad del worker (cubierta en TASK-383 a nivel de delivery rows)

## Detailed Spec

### Routing logic

```typescript
const INLINE_BATCH_THRESHOLD = parseInt(process.env.EMAIL_INLINE_BATCH_THRESHOLD ?? '50', 10)

const useBatch = priority === 'broadcast' && recipients.length > 1 && !input.attachments?.length && isResendConfigured()
const useWorker = useBatch && recipients.length > INLINE_BATCH_THRESHOLD

if (useWorker) {
  // Enqueue to outbox — return immediately with status='pending'
  const batchDeliveryId = await enqueueBroadcastBatch({ ... })
  return { deliveryId: batchDeliveryId, resendId: null, status: 'pending' }
} else if (useBatch) {
  recipientResults = await deliverBroadcastBatch({ ... })
} else {
  // sequential path
}
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `sendEmail()` con 51+ destinatarios broadcast retorna `status='pending'` y un outbox event existe en DB
- [ ] `sendEmail()` con 49 destinatarios broadcast ejecuta el Batch API inline sin cambios
- [ ] El ops-worker consume el outbox event y registra las filas de delivery correctamente
- [ ] El módulo `batch-runner.ts` bundlea sin errores con esbuild en el contexto del worker
- [ ] `pnpm lint` y `pnpm tsc --noEmit` pasan sin errores
- [ ] `pnpm test` pasa

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- Smoke test manual: enviar broadcast de 60 destinatarios simulados en staging y verificar que el worker procesa el outbox event y las filas quedan en `status='sent'`
- Verificar que deploy del worker (`bash services/ops-worker/deploy.sh`) completa sin errores

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado
- [ ] `changelog.md` quedo actualizado
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] El worker deployado en Cloud Run fue verificado con un envío real en staging
- [ ] La variable `EMAIL_INLINE_BATCH_THRESHOLD` está documentada

## Follow-ups

- Monitoreo de latencia del worker via Cloud Run metrics
- Evaluar si el worker necesita concurrencia de instancias para procesar múltiples batch jobs simultáneos

## Open Questions

- ¿El payload del outbox event para un batch de 200 destinatarios puede ser muy grande para la columna JSONB? Verificar límite de tamaño y si conviene referenciar por IDs en lugar de serializar el contexto completo.
- ¿El worker debe deduplicar el evento si se procesa dos veces (por retry del outbox consumer)? El patrón de `sourceEventId` en el pipeline de delivery ya maneja esto — confirmar que aplica en el contexto del worker.
