import { createHmac, timingSafeEqual } from 'node:crypto'

import { DEMO_STATUS_PROPERTY_NAMES } from '@/lib/notion-metrics/notion-demo-client'
import { captureWithDomain } from '@/lib/observability/capture'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { resolveSecretByRef } from '@/lib/secrets/secret-manager'
import { registerInboundHandler } from '@/lib/webhooks/inbound'

/**
 * TASK-910 Slice 2 — Notion tasks-demo webhook handler.
 *
 * Recibe webhooks Notion del teamspace `Demo Greenhouse` (Notion ID
 * 36339c2f-efe7-814c-a0f5-0042863dbb5a). Endpoint canonical separado del
 * productivo `notion-tasks` (TASK-912 futuro) para defense in depth:
 *
 * 1. **HMAC secret separado**: `NOTION_DEMO_WEBHOOK_SIGNING_SECRET_REF`
 *    apunta a GCP Secret Manager `notion-webhook-signing-secret-demo`.
 *    Leak en un secret NO compromete el otro.
 *
 * 2. **Event payload marcado `metadata.demo_mode: true`**: reactive consumers
 *    canonical filtran por este flag para discriminar demo vs prod (Slice 3
 *    consumer demo persiste en tabla físicamente separada
 *    `task_status_transitions_demo`).
 *
 * 3. **Echo-loop filter canonical**: si `event.authors[*].id` matches el
 *    Notion integration user de Greenhouse, ACK + drop silenciosamente
 *    (evita procesar nuestros propios writebacks).
 *
 * 4. **Property allowlist filter**: solo procesa events que tocan el
 *    property name canonical de status (`Estado` cross-tenant V1).
 *
 * 5. **Inbox dedup**: `processInboundWebhook` canonical ya hace dedup por
 *    idempotencyKey (hash del sourceEventId o rawBody) en
 *    `greenhouse_sync.webhook_inbox_events`.
 *
 * **HMAC validation**: HMAC-SHA256 sobre raw body con secret resolved.
 * Notion webhook spec V1 envía signature en header `x-notion-signature`
 * con formato `sha256=<hex>`.
 *
 * **Cross-refs**:
 * - Spec: docs/tasks/in-progress/TASK-910-notion-demo-teamspace-migration-sandbox.md
 * - Pattern fuente: src/lib/webhooks/handlers/hubspot-companies.ts (TASK-706)
 * - Migration Slice 0: webhook_endpoints row `notion-tasks-demo` shipped
 * - Status canonical helper: src/lib/delivery/task-status-canonical.ts
 * - Event canonical: EVENT_TYPES.notionTaskStatusTransitioned
 */

const SIGNATURE_HEADER = 'x-notion-signature'

/**
 * Detecta el verification handshake de Notion. Al crear/verificar una
 * suscripción webhook, Notion envía `{ verification_token: 'secret_...' }`
 * sin array `events` ni firma HMAC válida. El token ES el futuro signing
 * secret. Returns el token si es un verification request, null si no.
 *
 * Exported para tests anti-regresión.
 */
export const extractVerificationToken = (parsedPayload: unknown): string | null => {
  if (!parsedPayload || typeof parsedPayload !== 'object') {
    return null
  }

  const token = (parsedPayload as { verification_token?: unknown }).verification_token

  return typeof token === 'string' && token.length > 0 ? token : null
}

/**
 * Notion canonical status property names — single source of truth en el demo
 * client (`DEMO_STATUS_PROPERTY_NAMES`). Re-export local para tests.
 */
const STATUS_PROPERTY_NAMES = DEMO_STATUS_PROPERTY_NAMES

interface NotionWebhookEvent {
  readonly id?: string
  readonly type?: string
  readonly entity?: {
    readonly id?: string
    readonly type?: string
  }
  readonly data?: {
    // updated_properties son IDs de propiedad (no nombres). Notion NO incluye
    // valores previous/current en el webhook — por eso el consumer re-fetchea.
    readonly updated_properties?: readonly string[]
    readonly parent?: { readonly id?: string; readonly type?: string }
  }
  readonly authors?: ReadonlyArray<{ readonly id?: string; readonly type?: string }>
  readonly timestamp?: string
}

/**
 * Validates Notion webhook HMAC signature. Notion canonical spec V1:
 * - Header `x-notion-signature` con formato `sha256=<hex>`
 * - Body raw bytes (NO parsed JSON)
 * - HMAC-SHA256(rawBody, secret)
 * - Timing-safe compare canonical
 */
const validateNotionSignature = (
  rawBody: string,
  signature: string,
  secret: string
): boolean => {
  if (!signature || !secret) {
    return false
  }

  const prefix = 'sha256='
  const providedHex = signature.startsWith(prefix) ? signature.slice(prefix.length) : signature

  const computedHex = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')

  const expectedBuf = Buffer.from(computedHex, 'utf8')
  const receivedBuf = Buffer.from(providedHex, 'utf8')

  if (expectedBuf.length !== receivedBuf.length) {
    return false
  }

  try {
    return timingSafeEqual(expectedBuf, receivedBuf)
  } catch {
    return false
  }
}

