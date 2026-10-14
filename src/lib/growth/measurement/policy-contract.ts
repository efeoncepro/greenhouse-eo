/** Administrative DTOs only. Never included in a public render contract. */
import { z } from 'zod'

export const MEASUREMENT_ORIGINS = ['https://efeoncepro.com', 'https://think.efeoncepro.com'] as const
export const measurementSourceKindSchema = z.enum(['form_submission', 'meeting_booking'])
export const measurementDestinationSchema = z.enum(['meta', 'google_upd'])
const sourceVersionSchema = z.string().regex(/^(?:fver-[A-Za-z0-9_-]{1,140}|[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}|[a-f0-9]{64})$/i)
const fieldKey = z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,79}$/)

export const measurementMappingSchema = z.object({ email: fieldKey.optional(), phone: fieldKey.optional(), firstName: fieldKey.optional(), lastName: fieldKey.optional() }).strict()
export const measurementPolicyConfigSchema = z.object({
  purpose: z.literal('commercial_lead'),
  sourceVersion: sourceVersionSchema,
  origins: z.array(z.enum(MEASUREMENT_ORIGINS)).min(1).max(2).refine(v => new Set(v).size === v.length),
  destinations: z.array(measurementDestinationSchema).max(2).refine(v => new Set(v).size === v.length),
  mapping: measurementMappingSchema,
}).strict().refine(v => Boolean(v.mapping.email || v.mapping.phone), { message: 'identity_mapping_required', path: ['mapping'] })
export const measurementPolicyScopeSchema = z.object({
  sourceKind: measurementSourceKindSchema,
  sourceKey: z.string().regex(/^[A-Za-z0-9_-]{1,120}$/),
  surfaceId: z.string().regex(/^[A-Za-z0-9_-]{1,120}$/),
}).strict().refine(v => v.sourceKind !== 'form_submission' || z.string().uuid().safeParse(v.sourceKey).success)
export const measurementPolicyMutationSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('draft'), scope: measurementPolicyScopeSchema, config: measurementPolicyConfigSchema, expectedPublishedRevisionId: z.string().uuid().nullable(), idempotencyKey: z.string().uuid() }).strict(),
  z.object({ action: z.enum(['review','publish','disable']), policyId: z.string().uuid(), revisionId: z.string().uuid(), expectedPublishedRevisionId: z.string().uuid().nullable(), idempotencyKey: z.string().uuid() }).strict(),
])
export type MeasurementPolicyScope = z.infer<typeof measurementPolicyScopeSchema>
export type MeasurementPolicyConfig = z.infer<typeof measurementPolicyConfigSchema>
export type MeasurementPolicyMutation = z.infer<typeof measurementPolicyMutationSchema>
export type MeasurementPolicyState = 'draft'|'review'|'published'|'superseded'|'disabled'
export interface MeasurementPolicyRevision {
  policyId: string; revisionId: string; revision: number; state: MeasurementPolicyState
  scope: MeasurementPolicyScope; config: MeasurementPolicyConfig; publishedRevisionId: string|null
}
export interface MeasurementPolicySource {
  scope: MeasurementPolicyScope; name: string; formSlug?: string; sourceVersion: string; origins: string[]
  fields: { key: string; type: 'email'|'tel'|'text'; derived?: boolean }[]
  blockingReasons: string[]
}

export const validateMeasurementMapping = (config: MeasurementPolicyConfig, source: MeasurementPolicySource): string[] => {
  const reasons = [...source.blockingReasons]

  if (config.sourceVersion !== source.sourceVersion) reasons.push('source_version_changed')
  if (!config.origins.every(v => source.origins.includes(v))) reasons.push('origin_out_of_scope')

  for (const [target, key] of Object.entries(config.mapping)) {
    const field = source.fields.find(v => v.key === key)
    const expected = target === 'email' ? 'email' : target === 'phone' ? 'tel' : 'text'

    if (!field || field.type !== expected) reasons.push('mapping_incompatible_' + target)
  }

  return [...new Set(reasons)]
}

export const measurementPolicyProofSchema = z.object({
  policy_id: z.string().uuid(), revision_id: z.string().uuid(), revision: z.number().int().positive(),
  source_kind: measurementSourceKindSchema, source_key: z.string().regex(/^[A-Za-z0-9_-]{1,120}$/),
  source_version: sourceVersionSchema,
  surface_id: z.string().regex(/^[A-Za-z0-9_-]{1,120}$/), purpose: z.literal('commercial_lead'),
}).strict()
export type MeasurementPolicyProof = z.infer<typeof measurementPolicyProofSchema>
export interface MeasurementPolicyResult { ok: boolean; policy?: MeasurementPolicyRevision; blockingReasons: string[]; error?: 'invalid_input'|'forbidden'|'not_found'|'conflict'|'policy_unavailable' }

/** Discoverable metadata: same commands for operators, CLI and governed action consumers. */
export const MEASUREMENT_POLICY_AGENT_CONTRACT = {
  version: 'growth-measurement-policy.v1',
  endpoint: '/api/admin/growth/measurement',
  authentication: 'user-bound agent-session or portal session; internal capability checks',
  operations: ['discover', 'validate', 'draft', 'review', 'publish', 'disable', 'verify'],
  lifecycle: ['draft', 'review', 'publish'],
  mutationRequired: ['action', 'expectedPublishedRevisionId', 'idempotencyKey'],
  draftRequired: ['scope', 'config'],
  transitionRequired: ['policyId', 'revisionId'],
  destinations: ['meta', 'google_upd'],
  defaults: { destinations: [] },
  retry: 'Reuse the exact command and idempotencyKey after an unknown outcome; after a receipt retry readback only.',
  concurrency: 'expectedPublishedRevisionId must equal the current published head, including null.',
  authority: 'Source version, typed fields, surface, origin and consent remain server-owned. Validation does not publish.',
} as const

export const measurementPolicyPreviewSchema = z.object({dryRun: z.literal(true), command: z.unknown()}).strict()
