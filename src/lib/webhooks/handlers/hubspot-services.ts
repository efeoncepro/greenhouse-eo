import { createHmac, timingSafeEqual } from 'node:crypto'

import { batchReadServices } from '@/lib/hubspot/list-services-for-company'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { upsertServiceFromHubSpot, type UpsertServiceSpace } from '@/lib/services/upsert-service-from-hubspot'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { registerInboundHandler } from '@/lib/webhooks/inbound'
import { resolveSecret } from '@/lib/webhooks/signing'

/**
 * TASK-813a — Canonical prefix for organization_unresolved errors.
 * El reliability signal `commercial.service_engagement.organization_unresolved`
 * detecta vía LIKE `'organization_unresolved:%'` en webhook_inbox_events.error_message.
 * Cambiar el prefix sin actualizar el reader rompe el signal silenciosamente.
 */
export const ORG_UNRESOLVED_ERROR_PREFIX = 'organization_unresolved:' as const

/**
 * HubSpot p_services (object 0-162) webhook handler — TASK-813 Slice 4.
 *
 * Suscripción HubSpot Developer Portal:
 *   - p_services.creation
 *   - p_services.propertyChange (hs_name, ef_organization_id, ef_space_id,
 *     ef_linea_de_servicio, ef_servicio_especifico, ef_total_cost,
 *     ef_amount_paid, ef_start_date, ef_target_end_date)
 *
 * Target URL: https://greenhouse.efeoncepro.com/api/webhooks/hubspot-services
 *
 * Validación: HubSpot v3 signature (HMAC-SHA256 of method+uri+body+timestamp).
 *
 * Comportamiento:
 *   1. Valida firma (rechaza requests sin firma válida).
 *   2. Parsea events HubSpot.
 *   3. Extrae service IDs únicos.
 *   4. Para cada service ID:
 *      a. Resuelve hubspot_company_id via batch read del service object.
 *      b. Resuelve space en Greenhouse via clients.hubspot_company_id.
 *      c. UPSERT en greenhouse_core.services con hubspot_sync_status según
 *         disponibilidad de ef_linea_de_servicio.
 *      d. Outbox event commercial.service_engagement.materialized v1.
 *   5. Si organization_unresolved → throw con prefix audit-friendly para que
 *      el reliability signal `commercial.service_engagement.organization_unresolved`
 *      lo cuente vía error_message LIKE.
 *   6. Sentry: captureWithDomain('integrations.hubspot') por failure individual.
 */

const SIGNATURE_HEADER = 'x-hubspot-signature-v3'
const TIMESTAMP_HEADER = 'x-hubspot-request-timestamp'
const MAX_TIMESTAMP_AGE_MS = 5 * 60 * 1000

interface HubSpotEvent {
  subscriptionType: string
  objectId: number | string
  occurredAt?: number
  eventId?: string | number
  associatedObjectId?: number | string
  propertyName?: string
  propertyValue?: string
  /** TASK-836 follow-up: Developer Platform 2025.2 envía objectTypeId separado
   *  cuando subscriptionType es `object.*` genérico. */
  objectTypeId?: string
  objectType?: string
}

/**
 * TASK-836 follow-up — clasificador dual-format alineado con hubspot-companies.ts.
 * Soporta ambos shapes:
 *   - Legacy: subscriptionType = `service.creation`, `p_services.*`, `0-162.*`
 *   - Developer Platform 2025.2: subscriptionType = `object.creation`/`object.propertyChange`
 *     + objectTypeId = `0-162` o objectType = `service`/`p_services`
 *
 * Pre-fix (Build #24+ deployed 2026-05-06): el handler filtraba solo legacy y
 * silently dropeaba todos los `object.*` events. Causa raíz Berel.
 */
const isHubSpotServiceEvent = (event: HubSpotEvent): boolean => {
  const subscriptionType = String(event.subscriptionType || '')
  const objectTypeId = String(event.objectTypeId || '')
  const objectType = String(event.objectType || '')

  if (
    subscriptionType.startsWith('service.')
    || subscriptionType.startsWith('p_services.')
    || subscriptionType.startsWith('0-162.')
  ) {
    return true
  }

  if (subscriptionType.startsWith('object.')) {
    return objectTypeId === '0-162' || objectType === 'service' || objectType === 'p_services'
  }

  return false
}

interface SpaceLookup extends Record<string, unknown> {
  space_id: string
  client_id: string
  organization_id: string | null
}

