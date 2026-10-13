import 'server-only'

import { resolveSecret } from '@/lib/secrets/secret-manager'

import type { PreparedMeasurement } from './contracts'
import { encryptMeasurementPayload } from './crypto'
import { buildMeasurementPayloads } from './payload'

export const prepareMeasurementConversion = async (
  input: Parameters<typeof buildMeasurementPayloads>[0],
  env: NodeJS.ProcessEnv = process.env,
): Promise<PreparedMeasurement | null> => {
  if (env.GROWTH_MEASUREMENT_CAPTURE_ENABLED !== 'true') return null

  try {
    const payloads = buildMeasurementPayloads(input)

    if (!payloads) return null
    const secret = await resolveSecret({ envVarName: 'GROWTH_MEASUREMENT_PAYLOAD_KEY', env })

    if (!secret.value) throw new Error('measurement_key_unavailable')

    return {
      eventId: payloads.eventId, occurredAt: payloads.occurredAt,
      consent: {
        source: payloads.consent.source, policyVersion: payloads.consent.policyVersion,
        capturedAt: payloads.consent.capturedAt, advertisement: payloads.consent.advertisement,
        analytics: payloads.consent.analytics, globalPrivacyControl: payloads.consent.globalPrivacyControl,
      },
      encryptedPayload: encryptMeasurementPayload({ meta: payloads.meta, google: payloads.google }, secret.value, payloads.eventId),
      destinations: payloads.google ? ['meta', 'google_upd'] : ['meta'],
    }
  } catch {
    // Neither key failure nor instrumentation failure may change commercial acceptance.
    console.warn('growth_measurement_prepare_failed', { sourceKind: input.scope.sourceKind })

    return null
  }
}
