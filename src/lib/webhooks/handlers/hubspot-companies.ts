import { createHmac, timingSafeEqual } from 'node:crypto'

import { registerInboundHandler } from '@/lib/webhooks/inbound'
import { resolveSecret } from '@/lib/webhooks/signing'
import { syncHubSpotCompanyById } from '@/lib/hubspot/sync-company-by-id'
import { syncTenantCapabilitiesFromIntegration } from '@/lib/integrations/greenhouse-integration'
import { captureWithDomain } from '@/lib/observability/capture'

/**
 * HubSpot companies webhook handler — TASK-706.
 *
 * Suscripción HubSpot Developer Portal:
 *   - company.creation
 *   - company.propertyChange (lifecyclestage, name, domain, country, industry)
 *   - contact.creation (opcional, para que llegue Mario Arroyo de Motogas etc.)
 *   - contact.propertyChange (opcional)
 *
 * Target URL: https://greenhouse.efeoncepro.com/api/webhooks/hubspot-companies
 *
 * Validación de firma: HubSpot v3 — HMAC-SHA256 de
 *   `httpMethod + uri + body + timestamp` con app client secret.
 * Headers requeridos:
 *   - X-HubSpot-Signature-v3
 *   - X-HubSpot-Request-Timestamp
 *
 * Comportamiento:
 *   1. Valida firma (rechaza requests sin firma válida).
 *   2. Parsea events (HubSpot envía array).
 *   3. Extrae HubSpot company IDs únicos. Para contact events extrae
 *      el primaryCompanyId asociado.
 *   4. Para cada company ID, dispara syncHubSpotCompanyById que:
 *      a. Fetcha bridge /companies/{id} + /companies/{id}/contacts
 *      b. UPSERT en greenhouse_crm.companies + greenhouse_crm.contacts
 *      c. Promueve crm → core (organization + client) via syncHubSpotCompanies
 *   5. Falla individualmente no aborta el batch — cada company se intenta y
 *      los errores se capturan en Sentry con domain='integrations.hubspot'.
 */

const SIGNATURE_HEADER = 'x-hubspot-signature-v3'
const TIMESTAMP_HEADER = 'x-hubspot-request-timestamp'
const MAX_TIMESTAMP_AGE_MS = 5 * 60 * 1000  // 5 min — HubSpot recomendado

interface HubSpotEvent {
  subscriptionType: string
  objectId: number | string
  occurredAt?: number
  eventId?: string | number
  associatedObjectId?: number | string
  propertyName?: string
  propertyValue?: string
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

  // Constant-time comparison
  const expectedBuf = Buffer.from(expected, 'utf8')
  const receivedBuf = Buffer.from(signature, 'utf8')

  if (expectedBuf.length !== receivedBuf.length) return false

  return timingSafeEqual(expectedBuf, receivedBuf)
}

const extractCompanyIdsFromEvents = (events: HubSpotEvent[]): string[] => {
  const ids = new Set<string>()

  for (const event of events) {
    const subscriptionType = String(event.subscriptionType || '')
    const objectId = String(event.objectId)
    const associatedId = event.associatedObjectId ? String(event.associatedObjectId) : null

    if (subscriptionType.startsWith('company.')) {
      if (objectId) ids.add(objectId)
    } else if (subscriptionType.startsWith('contact.') && associatedId) {
      // Para events de contact, sincronizamos su primary company
      ids.add(associatedId)
    }
  }

  return Array.from(ids)
}

registerInboundHandler('hubspot-companies', async (inboxEvent, rawBody, parsedPayload) => {
  // 1. Validate HubSpot v3 signature manually (auth_mode='provider_native').
  const headers = inboxEvent.headers_json as Record<string, string>
  const signature = headers[SIGNATURE_HEADER] ?? ''
  const timestamp = headers[TIMESTAMP_HEADER] ?? ''

  // Determine canonical URI used by HubSpot when computing the signature.
  // It's always the public URL the webhook posted to. Fallback to the
  // documented canonical path if request URL is not available in headers.
  const requestUri = headers['x-forwarded-uri']
    ?? headers['x-original-url']
    ?? 'https://greenhouse.efeoncepro.com/api/webhooks/hubspot-companies'

  const secret = await resolveSecret('HUBSPOT_APP_CLIENT_SECRET')

  if (!secret) {
    throw new Error('HUBSPOT_APP_CLIENT_SECRET not configured (cannot verify webhook signature)')
  }

  const valid = await validateHubSpotSignature(rawBody, signature, timestamp, secret, requestUri, 'POST')

  if (!valid) {
    // Reject the event — log + throw so the inbox row is marked failed and
    // HubSpot will retry. If retries keep failing, an alert is raised.
    throw new Error('HubSpot signature validation failed')
  }

  // 2. Parse payload — HubSpot envía array de events.
  const events = Array.isArray(parsedPayload) ? (parsedPayload as HubSpotEvent[]) : []

  if (events.length === 0) {
    return
  }

  // 3. Extract company IDs to sync.
  const companyIds = extractCompanyIdsFromEvents(events)

  if (companyIds.length === 0) {
    return
  }

  // 4. Sync each company. Failures are captured but don't abort the batch.
  const results: Array<{ id: string; ok: boolean; error?: string }> = []

  for (const id of companyIds) {
    try {
      const result = await syncHubSpotCompanyById(id, { promote: true, triggeredBy: 'hubspot-webhook' })

      // Persist capability codes (business_lines + service_modules) into the
      // canonical tenant capabilities table — replicates the work that the
      // Cloud Run bridge used to do for property changes on `linea_de_servicio`
      // and `servicios_especificos`. Now everything terminates in Greenhouse.
      if (result.capabilities.businessLines.length > 0 || result.capabilities.serviceModules.length > 0) {
        try {
          await syncTenantCapabilitiesFromIntegration({
            selector: {
              clientId: null,
              publicId: null,
              sourceSystem: 'hubspot_crm',
              sourceObjectType: 'company',
              sourceObjectId: id
            },
            sourceSystem: 'hubspot_crm',
            sourceObjectType: 'company',
            sourceObjectId: id,
            confidence: 'high',
            businessLines: result.capabilities.businessLines,
            serviceModules: result.capabilities.serviceModules
          })
        } catch (err) {
          captureWithDomain(err, 'integrations.hubspot', {
            level: 'warning',
            tags: { source: 'hubspot-companies-webhook', step: 'capability-sync' },
            extra: { hubspotCompanyId: id }
          })
        }
      }

      results.push({ id, ok: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)

      results.push({ id, ok: false, error: message })

      captureWithDomain(err, 'integrations.hubspot', {
        level: 'error',
        tags: { source: 'hubspot-companies-webhook' },
        extra: { hubspotCompanyId: id, eventCount: events.length }
      })
    }
  }

  const failed = results.filter(r => !r.ok)

  if (failed.length === companyIds.length && failed.length > 0) {
    // All failed — escalate so HubSpot retries.
    throw new Error(`All ${failed.length} company syncs failed: ${failed.map(f => `${f.id}=${f.error}`).join('; ')}`)
  }
})
