import type { PreflightOverrideAudit } from './types'

/** Records a declared exception, not a verified human capability or GitHub-to-person mapping. */
export const buildPreflightOverrideAudit = (input: {
  overrideBatchPolicy: boolean
  bypassWarnings: boolean
  reason?: string | null
  actor: string | null
}): PreflightOverrideAudit | undefined => {
  if (!input.overrideBatchPolicy && !input.bypassWarnings) return undefined

  const reason = input.reason?.trim() ?? ''

  if (reason.length < 20) throw new Error('Preflight override requires a reason of at least 20 characters')

  return {
    reason,
    overrideBatchPolicy: input.overrideBatchPolicy,
    bypassWarnings: input.bypassWarnings,
    actor: input.actor
  }
}

/** Validate again when an artifact crosses into durable manifest/audit persistence. */
export const readPreflightOverrideAudit = (value: unknown): PreflightOverrideAudit | undefined => {
  if (value === undefined) return undefined
  if (!value || typeof value !== 'object') throw new Error('Invalid preflight override audit')

  const v = value as Record<string, unknown>

  if (
    typeof v.reason !== 'string' ||
    typeof v.overrideBatchPolicy !== 'boolean' ||
    typeof v.bypassWarnings !== 'boolean' ||
    (v.actor !== null && typeof v.actor !== 'string') ||
    (!v.overrideBatchPolicy && !v.bypassWarnings)
  )
    throw new Error('Invalid preflight override audit')

  return buildPreflightOverrideAudit({
    reason: v.reason,
    overrideBatchPolicy: v.overrideBatchPolicy,
    bypassWarnings: v.bypassWarnings,
    actor: v.actor as string | null
  })
}
