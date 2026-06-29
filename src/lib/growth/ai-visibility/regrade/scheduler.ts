import 'server-only'

/**
 * TASK-1270 — Recurring Share-of-Voice re-grade scheduler.
 *
 * Capa de cadencia sobre el run-engine existente: selecciona perfiles opt-in
 * due, respeta entitlement contratado, genera un run `full` idempotente por
 * ventana de cadencia y deja que el worker async normal ejecute el run.
 */

import { enqueueGraderDiagnostic } from '@/lib/growth/ai-visibility/commands'
import { AI_VISIBILITY_MODULE_KEY } from '@/lib/growth/ai-visibility/entitlement'
import {
  isRecurringRegradeEnabled,
  resolveRecurringRegradeConfig
} from '@/lib/growth/ai-visibility/flags'
import { resolveProviderPolicy } from '@/lib/growth/ai-visibility/policy'
import { captureWithDomain } from '@/lib/observability/capture'
import {
  runGreenhousePostgresQuery,
  withGreenhousePostgresTransaction
} from '@/lib/postgres/client'

export const RECURRING_REGRADE_IDEMPOTENCY_PREFIX = 'growth-ai-visibility-regrade'

export type RecurringRegradeCadence = 'weekly' | 'monthly'

export type RecurringRegradeSkipReason = 'disabled' | 'budget_exhausted' | 'no_due_profiles'

export interface RecurringRegradeAcceptedRun {
  profileId: string
  organizationId: string
  runId: string
  runPublicId: string
  idempotentHit: boolean
  cadence: RecurringRegradeCadence
  idempotencyKey: string
}

export interface HandleRecurringRegradeBatchResult {
  ok: true
  skipped?: RecurringRegradeSkipReason
  claimedProfiles: number
  enqueuedRuns: number
  failedProfiles: number
  idempotentHits: number
  budget: {
    monthToDateUsd: number
    monthlyBudgetUsd: number
    projectedCostCeilingUsd: number
    remainingSlots: number
  }
  runs: RecurringRegradeAcceptedRun[]
}

interface ClaimedProfile extends Record<string, unknown> {
  profile_id: string
  organization_id: string
  brand_name: string
  website_url: string | null
  market: string
  locale: string
  category: string | null
  competitors_declared: string[] | null
  recurring_regrade_cadence: RecurringRegradeCadence
  assignment_id: string
}

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10)

const startOfUtcWeek = (date: Date): Date => {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = copy.getUTCDay()
  const diffToMonday = day === 0 ? -6 : 1 - day

  copy.setUTCDate(copy.getUTCDate() + diffToMonday)

  return copy
}

const regradeWindowStart = (cadence: RecurringRegradeCadence, now: Date): string => {
  if (cadence === 'weekly') {
    return toIsoDate(startOfUtcWeek(now))
  }

  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`
}

export const buildRecurringRegradeIdempotencyKey = (input: {
  profileId: string
  cadence: RecurringRegradeCadence
  now?: Date
}): string =>
  [
    RECURRING_REGRADE_IDEMPOTENCY_PREFIX,
    input.profileId,
    input.cadence,
    regradeWindowStart(input.cadence, input.now ?? new Date())
  ].join(':')

const readMonthToDateRegradeCost = async (): Promise<number> => {
  const rows = await runGreenhousePostgresQuery<{ total: string | number | null }>(
    `SELECT COALESCE(SUM(estimated_cost_usd), 0) AS total
       FROM greenhouse_growth.grader_runs
      WHERE idempotency_key LIKE $1
        AND created_at >= date_trunc('month', CURRENT_DATE)`,
    [`${RECURRING_REGRADE_IDEMPOTENCY_PREFIX}:%`]
  )

  return Number(rows[0]?.total ?? 0)
}

const claimDueProfiles = async (limit: number): Promise<ClaimedProfile[]> =>
  withGreenhousePostgresTransaction(async client => {
    const result = await client.query<ClaimedProfile>(
      `WITH due AS (
         SELECT
           p.profile_id,
           p.organization_id,
           p.brand_name,
           p.website_url,
           p.market,
           p.locale,
           p.category,
           p.competitors_declared,
           p.recurring_regrade_cadence,
           a.assignment_id,
           CASE p.recurring_regrade_cadence
             WHEN 'weekly' THEN NOW() + INTERVAL '7 days'
             ELSE NOW() + INTERVAL '1 month'
           END AS next_at
         FROM greenhouse_growth.grader_profiles p
         JOIN greenhouse_client_portal.module_assignments a
           ON a.organization_id = p.organization_id
          AND a.module_key = $2
          AND a.status = 'active'
          AND a.effective_to IS NULL
          AND (a.expires_at IS NULL OR a.expires_at > NOW())
          AND a.metadata_json->>'aeo_tier' = 'contracted'
        WHERE p.status = 'active'
          AND p.organization_id IS NOT NULL
          AND p.recurring_regrade_enabled IS TRUE
          AND COALESCE(p.recurring_regrade_next_at, '-infinity'::timestamptz) <= NOW()
        ORDER BY p.recurring_regrade_next_at NULLS FIRST, p.created_at ASC
        FOR UPDATE OF p SKIP LOCKED
        LIMIT $1
       )
       UPDATE greenhouse_growth.grader_profiles p
          SET recurring_regrade_next_at = due.next_at
         FROM due
        WHERE p.profile_id = due.profile_id
        RETURNING
          due.profile_id,
          due.organization_id,
          due.brand_name,
          due.website_url,
          due.market,
          due.locale,
          due.category,
          due.competitors_declared,
          due.recurring_regrade_cadence,
          due.assignment_id`,
      [limit, AI_VISIBILITY_MODULE_KEY]
    )

    return result.rows
  })

const markProfileRegradeSuccess = async (input: {
  profileId: string
  runId: string
}): Promise<void> => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_growth.grader_profiles
        SET recurring_regrade_last_run_id = $2,
            recurring_regrade_last_at = NOW()
      WHERE profile_id = $1`,
    [input.profileId, input.runId]
  )
}

