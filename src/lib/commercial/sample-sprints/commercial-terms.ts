import 'server-only'

import type { PoolClient } from 'pg'

import { query, withTransaction } from '@/lib/db'
import {
  assertEngagementServiceEligible,
  buildEligibleServicePredicate,
  ServiceNotEligibleForEngagementError
} from './eligibility'
import { recordEngagementAuditEvent } from './audit-log'
import { publishEngagementEvent } from './engagement-events'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'

export const ENGAGEMENT_COMMERCIAL_TERMS_KINDS = [
  'committed',
  'no_cost',
  'success_fee',
  'reduced_fee'
] as const

export type EngagementCommercialTermsKind = typeof ENGAGEMENT_COMMERCIAL_TERMS_KINDS[number]

export interface EngagementCommercialTerms {
  termsId: string
  serviceId: string
  termsKind: EngagementCommercialTermsKind
  effectiveFrom: string
  effectiveTo: string | null
  monthlyAmountClp: number | null
  successCriteria: Record<string, unknown> | null
  /** Module keys of greenhouse_client_portal.modules bundled by this pricing (TASK-824 §5.4; TASK-1852). */
  bundledModules: string[]
  declaredBy: string | null
  declaredAt: string
  reason: string
}

export interface DeclareCommercialTermsInput {
  serviceId: string
  kind: EngagementCommercialTermsKind
  effectiveFrom: Date | string
  monthlyAmountClp?: number | null
  successCriteria?: Record<string, unknown> | null
  /**
   * Module keys the service bundles for the client portal. Each key must exist in the ACTIVE
   * catalog (`modules.effective_to IS NULL`); unknown or deprecated keys fail closed
   * (TASK-824 Delta / TASK-828 G-3). Empty means the terms declare no portal bundle.
   */
  bundledModules?: string[]
  reason: string
  declaredBy: string
}

export interface DeclareCommercialTermsResult {
  termsId: string
}

interface TermsRow extends Record<string, unknown> {
  terms_id: string
  service_id: string
  terms_kind: EngagementCommercialTermsKind
  effective_from: Date | string
  effective_to: Date | string | null
  monthly_amount_clp: string | number | null
  success_criteria: Record<string, unknown> | null
  bundled_modules: string[] | null
  declared_by: string | null
  declared_at: Date | string
  reason: string
}

interface PgErrorLike {
  code?: string
  constraint?: string
  message?: string
}

export class CommercialTermsValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CommercialTermsValidationError'
  }
}

export class ServiceNotEligibleForCommercialTermsError extends Error {
  constructor(
    message: string,
    readonly serviceId: string,
    readonly reasonCode: 'not_found' | 'inactive' | 'legacy_seed_archived' | 'unmapped'
  ) {
    super(message)
    this.name = 'ServiceNotEligibleForCommercialTermsError'
  }
}

export class CommercialTermsConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CommercialTermsConflictError'
  }
}

const toIsoDateKey = (value: Date | string): string => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new CommercialTermsValidationError('effectiveFrom must be a valid date.')
    }

    return value.toISOString().slice(0, 10)
  }

  const trimmed = value.trim()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new CommercialTermsValidationError('effectiveFrom must use YYYY-MM-DD format.')
  }

  const parsed = new Date(`${trimmed}T00:00:00.000Z`)

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== trimmed) {
    throw new CommercialTermsValidationError('effectiveFrom must be a real calendar date.')
  }

  return trimmed
}