const validateHubSpotSignature = async (
  rawBody: string,
  signature: string,
  timestamp: string,
  secret: string,
  uri: string,
  method: string
): Promise<boolean> => {
  if (!signature || !timestamp) return false

  const tsMs = Number(timestamp)

  if (!Number.isFinite(tsMs)) return false

  const ageMs = Math.abs(Date.now() - tsMs)

  if (ageMs > MAX_TIMESTAMP_AGE_MS) return false

  const message = `${method}${uri}${rawBody}${timestamp}`
  const expected = createHmac('sha256', secret).update(message).digest('base64')

  const expectedBuf = Buffer.from(expected, 'utf8')
  const receivedBuf = Buffer.from(signature, 'utf8')

  if (expectedBuf.length !== receivedBuf.length) return false

  return timingSafeEqual(expectedBuf, receivedBuf)
}

const extractServiceIdsFromEvents = (events: HubSpotEvent[]): string[] => {
  const ids = new Set<string>()

  for (const event of events) {
    if (!isHubSpotServiceEvent(event)) continue

    const objectId = event.objectId ? String(event.objectId) : ''

    if (objectId) ids.add(objectId)
  }

  return Array.from(ids)
}

const SPACE_BY_HS_COMPANY_SQL = `
  SELECT s.space_id, s.client_id, s.organization_id
  FROM greenhouse_core.spaces s
  JOIN greenhouse_core.clients c ON c.client_id = s.client_id
  WHERE c.hubspot_company_id = $1
  LIMIT 1
`

const upsertServiceForWebhook = async (
  serviceId: string,
  hubspotCompanyId: string,
  props: Record<string, string | undefined>,
  space: SpaceLookup
): Promise<void> => {
  await upsertServiceFromHubSpot({
    hubspotServiceId: serviceId,
    hubspotCompanyId,
    space: space as UpsertServiceSpace,
    properties: props,
    source: 'hubspot-services-webhook'
  })
}

const resolveCompanyForService = async (serviceId: string): Promise<string | null> => {
  // HubSpot p_services → company association via /crm/v4. Llamamos endpoint directo.
  const TOKEN_ENV = 'HUBSPOT_ACCESS_TOKEN'
  const TOKEN_GCP = 'gcp:hubspot-access-token'

  const envValue = process.env[TOKEN_ENV]?.trim()
  const token = envValue || (await resolveSecret(TOKEN_GCP))

  if (!token) {
    throw new Error('HubSpot access token not configured (env HUBSPOT_ACCESS_TOKEN ni gcp:hubspot-access-token)')
  }

  const url = `https://api.hubapi.com/crm/v4/objects/0-162/${serviceId}/associations/companies?limit=1`

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000)
  })

  if (response.status === 404) return null

  if (!response.ok) {
    const text = await response.text()

    throw new Error(`HubSpot association lookup failed: ${response.status} ${text.slice(0, 200)}`)
  }

  const json = (await response.json()) as { results: Array<{ toObjectId: string | number }> }
  const first = json.results[0]

  return first ? String(first.toObjectId) : null
}

/**
 * TASK-813b — Async intake. Emite el outbox event que la projection
 * `hubspot_services_intake` consume vía ops-reactive-finance cron. Webhook
 * retorna < 100ms sin esperar HubSpot fetch. Patrón canónico TASK-771/773.
 *
 * Source: identifica el origen para audit (hubspot-services-webhook,
 * hubspot-companies-webhook-delegation, etc.).
 */
export const enqueueHubSpotServiceEventsAsync = async (
  events: HubSpotEvent[],
  source: string
): Promise<{ enqueued: number }> => {
  const serviceIds = extractServiceIdsFromEvents(events)

  if (serviceIds.length === 0) {
    return { enqueued: 0 }
  }

  // Aggregate id es el primer service id (audit-friendly per batch). El payload
  // contiene la lista completa para que la projection refresh procese todos.
  await publishOutboxEvent({
    aggregateType: 'hubspot_services_batch',
    aggregateId: serviceIds[0],
    eventType: 'commercial.service_engagement.intake_requested',
    payload: {
      version: 1,
      serviceIds,
      source,
      enqueuedAt: new Date().toISOString()
    }
  })

  return { enqueued: serviceIds.length }
}

/**
 * TASK-813 Slice 4 (legacy sync path) — Procesa events p_services
 * sincrono. Mantenido para tests + fallback ops manual. El path canónico
 * en producción es `enqueueHubSpotServiceEventsAsync` (async via outbox).
 */
