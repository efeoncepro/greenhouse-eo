import 'server-only'

/**
 * TASK-1270 — Recurring Share-of-Voice re-grade scheduler.
 *
 * Capa de cadencia sobre el run-engine existente: selecciona perfiles opt-in
 * due, respeta entitlement contratado, genera un run `full` idempotente por
 * ventana de cadencia y deja que el worker async normal ejecute el run.
 */

import { requestRunBatchInternal } from '@/lib/growth/ai-visibility/markets/run-batch'
import { AI_VISIBILITY_MODULE_KEY } from '@/lib/growth/ai-visibility/entitlement'
import {
  isMultiMarketEnabled,
  isRecurringRegradeEnabled,
  resolveRecurringRegradeConfig
} from '@/lib/growth/ai-visibility/flags'
import { resolveProviderPolicy } from '@/lib/growth/ai-visibility/policy'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'

export const RECURRING_REGRADE_IDEMPOTENCY_PREFIX = 'growth-ai-visibility-regrade'

export type RecurringRegradeCadence = 'weekly' | 'monthly' | 'quarterly'

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
  market_id?: string
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

  const month = cadence === 'quarterly' ? Math.floor(now.getUTCMonth() / 3) * 3 + 1 : now.getUTCMonth() + 1

  return `${now.getUTCFullYear()}-${String(month).padStart(2, '0')}-01`
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
    `SELECT COALESCE(SUM(CASE WHEN status IN ('pending','running') THEN GREATEST(COALESCE(cost_ceiling_usd,0),estimated_cost_usd) ELSE estimated_cost_usd END), 0) AS total
       FROM greenhouse_growth.grader_runs
      WHERE (idempotency_key LIKE $1 OR batch_id IN (SELECT batch_id FROM greenhouse_growth.grader_run_batches WHERE idempotency_key LIKE $1))
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
             WHEN 'quarterly' THEN NOW() + INTERVAL '3 months'
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

const claimDueMarkets = async (limit: number): Promise<ClaimedProfile[]> =>
  withGreenhousePostgresTransaction(async client => {
    const rows = await client.query<ClaimedProfile>(
      `WITH due AS (
    SELECT m.market_id,p.profile_id,p.organization_id,p.brand_name,p.website_url,m.market_code AS market,m.locale,p.category,
      p.competitors_declared,m.recurring_regrade_cadence,a.assignment_id,
      CASE m.recurring_regrade_cadence WHEN 'weekly' THEN now()+INTERVAL '7 days' WHEN 'quarterly' THEN now()+INTERVAL '3 months' ELSE now()+INTERVAL '1 month' END AS next_at
    FROM greenhouse_growth.grader_profile_markets m
    JOIN greenhouse_growth.grader_profiles p ON p.profile_id=m.profile_id
    JOIN greenhouse_client_portal.module_assignments a ON a.organization_id=p.organization_id
      AND a.module_key=$2 AND a.status='active' AND a.effective_to IS NULL AND (a.expires_at IS NULL OR a.expires_at>now())
      AND a.metadata_json->>'aeo_tier'='contracted'
    WHERE m.status='active' AND p.status='active' AND m.recurring_regrade_enabled
      AND COALESCE(m.recurring_regrade_next_at,'-infinity'::timestamptz)<=now()
    ORDER BY m.recurring_regrade_next_at NULLS FIRST,m.created_at FOR UPDATE OF m SKIP LOCKED LIMIT $1
  ) UPDATE greenhouse_growth.grader_profile_markets m SET recurring_regrade_next_at=due.next_at
    FROM due WHERE m.market_id=due.market_id RETURNING due.*`,
      [limit, AI_VISIBILITY_MODULE_KEY]
    )

    await client.query(
      `UPDATE greenhouse_growth.grader_profiles p SET recurring_regrade_next_at=m.recurring_regrade_next_at
    FROM greenhouse_growth.grader_profile_markets m WHERE p.profile_id=m.profile_id AND m.is_primary AND m.market_id=ANY($1::text[])`,
      [rows.rows.map(row => row.market_id)]
    )

    return rows.rows
  })

const markProfileRegradeSuccess = async (input: { profileId: string; runId: string }): Promise<void> => {
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

  const claimed = await (isMultiMarketEnabled(env) ? claimDueMarkets : claimDueProfiles)(
    Math.min(requestedBatchSize, remainingSlots)
  )

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
      profileId: profile.market_id ?? profile.profile_id,
      cadence: profile.recurring_regrade_cadence,
      now
    })

    try {
      const batch = await requestRunBatchInternal({
        organizationId: profile.organization_id,
        markets: profile.market_id ? [profile.market_id] : 'primary',
        mode: 'full',
        actor: 'system:recurring-regrade',
        channel: 'recurring',
        idempotencyKey,
        env
      })

      const enqueue = { run: batch.runs[0], idempotentHit: batch.idempotentHit }

      if (enqueue.idempotentHit) {
        idempotentHits += 1
      }

      if (profile.market_id) {
        await runGreenhousePostgresQuery(
          `UPDATE greenhouse_growth.grader_profile_markets SET recurring_regrade_last_run_id=$2,recurring_regrade_last_at=now() WHERE market_id=$1`,
          [profile.market_id, enqueue.run.runId]
        )
        await runGreenhousePostgresQuery(
          `UPDATE greenhouse_growth.grader_profiles p SET recurring_regrade_last_run_id=m.recurring_regrade_last_run_id,recurring_regrade_last_at=m.recurring_regrade_last_at
          FROM greenhouse_growth.grader_profile_markets m WHERE p.profile_id=m.profile_id AND m.is_primary AND m.market_id=$1`,
          [profile.market_id]
        )
      } else {
        await markProfileRegradeSuccess({ profileId: profile.profile_id, runId: enqueue.run.runId })
      }

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

      if (profile.market_id) {
        await runGreenhousePostgresQuery(
          `UPDATE greenhouse_growth.grader_profile_markets SET recurring_regrade_next_at=now()+INTERVAL '1 day' WHERE market_id=$1`,
          [profile.market_id]
        )
        await runGreenhousePostgresQuery(
          `UPDATE greenhouse_growth.grader_profiles p SET recurring_regrade_next_at=m.recurring_regrade_next_at
          FROM greenhouse_growth.grader_profile_markets m WHERE p.profile_id=m.profile_id AND m.is_primary AND m.market_id=$1`,
          [profile.market_id]
        )
      } else {
        await markProfileRegradeFailure(profile.profile_id)
      }
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
