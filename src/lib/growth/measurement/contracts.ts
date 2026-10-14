import { z } from 'zod'

export const publicMeasurementContextSchema = z.object({
  source: z.literal('hubspot_categories'),
  policyVersion: z.literal('efeonce-categories-2026-10-13'),
  capturedAt: z.string().datetime(),
  advertisement: z.boolean(),
  analytics: z.boolean(),
  globalPrivacyControl: z.boolean(),
  clientId: z.string().regex(/^\d{1,20}\.\d{1,20}$/).optional(),
  fbp: z.string().regex(/^fb\.\d+\.\d{13}\.\d{1,20}$/).optional(),
  fbc: z.string().regex(/^fb\.\d+\.\d{13}\.[A-Za-z0-9._~-]{1,512}$/).optional(),
}).strict()

export type MeasurementConsentSnapshot = z.infer<typeof publicMeasurementContextSchema>
export type MeasurementSourceKind = 'form_submission' | 'meeting_booking'
export type MeasurementDestination = 'meta' | 'google_upd'
export interface MeasurementScope {
  sourceKind: MeasurementSourceKind
  sourceId: string
  sourceKey?: string
  sourceVersion?: string
  origin: string | null
  pageUri?: string | null
  surfaceId: string | null
  formSlug?: string
  schedulerKey?: string
}
export interface MatchingContact { email?: unknown; phone?: unknown; firstName?: unknown; lastName?: unknown }
export interface PreparedMeasurement {
  policyRevisionId: string
  eventId: string
  occurredAt: string
  consent: MeasurementConsentSnapshot
  encryptedPayload: { v: 1; iv: string; tag: string; ciphertext: string }
  destinations: MeasurementDestination[]
}
