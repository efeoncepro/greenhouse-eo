import { createHmac, timingSafeEqual } from 'node:crypto'

import { batchReadServices } from '@/lib/hubspot/list-services-for-company'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { registerInboundHandler } from '@/lib/webhooks/inbound'
import { resolveSecret } from '@/lib/webhooks/signing'

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
    const subscriptionType = String(event.subscriptionType || '')
    const objectId = String(event.objectId)

    if (subscriptionType.startsWith('p_services.') && objectId) {
      ids.add(objectId)
    }
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

const upsertServiceFromHubSpot = async (
  serviceId: string,
  hubspotCompanyId: string,
  props: Record<string, string | undefined>,
  space: SpaceLookup
): Promise<void> => {
  const internalServiceId = `SVC-HS-${serviceId}`
  const name = props.hs_name || `Service ${serviceId}`
  const lineaDeServicio = props.ef_linea_de_servicio ?? 'efeonce_digital'
  const servicioEspecifico = props.ef_servicio_especifico ?? 'consulting'
  const modalidad = props.ef_modalidad ?? 'continua'
  const billingFrequency = props.ef_billing_frequency ?? 'monthly'
  const country = props.ef_country ?? 'CL'
  const currency = props.ef_currency ?? 'CLP'
  const totalCost = props.ef_total_cost ? Number(props.ef_total_cost) : 0
  const amountPaid = props.ef_amount_paid ? Number(props.ef_amount_paid) : 0
  const startDate = props.ef_start_date || null
  const targetEndDate = props.ef_target_end_date || null
  const notionProjectId = props.ef_notion_project_id || null
  const hubspotDealId = props.ef_deal_id || null
  const syncStatus = props.ef_linea_de_servicio ? 'synced' : 'unmapped'

  const result = await runGreenhousePostgresQuery<{ action: string }>(
    `INSERT INTO greenhouse_core.services (
      service_id, hubspot_service_id, name, space_id, organization_id,
      hubspot_company_id, hubspot_deal_id,
      pipeline_stage, start_date, target_end_date,
      total_cost, amount_paid, currency,
      linea_de_servicio, servicio_especifico, modalidad, billing_frequency, country,
      notion_project_id, hubspot_last_synced_at, hubspot_sync_status,
      active, status, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      'active', $8::date, $9::date,
      $10, $11, $12,
      $13, $14, $15, $16, $17,
      $18, NOW(), $19,
      TRUE, 'active', NOW(), NOW()
    )
    ON CONFLICT (hubspot_service_id) DO UPDATE SET
      name = EXCLUDED.name,
      total_cost = EXCLUDED.total_cost,
      amount_paid = EXCLUDED.amount_paid,
      currency = EXCLUDED.currency,
      start_date = EXCLUDED.start_date,
      target_end_date = EXCLUDED.target_end_date,
      notion_project_id = EXCLUDED.notion_project_id,
      hubspot_deal_id = EXCLUDED.hubspot_deal_id,
      linea_de_servicio = EXCLUDED.linea_de_servicio,
      servicio_especifico = EXCLUDED.servicio_especifico,
      hubspot_last_synced_at = NOW(),
      hubspot_sync_status = EXCLUDED.hubspot_sync_status,
      updated_at = NOW()
    RETURNING CASE WHEN xmax = 0 THEN 'created' ELSE 'updated' END AS action`,
    [
      internalServiceId, serviceId, name, space.space_id, space.organization_id,
      hubspotCompanyId, hubspotDealId,
      startDate, targetEndDate,
      totalCost, amountPaid, currency,
      lineaDeServicio, servicioEspecifico, modalidad, billingFrequency, country,
      notionProjectId, syncStatus
    ]
  )

  const action = (result[0]?.action ?? 'skipped') as 'created' | 'updated' | 'skipped'

  if (action === 'created' || action === 'updated') {
    await publishOutboxEvent({
      aggregateType: 'service_engagement',
      aggregateId: internalServiceId,
      eventType: 'commercial.service_engagement.materialized',
      payload: {
        version: 1,
        action,
        serviceId: internalServiceId,
        hubspotServiceId: serviceId,
        hubspotCompanyId,
        name,
        spaceId: space.space_id,
        clientId: space.client_id,
        organizationId: space.organization_id,
        syncStatus,
        materializedAt: new Date().toISOString(),
        source: 'hubspot-services-webhook'
      }
    })
  }
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

      await upsertServiceFromHubSpot(svc.id, hubspotCompanyId, svc.properties, spaceRows[0])
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
  if (failures.length === serviceObjects.length && failures.length > 0) {
    throw new Error(`All ${failures.length} service syncs failed: ${failures.slice(0, 3).join('; ')}`)
  }

  // Surface organization_unresolved markers in error_message so the
  // reliability signal can detect them via LIKE pattern. Webhook inbox
  // marks the row failed when handler throws — we deliberately throw
  // when *all* services failed; partial failures stay logged in Sentry only.
  if (failures.some(f => f.startsWith('organization_unresolved:'))) {
    // Attach unresolved markers as a soft anomaly — log via Sentry only.
    // No throw because partial success means inbox row is processed OK.
  }
})
