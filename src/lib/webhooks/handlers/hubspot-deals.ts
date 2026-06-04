import { createHmac, timingSafeEqual } from 'node:crypto'

import { provisionClientLifecycle } from '@/lib/client-lifecycle/commands/provision-client-lifecycle'
import { isClientLifecycleHubspotDealTriggerEnabled } from '@/lib/client-lifecycle/flags'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { registerInboundHandler } from '@/lib/webhooks/inbound'
import { resolveSecret } from '@/lib/webhooks/signing'

/**
 * HubSpot deals (object 0-3) webhook handler — TASK-1010 Slice 3 (spec §11.1).
 *
 * Trigger SEMI-AUTOMÁTICO: cuando un deal HubSpot llega a closed-won, abre un
 * caso de onboarding en `status='draft'` para la organización del deal. El
 * operador comercial lo activa (draft → in_progress) desde la ficha del cliente.
 * Un misclick de sales NO dispara side-effects irreversibles (el caso draft no
 * provisiona nada — solo materializa el checklist pendiente de activación).
 *
 * Suscripción HubSpot Developer Portal (operator-gated, config aparte):
 *   - deal.creation
 *   - deal.propertyChange (dealstage)
 *   Target URL: https://greenhouse.efeoncepro.com/api/webhooks/hubspot-deals
 *   Signature method: v3.
 *
 * Validación: HubSpot v3 signature (HMAC-SHA256 of method+uri+body+timestamp),
 * mismo patrón que hubspot-services / hubspot-companies.
 *
 * Gating: flag CLIENT_LIFECYCLE_HUBSPOT_DEAL_TRIGGER_ENABLED (default OFF). Con
 * el flag OFF el handler valida firma + ACKea pero NO abre casos (staged rollout).
 *
 * Resolución (Postgres-first, skip honesto):
 *   1. Re-leer el deal desde greenhouse_crm.deals (synced) → is_closed_won +
 *      hubspot_company_id. NUNCA confía el payload del webhook (solo trae ids).
 *   2. Si el deal no está sincronizado aún, o no es closed-won → skip (no throw):
 *      el sync llega después y un re-fire del webhook lo recupera.
 *   3. Resolver la organización canónica vía organizations.hubspot_company_id.
 *      Si no existe → skip honesto (el sync de companies debe crearla; si no, el
 *      operador abre el caso manualmente).
 *   4. provisionClientLifecycle(onboarding, hubspot_deal → draft). Idempotente:
 *      un caso activo por (org, kind) ya existente se devuelve sin duplicar.
 *
 * Sentry: captureWithDomain('integrations.hubspot') por failure individual.
 */

const SIGNATURE_HEADER = 'x-hubspot-signature-v3'
const TIMESTAMP_HEADER = 'x-hubspot-request-timestamp'
const MAX_TIMESTAMP_AGE_MS = 5 * 60 * 1000

interface HubSpotEvent {
  subscriptionType?: string
  objectId?: number | string
  occurredAt?: number
  eventId?: string | number
  propertyName?: string
  propertyValue?: string
  /** Developer Platform 2025.2: objectTypeId separado cuando subscriptionType
   *  es `object.*` genérico (0-3 = deal). */
  objectTypeId?: string
  objectType?: string
}

/**
 * Clasificador dual-format (espeja hubspot-services.ts / hubspot-companies.ts):
 *   - Legacy: subscriptionType = `deal.creation`, `deal.propertyChange`, `0-3.*`
 *   - Developer Platform 2025.2: `object.*` + objectTypeId `0-3` o objectType `deal`
 */
export const isHubSpotDealEvent = (event: HubSpotEvent): boolean => {
  const subscriptionType = String(event.subscriptionType || '')
  const objectTypeId = String(event.objectTypeId || '')
  const objectType = String(event.objectType || '')

  if (subscriptionType.startsWith('deal.') || subscriptionType.startsWith('0-3.')) {
    return true
  }

  if (subscriptionType.startsWith('object.')) {
    return objectTypeId === '0-3' || objectType === 'deal'
  }

  return false
}

const extractDealIdsFromEvents = (events: HubSpotEvent[]): string[] => {
  const ids = new Set<string>()

  for (const event of events) {
    if (!isHubSpotDealEvent(event)) continue

    const objectId = event.objectId ? String(event.objectId) : ''

    if (objectId) ids.add(objectId)
  }

  return Array.from(ids)
}

