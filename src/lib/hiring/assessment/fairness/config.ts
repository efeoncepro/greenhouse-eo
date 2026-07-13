import 'server-only'

import { HiringValidationError } from '@/lib/hiring/errors'

export interface HiringFairnessPolicy {
  policyVersion: string
  retentionDays: number
  allowedCategories: ReadonlyMap<string, ReadonlySet<string>>
}
const KEY_PATTERN = /^[a-z][a-z0-9_]{1,63}$/

export const isHiringFairnessMonitorEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env.HIRING_FAIRNESS_MONITOR_ENABLED === 'true'

const parseAllowedCategories = (raw: string | undefined): ReadonlyMap<string, ReadonlySet<string>> => {
  let parsed: unknown

  try {
    parsed = raw ? JSON.parse(raw) : null
  } catch {
    parsed = null
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new HiringValidationError(
      'La política de categorías de fairness no está configurada.',
      'hiring_fairness_policy_not_configured',
      503,
    )
  }

  const dimensions = new Map<string, ReadonlySet<string>>()

  for (const [dimensionKey, categories] of Object.entries(parsed)) {
    if (!KEY_PATTERN.test(dimensionKey) || !Array.isArray(categories)) {
      throw new HiringValidationError(
        'La política de categorías de fairness no es válida.',
        'hiring_fairness_policy_invalid',
        503,
      )
    }

    const normalized = categories.filter((value): value is string => typeof value === 'string' && KEY_PATTERN.test(value))

    if (normalized.length < 2 || normalized.length !== categories.length || new Set(normalized).size !== normalized.length) {
      throw new HiringValidationError(
        'La política de categorías de fairness no es válida.',
        'hiring_fairness_policy_invalid',
        503,
      )
    }

    dimensions.set(dimensionKey, new Set(normalized))
  }

  if (dimensions.size === 0 || dimensions.size > 8) {
    throw new HiringValidationError(
      'La política de categorías de fairness no es válida.',
      'hiring_fairness_policy_invalid',
      503,
    )
  }

  return dimensions
}

export const requireHiringFairnessPolicy = (env: NodeJS.ProcessEnv = process.env): HiringFairnessPolicy => {
  if (!isHiringFairnessMonitorEnabled(env)) {
    throw new HiringValidationError(
      'El monitor de fairness no está habilitado.',
      'hiring_fairness_disabled',
      409,
    )
  }

  const policyVersion = env.HIRING_FAIRNESS_POLICY_VERSION?.trim() ?? ''
  const retentionDays = Number(env.HIRING_FAIRNESS_RETENTION_DAYS)

  if (!policyVersion || policyVersion.length > 100 || !Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650) {
    throw new HiringValidationError(
      'La política de consentimiento y retención de fairness no está configurada.',
      'hiring_fairness_policy_not_configured',
      503,
    )
  }

  return {
    policyVersion,
    retentionDays,
    allowedCategories: parseAllowedCategories(env.HIRING_FAIRNESS_ALLOWED_CATEGORIES_JSON),
  }
}
