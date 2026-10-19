import { createHash } from 'node:crypto'

import { z } from 'zod'

/** Admin-only correction of legacy commercial intake classification. Never visitor input. */
export const commercialFormClassificationSchema = z.object({
  formKey: z.string().uuid(),
  expectedDefinitionSha256: z.string().regex(/^[a-f0-9]{64}$/),
  expectedPublishedVersionId: z.string().min(1).max(180),
  fromFormKind: z.literal('lead_magnet'),
  toFormKind: z.literal('quote_request'),
  commercialIntentConfirmed: z.literal(true),
  reason: z.string().trim().min(20).max(500),
}).strict()

export type CommercialFormClassificationInput = z.infer<typeof commercialFormClassificationSchema>

export class FormClassificationConflictError extends Error {
  constructor() { super('form_classification_precondition_failed') }
}

/** Metadata only: source identity, purpose/risk and timestamps; never submissions or secrets. */
export const formDefinitionFingerprint = (value: Record<string, unknown>): string => {
  const canonical = Object.fromEntries(Object.entries(JSON.parse(JSON.stringify(value))).sort(([a], [b]) => a.localeCompare(b)))

  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex')
}