const markProfileRegradeFailure = async (profileId: string): Promise<void> => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_growth.grader_profiles
        SET recurring_regrade_next_at = NOW() + INTERVAL '1 day'
      WHERE profile_id = $1`,
    [profileId]
  )
}

export const handleRecurringRegradeBatch = async (
  options: { batchSize?: number; env?: NodeJS.ProcessEnv; now?: Date } = {}
): Promise<HandleRecurringRegradeBatchResult> => {
  const env = options.env ?? process.env
  const config = resolveRecurringRegradeConfig(env)
  const requestedBatchSize = Math.max(1, Math.min(50, Math.floor(options.batchSize ?? config.batchSize)))
  const fullPolicy = resolveProviderPolicy('full')
  const monthToDateUsd = await (isRecurringRegradeEnabled(env) ? readMonthToDateRegradeCost() : Promise.resolve(0))
  const remainingBudgetUsd = Math.max(0, config.monthlyBudgetUsd - monthToDateUsd)
  const remainingSlots = Math.floor(remainingBudgetUsd / fullPolicy.costCeilingUsdPerRun)

  const budget = {
    monthToDateUsd,
    monthlyBudgetUsd: config.monthlyBudgetUsd,
    projectedCostCeilingUsd: fullPolicy.costCeilingUsdPerRun,
    remainingSlots
  }

  if (!isRecurringRegradeEnabled(env)) {
    return {
      ok: true,
      skipped: 'disabled',
      claimedProfiles: 0,
      enqueuedRuns: 0,
      failedProfiles: 0,
      idempotentHits: 0,
      budget,
      runs: []
    }
  }

  if (remainingSlots <= 0) {
    return {
      ok: true,
      skipped: 'budget_exhausted',
      claimedProfiles: 0,
      enqueuedRuns: 0,
      failedProfiles: 0,
      idempotentHits: 0,
      budget,
      runs: []
    }
  }

  const claimed = await claimDueProfiles(Math.min(requestedBatchSize, remainingSlots))

  if (claimed.length === 0) {
    return {
      ok: true,
      skipped: 'no_due_profiles',
      claimedProfiles: 0,
      enqueuedRuns: 0,
      failedProfiles: 0,
      idempotentHits: 0,
      budget,
      runs: []
    }
  }

  const now = options.now ?? new Date()
  const runs: RecurringRegradeAcceptedRun[] = []
  let idempotentHits = 0
  let failedProfiles = 0

  for (const profile of claimed) {
    const idempotencyKey = buildRecurringRegradeIdempotencyKey({
      profileId: profile.profile_id,
      cadence: profile.recurring_regrade_cadence,
      now
    })

    try {
      const enqueue = await enqueueGraderDiagnostic({
        brandName: profile.brand_name,
        websiteUrl: profile.website_url,
        market: profile.market,
        locale: profile.locale,
        category: profile.category ?? '',
        competitorsDeclared: profile.competitors_declared ?? [],
        mode: 'full',
        runKind: 'public_diagnostic',
        idempotencyKey,
        attribution: {
          organizationId: profile.organization_id,
          assignmentId: profile.assignment_id,
          runSource: 'portal_contracted',
          costAttribution: 'client'
        }
      })

      if (enqueue.idempotentHit) {
        idempotentHits += 1
      }

      await markProfileRegradeSuccess({ profileId: profile.profile_id, runId: enqueue.run.runId })

      runs.push({
        profileId: profile.profile_id,
        organizationId: profile.organization_id,
        runId: enqueue.run.runId,
        runPublicId: enqueue.run.publicId,
        idempotentHit: enqueue.idempotentHit,
        cadence: profile.recurring_regrade_cadence,
        idempotencyKey
      })
    } catch (error) {
      captureWithDomain(error, 'growth', {
        tags: { source: 'growth_ai_visibility_recurring_regrade', reason: 'enqueue_failed' },
        extra: { profileId: profile.profile_id, organizationId: profile.organization_id }
      })

      failedProfiles += 1
      await markProfileRegradeFailure(profile.profile_id)
    }
  }

  return {
    ok: true,
    claimedProfiles: claimed.length,
    enqueuedRuns: runs.length,
    failedProfiles,
    idempotentHits,
    budget,
    runs
  }
}