interface DemoStatusChangeSignal {
  taskSourceId: string
  changedPropertyIds: readonly string[]
  sourceEventId: string
  occurredAt: string
}

/**
 * TASK-914 — Normaliza el envelope del webhook a un array de eventos. Notion
 * 2026-03-11 entrega un objeto evento único (`{ id, type, entity, data }`), pero
 * versiones/configs pueden mandar `{ events: [...] }`. Soporta ambos. Exported
 * para tests anti-regresión.
 */
const normalizeWebhookEvents = (parsedPayload: unknown): readonly NotionWebhookEvent[] => {
  if (!parsedPayload || typeof parsedPayload !== 'object') {
    return []
  }

  const obj = parsedPayload as { events?: unknown; type?: unknown; entity?: unknown }

  if (Array.isArray(obj.events)) {
    return obj.events as NotionWebhookEvent[]
  }

  // Evento single canonical Notion: tiene `type` + `entity`.
  if (typeof obj.type === 'string' && obj.entity && typeof obj.entity === 'object') {
    return [parsedPayload as NotionWebhookEvent]
  }

  return []
}

/**
 * TASK-914 — Extrae TRIGGERS de cambio de propiedad desde los webhook events.
 * NO deriva from/to del payload: los webhooks Notion 2026 NO incluyen valores
 * (solo IDs de propiedad en `updated_properties`). El consumer reactivo
 * re-fetchea la página para resolver el estado real (re-fetch pattern canonical
 * — notion-platform Pillar 1).
 *
 * **Por qué NO filtramos por status property ID acá**: el ID del status
 * property en el schema del data source es namespaced (`notion://tasks/
 * status_property`) y NO matchea el ID corto que Notion manda en el webhook
 * `updated_properties`. Un gate por ID dropearía TODO status change real (bug
 * detectado en smoke E2E 2026-05-20). El filtro autoritativo e idempotente es
 * el consumer: re-fetchea el estado actual y compara contra la última
 * transición — si no cambió, no-op. Forward de cualquier cambio de propiedad
 * es robusto (nunca pierde un status change) a costo de re-fetches en cambios
 * non-status (negligible en demo low-volume; productivo TASK-901 puede agregar
 * un filtro confiable cuando se entienda el formato de id del webhook).
 *
 * Filtros:
 * 1. page event con entity id.
 * 2. echo-loop: drop si el autor es nuestra integración.
 * 3. `updated_properties` no vacío (page.created sin props NO es un cambio).
 */
const extractDemoStatusChangeSignals = (
  events: readonly NotionWebhookEvent[],
  integrationUserId: string | null
): readonly DemoStatusChangeSignal[] => {
  const signals: DemoStatusChangeSignal[] = []

  for (const event of events) {
    // Filter 1: must be page event with entity id
    const taskSourceId = event.entity?.id ?? ''

    if (!taskSourceId || event.entity?.type !== 'page') {
      continue
    }

    // Filter 2: echo-loop — if event author is our integration user, drop
    if (integrationUserId && Array.isArray(event.authors)) {
      const fromIntegration = event.authors.some(author => author?.id === integrationUserId)

      if (fromIntegration) {
        continue
      }
    }

    // Filter 3: must have updated_properties (a property changed). page.created
    // sin updated_properties NO es un cambio relevante → skip.
    const updatedProps = event.data?.updated_properties ?? []

    if (updatedProps.length === 0) {
      continue
    }

    signals.push({
      taskSourceId,
      changedPropertyIds: updatedProps,
      sourceEventId: event.id ?? `${taskSourceId}-${event.timestamp ?? Date.now()}`,
      occurredAt: event.timestamp ?? new Date().toISOString()
    })
  }

  return signals
}

