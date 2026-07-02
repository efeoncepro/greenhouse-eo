import { z } from 'zod'

export const NAME_POLICY_MODES = ['off', 'split_full_name'] as const
export type NamePolicyMode = (typeof NAME_POLICY_MODES)[number]

export const nameNormalizationPolicySchema = z.object({
  mode: z.enum(NAME_POLICY_MODES).default('off'),
  sourceField: z.string().default('fullName'),
  firstNameField: z.string().default('firstName'),
  lastNameField: z.string().default('lastName'),
  confidenceField: z.string().optional(),
})

export type NameNormalizationPolicy = z.infer<typeof nameNormalizationPolicySchema>

export type NameSplitConfidence = 'none' | 'single_token' | 'two_tokens' | 'multi_token'

export interface SplitFullNameResult {
  fullName: string | null
  firstName: string | null
  lastName: string | null
  confidence: NameSplitConfidence
}

const hasMeaningfulValue = (value: unknown): boolean => {
  if (typeof value === 'string') return value.trim().length > 0

  return value !== undefined && value !== null
}

const normalizeNameWhitespace = (value: string): string => value.trim().replace(/\s+/gu, ' ')

export const splitFullName = (value: unknown): SplitFullNameResult => {
  if (typeof value !== 'string') return { fullName: null, firstName: null, lastName: null, confidence: 'none' }

  const fullName = normalizeNameWhitespace(value)

  if (!fullName) return { fullName: null, firstName: null, lastName: null, confidence: 'none' }

  const tokens = fullName.split(' ')

  if (tokens.length === 1) {
    return { fullName, firstName: tokens[0] ?? null, lastName: null, confidence: 'single_token' }
  }

  const [firstName, ...lastNameTokens] = tokens
  const lastName = lastNameTokens.join(' ')

  return {
    fullName,
    firstName: firstName || null,
    lastName: lastName || null,
    confidence: tokens.length === 2 ? 'two_tokens' : 'multi_token',
  }
}

export const resolveNameNormalizationPolicy = (validationSchemaJson: unknown): NameNormalizationPolicy => {
  const raw =
    validationSchemaJson && typeof validationSchemaJson === 'object'
      ? (validationSchemaJson as Record<string, unknown>).namePolicy
      : undefined

  const parsed = nameNormalizationPolicySchema.safeParse(raw ?? {})

  return parsed.success ? parsed.data : { mode: 'off', sourceField: 'fullName', firstNameField: 'firstName', lastNameField: 'lastName' }
}

export const applyNameNormalizationPolicy = (
  validationSchemaJson: unknown,
  fields: Record<string, unknown>,
): Record<string, unknown> => {
  const policy = resolveNameNormalizationPolicy(validationSchemaJson)

  if (policy.mode !== 'split_full_name') return fields

  const split = splitFullName(fields[policy.sourceField])

  if (!split.fullName) return fields

  const next: Record<string, unknown> = { ...fields, [policy.sourceField]: split.fullName }

  if (split.firstName && !hasMeaningfulValue(next[policy.firstNameField])) {
    next[policy.firstNameField] = split.firstName
  }

  if (split.lastName && !hasMeaningfulValue(next[policy.lastNameField])) {
    next[policy.lastNameField] = split.lastName
  }

  if (policy.confidenceField) {
    next[policy.confidenceField] = split.confidence
  }

  return next
}