const toNumberOrNull = (value: string | number | null): number | null => {
  if (value == null) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const toDateString = (value: Date | string | null): string | null => {
  if (value == null) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return value.slice(0, 10)
}

const toTimestampString = (value: Date | string): string => {
  if (value instanceof Date) return value.toISOString()

  return value
}

const normalizeTerms = (row: TermsRow): EngagementCommercialTerms => ({
  termsId: row.terms_id,
  serviceId: row.service_id,
  termsKind: row.terms_kind,
  effectiveFrom: toDateString(row.effective_from) ?? '',
  effectiveTo: toDateString(row.effective_to),
  monthlyAmountClp: toNumberOrNull(row.monthly_amount_clp),
  successCriteria: row.success_criteria ?? null,
  bundledModules: [...(row.bundled_modules ?? [])].sort(),
  declaredBy: row.declared_by ?? null,
  declaredAt: toTimestampString(row.declared_at),
  reason: row.reason
})

const isTermsKind = (value: string): value is EngagementCommercialTermsKind => {
  return (ENGAGEMENT_COMMERCIAL_TERMS_KINDS as readonly string[]).includes(value)
}

const MODULE_KEY_PATTERN = /^[a-z0-9][a-z0-9_]{1,63}$/

const normalizeBundledModules = (value: string[] | undefined): string[] => {
  if (value === undefined) return []
  if (!Array.isArray(value)) throw new CommercialTermsValidationError('bundledModules must be an array of module keys.')

  const keys = value.map(item => (typeof item === 'string' ? item.trim() : ''))

  if (keys.some(key => !MODULE_KEY_PATTERN.test(key))) {
    throw new CommercialTermsValidationError('bundledModules contains an invalid module key.')
  }

  if (new Set(keys).size !== keys.length) {
    throw new CommercialTermsValidationError('bundledModules cannot repeat a module key.')
  }

  if (keys.length > 20) throw new CommercialTermsValidationError('bundledModules cannot exceed 20 module keys.')

  return [...keys].sort()
}

/** Catalog check at write time: a term never references a module the portal cannot resolve (TASK-828 G-3). */
const assertBundledModulesActive = async (client: PoolClient, moduleKeys: string[]): Promise<void> => {
  if (moduleKeys.length === 0) return

  const result = await client.query<{ module_key: string }>(
    `SELECT module_key
       FROM greenhouse_client_portal.modules
      WHERE module_key = ANY($1::text[])
        AND effective_to IS NULL
        AND effective_from <= CURRENT_DATE`,
    [moduleKeys]
  )

  const active = new Set(result.rows.map(row => row.module_key))
  const missing = moduleKeys.filter(key => !active.has(key))

  if (missing.length > 0) {
    throw new CommercialTermsValidationError(
      `bundledModules references modules that are not active in the client portal catalog: ${missing.join(', ')}.`
    )
  }
}

const assertDeclareInput = (input: DeclareCommercialTermsInput): {
  serviceId: string
  kind: EngagementCommercialTermsKind
  effectiveFrom: string
  monthlyAmountClp: number | null
  successCriteria: Record<string, unknown> | null
  bundledModules: string[]
  reason: string
  declaredBy: string
} => {
  const serviceId = input.serviceId.trim()
  const declaredBy = input.declaredBy.trim()
  const reason = input.reason.trim()
  const monthlyAmountClp = input.monthlyAmountClp ?? null
  const successCriteria = input.successCriteria ?? null

  if (!serviceId) throw new CommercialTermsValidationError('serviceId is required.')
  if (!declaredBy) throw new CommercialTermsValidationError('declaredBy is required.')
  if (!isTermsKind(input.kind)) throw new CommercialTermsValidationError('kind is not supported.')
  if (reason.length < 10) throw new CommercialTermsValidationError('reason must contain at least 10 characters.')

  if (monthlyAmountClp != null && (!Number.isFinite(monthlyAmountClp) || monthlyAmountClp < 0)) {
    throw new CommercialTermsValidationError('monthlyAmountClp must be a non-negative finite number.')
  }

  if (input.kind === 'no_cost' && monthlyAmountClp != null && monthlyAmountClp !== 0) {
    throw new CommercialTermsValidationError('no_cost terms cannot include a positive monthly amount.')
  }

  if (input.kind === 'success_fee' && (!successCriteria || Array.isArray(successCriteria))) {
    throw new CommercialTermsValidationError('success_fee terms require successCriteria as an object.')
  }

  return {
    serviceId,
    kind: input.kind,
    effectiveFrom: toIsoDateKey(input.effectiveFrom),
    monthlyAmountClp,
    successCriteria,
    bundledModules: normalizeBundledModules(input.bundledModules),
    reason,
    declaredBy
  }
}

const assertServiceEligible = async (client: PoolClient, serviceId: string): Promise<void> => {
  try {
    await assertEngagementServiceEligible(client, serviceId)
  } catch (error) {
    if (error instanceof ServiceNotEligibleForEngagementError) {
      throw new ServiceNotEligibleForCommercialTermsError(
        error.message.replace('engagement operations', 'commercial terms'),
        error.serviceId,
        error.reasonCode
      )
    }

    throw error
  }
}

const isUniqueConstraintError = (error: unknown): boolean => {
  const pgError = error as PgErrorLike

  return pgError?.code === '23505'
}

export const getActiveCommercialTerms = async (
  serviceId: string,
  atDate: Date | string = new Date()
): Promise<EngagementCommercialTerms | null> => {
  const normalizedServiceId = serviceId.trim()

  if (!normalizedServiceId) {
    throw new CommercialTermsValidationError('serviceId is required.')
  }

  const dateKey = toIsoDateKey(atDate)

  const rows = await query<TermsRow>(
    `SELECT t.*
     FROM greenhouse_commercial.engagement_commercial_terms t
     JOIN greenhouse_core.services s ON s.service_id = t.service_id
     WHERE t.service_id = $1
       AND t.effective_from <= $2::date
       AND (t.effective_to IS NULL OR t.effective_to > $2::date)
       AND ${buildEligibleServicePredicate('s')}
     ORDER BY t.effective_from DESC
     LIMIT 1`,
    [normalizedServiceId, dateKey]
  )

  return rows[0] ? normalizeTerms(rows[0]) : null
}

export const declareCommercialTerms = async (
  input: DeclareCommercialTermsInput
): Promise<DeclareCommercialTermsResult> => {
  const normalized = assertDeclareInput(input)

  try {
    return await withTransaction(async client => {
      await assertServiceEligible(client, normalized.serviceId)
      await assertBundledModulesActive(client, normalized.bundledModules)

      await client.query(
        `UPDATE greenhouse_commercial.engagement_commercial_terms
         SET effective_to = $2::date
         WHERE service_id = $1
           AND effective_to IS NULL`,
        [normalized.serviceId, normalized.effectiveFrom]
      )

      const inserted = await client.query<{ terms_id: string }>(
        `INSERT INTO greenhouse_commercial.engagement_commercial_terms (
           service_id, terms_kind, effective_from, monthly_amount_clp,
           success_criteria, declared_by, reason, bundled_modules
         ) VALUES (
           $1, $2, $3::date, $4, $5::jsonb, $6, $7, $8::text[]
         )
         RETURNING terms_id`,
        [
          normalized.serviceId,
          normalized.kind,
          normalized.effectiveFrom,
          normalized.monthlyAmountClp,
          normalized.successCriteria == null ? null : JSON.stringify(normalized.successCriteria),
          normalized.declaredBy,
          normalized.reason,
          normalized.bundledModules
        ]
      )

      const termsId = inserted.rows[0]?.terms_id

      if (!termsId) {
        throw new Error('Failed to declare commercial terms.')
      }

      await recordEngagementAuditEvent(
        {
          serviceId: normalized.serviceId,
          eventKind: 'declared',
          actorUserId: normalized.declaredBy,
          reason: normalized.reason,
          payload: {
            termsId,
            termsKind: normalized.kind,
            effectiveFrom: normalized.effectiveFrom,
            monthlyAmountClp: normalized.monthlyAmountClp,
            hasSuccessCriteria: normalized.successCriteria != null,
            bundledModules: normalized.bundledModules
          }
        },
        client
      )

      await publishEngagementEvent(
        {
          serviceId: normalized.serviceId,
          eventType: EVENT_TYPES.serviceEngagementDeclared,
          actorUserId: normalized.declaredBy,
          payload: {
            termsId,
            termsKind: normalized.kind,
            effectiveFrom: normalized.effectiveFrom
          }
        },
        client
      )

      return { termsId }
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new CommercialTermsConflictError(
        `Service ${normalized.serviceId} already has active commercial terms. Retry after refreshing state.`
      )
    }

    throw error
  }
}