export const validateHubSpotSignature = async (
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

  if (Math.abs(Date.now() - tsMs) > MAX_TIMESTAMP_AGE_MS) return false

  const message = `${method}${uri}${rawBody}${timestamp}`
  const expected = createHmac('sha256', secret).update(message).digest('base64')

  const expectedBuf = Buffer.from(expected, 'utf8')
  const receivedBuf = Buffer.from(signature, 'utf8')

  if (expectedBuf.length !== receivedBuf.length) return false

  return timingSafeEqual(expectedBuf, receivedBuf)
}

interface DealLookup extends Record<string, unknown> {
  hubspot_company_id: string | null
  is_closed_won: boolean
}

interface OrgLookup extends Record<string, unknown> {
  organization_id: string
}

const DEAL_BY_HS_ID_SQL = `
  SELECT hubspot_company_id, is_closed_won
  FROM greenhouse_crm.deals
  WHERE hubspot_deal_id = $1
    AND is_deleted = FALSE
  LIMIT 1
`

const ORG_BY_HS_COMPANY_SQL = `
  SELECT organization_id
  FROM greenhouse_core.organizations
  WHERE hubspot_company_id = $1
    AND active = TRUE
  LIMIT 1
`

const todayIsoDate = (): string => new Date().toISOString().slice(0, 10)

/**
 * Resuelve un deal closed-won → organización canónica → abre caso onboarding draft.
 * Skip honesto (return, no throw) cuando el deal no está synced, no es closed-won,
 * o la organización no existe todavía. No queremos ruido ni reintentos para un
 * estado que el sync resolverá después.
 */
export const processClosedWonDeal = async (hubspotDealId: string): Promise<'opened' | 'idempotent' | 'skipped'> => {
  const dealRows = await runGreenhousePostgresQuery<DealLookup>(DEAL_BY_HS_ID_SQL, [hubspotDealId])
  const deal = dealRows[0]

  // Deal aún no sincronizado a greenhouse_crm.deals, o no es closed-won → skip.
  if (!deal || deal.is_closed_won !== true) return 'skipped'

  const hubspotCompanyId = deal.hubspot_company_id ? String(deal.hubspot_company_id).trim() : ''

  if (!hubspotCompanyId) return 'skipped'

  const orgRows = await runGreenhousePostgresQuery<OrgLookup>(ORG_BY_HS_COMPANY_SQL, [hubspotCompanyId])
  const org = orgRows[0]

  // Organización canónica no existe aún (el sync de companies debe crearla) → skip.
  if (!org) return 'skipped'

  const result = await provisionClientLifecycle({
    organizationId: org.organization_id,
    caseKind: 'onboarding',
    triggerSource: 'hubspot_deal',
    triggeredByUserId: null,
    effectiveDate: todayIsoDate(),
    hubspotDealId
  })

  return result.idempotent ? 'idempotent' : 'opened'
}

/**
 * Procesa los deal events del batch. Solo abre casos cuando el flag está ON.
 * Failures individuales se capturan en Sentry; no se re-lanza para no reintentar
 * un batch entero por un deal problemático (los demás deals del batch sí avanzan).
 */
export const processHubSpotDealEvents = async (events: HubSpotEvent[]): Promise<void> => {
  if (!isClientLifecycleHubspotDealTriggerEnabled()) return

  const dealIds = extractDealIdsFromEvents(events)

  if (dealIds.length === 0) return

  for (const dealId of dealIds) {
    try {
      await processClosedWonDeal(dealId)
    } catch (err) {
      captureWithDomain(err, 'integrations.hubspot', {
        level: 'error',
        tags: { source: 'hubspot-deals-webhook', stage: 'open_onboarding_case' },
        extra: { hubspotDealId: dealId }
      })
    }
  }
}

registerInboundHandler('hubspot-deals', async (inboxEvent, rawBody, parsedPayload) => {
  const headers = inboxEvent.headers_json as Record<string, string>
  const signature = headers[SIGNATURE_HEADER] ?? ''
  const timestamp = headers[TIMESTAMP_HEADER] ?? ''

  const requestUri = headers['x-forwarded-uri']
    ?? headers['x-original-url']
    ?? 'https://greenhouse.efeoncepro.com/api/webhooks/hubspot-deals'

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

  await processHubSpotDealEvents(events)
})