export const processHubSpotServiceEvents = async (events: HubSpotEvent[]): Promise<void> => {
  const serviceIds = extractServiceIdsFromEvents(events)

  if (serviceIds.length === 0) return

  // Batch read service properties.
  let serviceObjects: Awaited<ReturnType<typeof batchReadServices>>

  try {
    serviceObjects = await batchReadServices(serviceIds)
  } catch (err) {
    captureWithDomain(err, 'integrations.hubspot', {
      level: 'error',
      tags: { source: 'hubspot-services-webhook', step: 'batch-read' },
      extra: { serviceCount: serviceIds.length }
    })
    throw err
  }

  const failures: string[] = []

  for (const svc of serviceObjects) {
    try {
      const hubspotCompanyId = await resolveCompanyForService(svc.id)

      if (!hubspotCompanyId) {
        // Service sin company association — skip pero registra en Sentry.
        // Marca la fila inbox con error_message reconocible para reliability signal.
        captureWithDomain(new Error(`organization_unresolved:${svc.id}`), 'integrations.hubspot', {
          level: 'warning',
          tags: { source: 'hubspot-services-webhook', reason: 'no_company_association' },
          extra: { hubspotServiceId: svc.id }
        })
        failures.push(`organization_unresolved:${svc.id}`)
        continue
      }

      const spaceRows = await runGreenhousePostgresQuery<SpaceLookup>(
        SPACE_BY_HS_COMPANY_SQL,
        [hubspotCompanyId]
      )

      if (spaceRows.length === 0) {
        // Client/space no existe en Greenhouse — operador resuelve via UI.
        captureWithDomain(
          new Error(`organization_unresolved:${svc.id}:${hubspotCompanyId}`),
          'integrations.hubspot',
          {
            level: 'warning',
            tags: { source: 'hubspot-services-webhook', reason: 'no_greenhouse_space' },
            extra: { hubspotServiceId: svc.id, hubspotCompanyId }
          }
        )
        failures.push(`organization_unresolved:${svc.id}:${hubspotCompanyId}`)
        continue
      }

      await upsertServiceForWebhook(svc.id, hubspotCompanyId, svc.properties, spaceRows[0])
    } catch (err) {
      captureWithDomain(err, 'integrations.hubspot', {
        level: 'error',
        tags: { source: 'hubspot-services-webhook' },
        extra: { hubspotServiceId: svc.id }
      })
      failures.push(`${svc.id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // If ALL services failed, throw to escalate. If only some failed, log but
  // mark inbox as processed (partial success).
  //
  // Cuando TODOS los failures son organization_unresolved, el throw lleva
  // prefix audit-friendly para que el reliability signal
  // commercial.service_engagement.organization_unresolved los cuente vía
  // webhook_inbox_events.error_message LIKE 'organization_unresolved:%'.
  if (failures.length === serviceObjects.length && failures.length > 0) {
    const allUnresolved = failures.every(f => f.startsWith('organization_unresolved:'))

    if (allUnresolved) {
      throw new Error(`organization_unresolved:${failures.slice(0, 3).join('; ')}`)
    }

    throw new Error(`All ${failures.length} service syncs failed: ${failures.slice(0, 3).join('; ')}`)
  }
}

/**
 * Endpoint registrado: recibe webhooks dirigidos a `hubspot-services`
 * directamente (legacy/standalone path). El target real configurado en
 * HubSpot Developer Platform es `hubspot-companies` (constraint: 1 webhook
 * por app), pero este endpoint queda como entry point alternativo para
 * tests o configuraciones futuras.
 */
registerInboundHandler('hubspot-services', async (inboxEvent, rawBody, parsedPayload) => {
  const headers = inboxEvent.headers_json as Record<string, string>
  const signature = headers[SIGNATURE_HEADER] ?? ''
  const timestamp = headers[TIMESTAMP_HEADER] ?? ''

  const requestUri = headers['x-forwarded-uri']
    ?? headers['x-original-url']
    ?? 'https://greenhouse.efeoncepro.com/api/webhooks/hubspot-services'

  const secret = await resolveSecret('HUBSPOT_APP_CLIENT_SECRET')

  if (!secret) {
    throw new Error('HUBSPOT_APP_CLIENT_SECRET not configured (cannot verify webhook signature)')
  }

  const valid = await validateHubSpotSignature(rawBody, signature, timestamp, secret, requestUri, 'POST')

  if (!valid) {
    throw new Error('HubSpot signature validation failed')
  }

  const events = Array.isArray(parsedPayload) ? (parsedPayload as HubSpotEvent[]) : []

  if (events.length === 0) return

  // TASK-813b — Path canónico async: emite outbox event, retorna inmediato.
  await enqueueHubSpotServiceEventsAsync(events, 'hubspot-services-webhook-direct')
})