registerInboundHandler('notion-tasks-demo', async (inboxEvent, rawBody, parsedPayload) => {
  // 0. Notion webhook verification handshake (canonical, pre-HMAC).
  //
  // Al crear/verificar una suscripción, Notion envía un POST con
  // `{ verification_token: 'secret_...' }` — SIN array `events`, SIN firma HMAC
  // válida (el token ES el futuro signing secret, todavía no existe). Debemos
  // ACK (200) sin validar HMAC. El token queda persistido en
  // `webhook_inbox_events.payload_json` para que el operador lo recupere y lo
  // (a) pegue en el UI de Notion para activar la suscripción, (b) suba al GCP
  // secret `notion-webhook-signing-secret-demo` como signing secret canonical.
  //
  // NO logueamos el valor del token a Sentry (es un secret). Solo se persiste
  // en el inbox (PG), accesible vía query directa por el operador.
  if (extractVerificationToken(parsedPayload)) {
    // ACK 200. El inbox ya persistió el payload con el token. Skip HMAC + events.
    return
  }

  // 1. Validate HMAC signature canonical
  const headers = inboxEvent.headers_json as Record<string, string>
  const signature = headers[SIGNATURE_HEADER] ?? ''

  // El env var contiene el NOMBRE del secret GCP (forma bare `*_SECRET_REF`).
  // Resolvemos su VALOR con resolveSecretByRef (mismo patrón que el sibling
  // notion-demo-client.ts). NO usar el helper resolveSecret(envName) de
  // webhooks/signing: ese le append `_SECRET_REF` al argumento, así que pasarle
  // ya el nombre `_REF` cae al fallback envValue y usaría el nombre crudo del
  // secret como key HMAC (bug detectado en smoke E2E 2026-05-20).
  const secretRef = process.env.NOTION_DEMO_WEBHOOK_SIGNING_SECRET_REF?.trim()
  const secret = secretRef ? await resolveSecretByRef(secretRef) : null

  if (!secret) {
    // Secret NO configurado — webhook NO puede validar signature.
    // Throw para que inbox marque failed + Notion reintente. Operator-side
    // pendiente: crear secret en GCP Secret Manager + setear env var ref.
    throw new Error(
      'NOTION_DEMO_WEBHOOK_SIGNING_SECRET_REF not configured (cannot validate demo webhook signature)'
    )
  }

  const valid = validateNotionSignature(rawBody, signature, secret)

  if (!valid) {
    throw new Error('Notion demo webhook signature validation failed')
  }

  // 2. Normalizar el envelope. Notion 2026-03-11 entrega un OBJETO EVENTO ÚNICO
  //    (`{ id, type, entity, data, ... }`), NO envuelto en `{ events: [...] }`.
  //    Soportamos ambos formatos: si hay array `events` lo usamos; si el payload
  //    es un evento single (tiene `type` + `entity`), lo envolvemos. Bug real
  //    detectado en smoke E2E 2026-05-20: asumir `events[]` dropeaba TODO.
  const events = normalizeWebhookEvents(parsedPayload)

  if (events.length === 0) {
    // ACK empty payload — Notion sometimes sends keepalive
    return
  }

  // 3. Echo-loop filter (OPCIONAL en demo — ver nota).
  //
  // Cuando el writeback de Greenhouse hace PATCH de la propiedad `RpA`, Notion
  // dispara un webhook cuyo autor es nuestra integración. Sin filtro, ese echo
  // genera una señal → el consumer re-fetchea → el status NO cambió → no-op
  // idempotente (compare-to-last). Es decir: el echo es INOFENSIVO por diseño
  // (no hay loop, solo un re-fetch desperdiciado por writeback, negligible en
  // demo low-volume). Por eso el env var es opcional y hoy NO está seteado.
  //
  // Para activar el filtro (optimización), setear GREENHOUSE_NOTION_INTEGRATION_USER_ID
  // al author bot id de la integración demo. ⚠️ Productivo (TASK-912): NO reusar
  // este env var genérico — usar uno por-handler (e.g. el handler productivo lee
  // su propio integration user id) porque demo y productivo son integraciones
  // distintas con bot ids distintos.
  const integrationUserId = process.env.GREENHOUSE_NOTION_INTEGRATION_USER_ID ?? null

  // 4. Extract property-change TRIGGERS (re-fetch pattern: no from/to del
  //    payload; el consumer re-fetch + compare-to-last es el filtro autoritativo)
  const signals = extractDemoStatusChangeSignals(events, integrationUserId)

  if (signals.length === 0) {
    // No status-property changes — webhook ACK'd, nada que emitir
    return
  }

  // 6. Emit page_change_signal.demo per trigger. El consumer reactivo
  //    `notion-status-transition-capture-demo` re-fetchea la página y resuelve
  //    la transición real. metadata.demo_mode=true (defense in depth filter).
  for (const signal of signals) {
    try {
      await publishOutboxEvent({
        aggregateType: AGGREGATE_TYPES.notionTask,
        aggregateId: signal.taskSourceId,
        eventType: EVENT_TYPES.notionTaskPageChangeSignalDemo,
        payload: {
          schemaVersion: 1,
          taskSourceId: signal.taskSourceId,
          workspaceId: 'demo',
          changedPropertyIds: signal.changedPropertyIds,
          sourceEventId: signal.sourceEventId,
          occurredAt: signal.occurredAt,
          metadata: {
            demo_mode: true
          }
        }
      })
    } catch (err) {
      captureWithDomain(err, 'integrations.notion', {
        level: 'error',
        tags: {
          source: 'notion-tasks-demo-webhook',
          stage: 'outbox_emit'
        },
        extra: {
          taskSourceId: signal.taskSourceId
        }
      })

      throw err
    }
  }
})

// Export for tests
export const __testing__ = {
  extractDemoStatusChangeSignals,
  normalizeWebhookEvents,
  validateNotionSignature,
  extractVerificationToken,
  STATUS_PROPERTY_NAMES
}
