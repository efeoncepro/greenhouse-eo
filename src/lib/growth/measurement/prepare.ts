import 'server-only'

import { resolveSecret } from '@/lib/secrets/secret-manager'

import { publicMeasurementContextSchema, type PreparedMeasurement } from './contracts'
import { encryptMeasurementPayload } from './crypto'
import { buildMeasurementPayloads } from './payload'
import { resolvePublishedMeasurementPolicy } from './policy-store'
import { resolveMeasurementSource } from './policy-source'

export const prepareMeasurementConversion = async (
  input: Omit<Parameters<typeof buildMeasurementPayloads>[0], 'contact'|'policy'> & { fields?: Record<string, unknown>; contact?: Record<string, unknown> },
  env: NodeJS.ProcessEnv = process.env,
): Promise<PreparedMeasurement | null> => {
  if (env.GROWTH_MEASUREMENT_CAPTURE_ENABLED !== 'true') return null

  try {
    const consent = publicMeasurementContextSchema.safeParse(input.measurementContext)

    if (input.requestGlobalPrivacyControl || !consent.success || !consent.data.advertisement || consent.data.globalPrivacyControl) return null
    if (!input.scope.sourceKey || !input.scope.surfaceId || !input.scope.origin) return null
    const scope={sourceKind:input.scope.sourceKind,sourceKey:input.scope.sourceKey,surfaceId:input.scope.surfaceId}
    const source=await resolveMeasurementSource(scope)
    const version=input.scope.sourceVersion || (scope.sourceKind==='meeting_booking'?source?.sourceVersion:undefined)

    if(!version) return null
    const policy=await resolvePublishedMeasurementPolicy(scope,version,input.scope.origin)

    if(!policy || !policy.config.destinations.length) return null
    const fields=input.fields??input.contact??{}
    const mapping=policy.config.mapping

    const contact={email:mapping.email?fields[mapping.email]:undefined,phone:mapping.phone?fields[mapping.phone]:undefined,
      firstName:mapping.firstName?fields[mapping.firstName]:undefined,lastName:mapping.lastName?fields[mapping.lastName]:undefined}

    const payloads = buildMeasurementPayloads({...input,scope:{...input.scope,sourceVersion:version},contact,policy})

    if (!payloads) return null
    const destinations = [...(policy.config.destinations.includes('meta') ? ['meta' as const] : []), ...(payloads.google ? ['google_upd' as const] : [])]

    if (!destinations.length) return null
    const secret = await resolveSecret({ envVarName: 'GROWTH_MEASUREMENT_PAYLOAD_KEY', env })

    if (!secret.value) throw new Error('measurement_key_unavailable')

    return {
      policyRevisionId: policy.revisionId,
      eventId: payloads.eventId, occurredAt: payloads.occurredAt,
      consent: {
        source: payloads.consent.source, policyVersion: payloads.consent.policyVersion,
        capturedAt: payloads.consent.capturedAt, advertisement: payloads.consent.advertisement,
        analytics: payloads.consent.analytics, globalPrivacyControl: payloads.consent.globalPrivacyControl,
      },
      encryptedPayload: encryptMeasurementPayload({ meta: policy.config.destinations.includes('meta') ? payloads.meta : null, google: payloads.google }, secret.value, payloads.eventId),
      destinations,
    }
  } catch {
    // Neither key failure nor instrumentation failure may change commercial acceptance.
    console.warn('growth_measurement_prepare_failed', { sourceKind: input.scope.sourceKind })

    return null
  }
}
