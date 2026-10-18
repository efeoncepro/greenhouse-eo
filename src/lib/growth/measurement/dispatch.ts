import 'server-only'

import { resolveSecret } from '@/lib/secrets/secret-manager'

import type { MeasurementDestination } from './contracts'
import { decryptMeasurementPayload } from './crypto'
import { measurementPolicyAllowsDelivery } from './policy-store'
import { assertMetaReceiptStorageReady, claimMeasurementDeliveries, expireMeasurementDeliveries, finishMeasurementDelivery } from './store'
import { META_RECEIPT_HEADER, META_ATTEMPT_HEADER, META_ATTEMPT_NUMBER_HEADER, metaReceiptContextSchema, metaReceiptObservation, type MetaReceiptContext } from './meta-receipt'

const TAGGING_ORIGIN = 'https://efeonce-gtm-tagging-183008134038.us-central1.run.app'
const MEASUREMENT_ID = 'G-KYPPY57M14'

export const sendMeasurementPayload = async (
  destination: MeasurementDestination,
  payload: Record<string, unknown>,
  secret: string,
  fetcher: typeof fetch = fetch,
  receiptContext?: MetaReceiptContext,
) => {
  // Validate correlation before the non-idempotent network operation; keep it out of CAPI user_data.
  const context = destination === 'meta' && receiptContext ? metaReceiptContextSchema.parse(receiptContext) : undefined

  if (context && (payload.event_id !== context.eventId || payload.event_time !== context.eventTime || payload.event_name !== 'generate_lead'))
    throw new Error('meta_receipt_request_context_mismatch')
  let observation = context ? metaReceiptObservation(context, null, 'unavailable') : undefined

  try {
    const url = destination === 'meta' ? `${TAGGING_ORIGIN}/efeonce/lead-enrichment` :
      `https://www.google-analytics.com/mp/collect?measurement_id=${MEASUREMENT_ID}&api_secret=${encodeURIComponent(secret)}`

    const response = await fetcher(url, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15_000),
      headers: { 'Content-Type': 'application/json', ...(destination === 'meta' ? { Authorization: `Bearer ${secret}` } : {}),
        ...(context ? { [META_ATTEMPT_HEADER]: context.attemptId, [META_ATTEMPT_NUMBER_HEADER]: String(context.attempt) } : {}) },
      body: JSON.stringify(payload),
    })

    if (context) {
      try { observation = metaReceiptObservation(context, response.headers.get(META_RECEIPT_HEADER)) }
      catch { /* Receipt instrumentation cannot turn a known successful POST into a retry. */ }
    }

    let success = response.ok

    if (destination === 'meta' && success) {
      const receipt = await response.json() as Record<string, unknown>

      success = receipt.meta_tag_status === 'success'
    }


    return {
      success, httpStatus: response.status,
      retryable: response.status === 429 || response.status >= 500 || (response.ok && !success),
      errorClass: success ? null : destination === 'meta' && response.ok ? 'meta_ack_invalid' : `provider_http_${response.status}`,
      ...(observation ? { metaObservation: observation } : {}),
    }
  } catch {
    return { success: false, httpStatus: null, retryable: true, errorClass: 'transport_or_ack_failed',
      ...(observation ? { metaObservation: observation } : {}) }
  }
}

export const dispatchMeasurementConversions = async (limit = 50, env: NodeJS.ProcessEnv = process.env) => {
  const destinations: MeasurementDestination[] = []

  if (env.GROWTH_MEASUREMENT_META_ENABLED === 'true') destinations.push('meta')
  if (env.GROWTH_MEASUREMENT_GOOGLE_UPD_ENABLED === 'true') destinations.push('google_upd')
  if (destinations.length || env.GROWTH_MEASUREMENT_RETENTION_ENABLED === 'true') await expireMeasurementDeliveries()
  if (!destinations.length) return { processed: 0, httpAccepted: 0, failed: 0, skipped: 'measurement_disabled' }

  const key = (await resolveSecret({ envVarName: 'GROWTH_MEASUREMENT_PAYLOAD_KEY', env })).value

  if (!key) throw new Error('measurement_key_unavailable')
  const secrets = new Map<MeasurementDestination, string>()
  const unavailableDestinations: MeasurementDestination[] = []

  for (const destination of destinations) {
    try {
      const secret = (await resolveSecret({ envVarName: destination === 'meta' ? 'GROWTH_MEASUREMENT_INGRESS_TOKEN' : 'GROWTH_MEASUREMENT_GA4_API_SECRET', env })).value

      if (!secret) throw new Error('measurement_destination_unconfigured')
      secrets.set(destination, secret)
    } catch {
      unavailableDestinations.push(destination)
    }
  }

  if (secrets.has('meta')) {
    try { await assertMetaReceiptStorageReady() }
    catch { secrets.delete('meta'); unavailableDestinations.push('meta') }
  }

  const availableDestinations = [...secrets.keys()]
  const summary = { processed: 0, httpAccepted: 0, failed: 0, staleFinalizations: 0, unavailableDestinations }
  const maximum = Math.max(1, Math.min(200, Math.floor(limit)))
  const deadline = Date.now() + 60_000

  // Claim just before sending: serial transport cannot leave a whole batch's leases expiring.
  while (summary.processed < maximum && Date.now() < deadline) {
    const [row] = await claimMeasurementDeliveries(availableDestinations, 1)

    if (!row) break
    let result

    let authorized: boolean

    try { authorized = await measurementPolicyAllowsDelivery(row.policy_revision_id,row.destination) }
    catch {
      result = {success:false,httpStatus:null,retryable:true,errorClass:'measurement_policy_unavailable'}
      authorized = false
    }

    if (!authorized && !result) result = {success:false,httpStatus:null,retryable:false,errorClass:'measurement_policy_revoked'}

    if (authorized) {
      try {
        const payloads = decryptMeasurementPayload(row.encrypted_payload_json, key, row.event_id) as {meta:Record<string,unknown>|null;google:Record<string,unknown>|null}
        const payload = row.destination === 'meta' ? payloads.meta : payloads.google

        if (!payload) throw new Error('measurement_projection_missing')
        result = await sendMeasurementPayload(row.destination,payload,secrets.get(row.destination)!, fetch,
          row.destination === 'meta' ? { eventId: row.event_id, eventTime: Math.floor(new Date(row.occurred_at).getTime() / 1000),
            attemptId: row.lease_token, attempt: row.attempts } : undefined)
      } catch {
        result = {success:false,httpStatus:null,retryable:false,errorClass:'measurement_payload_invalid'}
      }
    }

    const finalized = await finishMeasurementDelivery(row, result!)

    summary.processed++
    if (!finalized) summary.staleFinalizations++
    else if (result!.success) summary.httpAccepted++
    else summary.failed++
  }

  return summary
}

/** Measurement outages must never change the commercial dispatcher response. */
export const dispatchMeasurementConversionsSafely = async (limit = 50, env: NodeJS.ProcessEnv = process.env) => {
  try {
    return await dispatchMeasurementConversions(limit, env)
  } catch {
    console.warn('growth_measurement_dispatch_failed')

    return { processed: 0, httpAccepted: 0, failed: 0, errorClass: 'measurement_dispatch_failed' }
  }
}
