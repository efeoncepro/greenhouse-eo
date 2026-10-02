import 'server-only'

import { withTransaction } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import { can } from '@/lib/entitlements/runtime'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { resolveAeoBudget } from '../budget'
import { enqueueGraderDiagnostic } from '../commands'
import type { GrowthAiVisibilityExecutionMode } from '../contracts'
import { resolveAeoEntitlement } from '../entitlement'
import {
  isAeoBudgetGateEnabled,
  isGraderEnabled,
  isMultiMarketEnabled,
  isPortalRunEnabled,
  isTrialTierEnabled,
  resolveRecurringRegradeConfig,
  resolveAeoAllowanceConfig
} from '../flags'
import { sha256Hex } from '../observation'
import { getOrganizationCommercialFacts } from '../operator/organization-commercial-facts'
import { assertSubjectGradeable } from '../operator/subject-gradeable'
import { resolveProviderPolicy } from '../policy'
import { getGraderProfileForOrganization, projectRun, type GraderRunRow } from '../store'
import { GraderMarketConfigError } from './contracts'
import { ensurePrimaryMarket, listProfileMarkets, marketQueries, snapshotMarket } from './store'

export interface RunBatchInput {
  organizationId: string
  markets: 'primary' | 'all_active' | string[]
  mode: GrowthAiVisibilityExecutionMode
  actor: string
  channel: 'operator' | 'portal' | 'recurring'
  idempotencyKey: string
  env?: NodeJS.ProcessEnv
}
export interface RunBatchResult {
  batchId: string
  publicId: string
  runs: GraderRunRow[]
  idempotentHit: boolean
  tier: 'operator' | 'contracted' | 'pilot' | 'trial'
  allowanceRemaining: number | null
}

/** Existing portal/operator chokepoints pass server-resolved org and actor. Never expose directly in a route. */
export const requestRunBatchInternal = async (input: RunBatchInput): Promise<RunBatchResult> => {
  const env = input.env ?? process.env

  if (!input.actor.trim() || !input.idempotencyKey.trim() || input.idempotencyKey.length > 200)
    throw new GraderMarketConfigError('aeo_batch_invalid', 400)
  if (!isGraderEnabled(env) || (input.channel === 'portal' && !isPortalRunEnabled(env)))
    throw new GraderMarketConfigError('disabled')

  const profile = await getGraderProfileForOrganization(input.organizationId)

  if (!profile) throw new GraderMarketConfigError('profile_required')

  const facts = await getOrganizationCommercialFacts(input.organizationId)

  const gradeable = assertSubjectGradeable({
    categoryNodeId: profile.categoryNodeId,
    categoryLabel: profile.categoryLabel,
    categoryConfidence: profile.categoryConfidence,
    rawCategory: profile.category,
    businessModel: profile.businessModel,
    audience: facts?.isClient ? 'client' : 'prospect'
  })

  if (!gradeable.ok) throw new GraderMarketConfigError(gradeable.reason)

  return withTransaction(async client => {
    // All paid batch reservations serialize before profile locks; no N-way allowance overspend.
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('growth.ai_visibility.batch-budget'))`)
    const primary = await ensurePrimaryMarket(profile, client)
    const available = (await listProfileMarkets(profile.profileId, client)).filter(market => market.status === 'active')

    const requestedIds =
      input.markets === 'primary'
        ? [primary.marketId]
        : input.markets === 'all_active'
          ? available.map(market => market.marketId)
          : input.markets

    if (!Array.isArray(requestedIds) || !requestedIds.length || new Set(requestedIds).size !== requestedIds.length)
      throw new GraderMarketConfigError('aeo_batch_invalid', 400)

    const markets = requestedIds.map(id => available.find(market => market.marketId === id))

    if (markets.some(market => !market)) throw new GraderMarketConfigError('aeo_market_not_configured')
    if ((markets.length > 1 || markets.some(market => !market!.isPrimary)) && !isMultiMarketEnabled(env))
      throw new GraderMarketConfigError('aeo_multi_market_disabled')

    const entitlement = await resolveAeoEntitlement(input.organizationId, env)

    if (input.channel !== 'operator' && (!entitlement.hasModule || !entitlement.tier || !entitlement.assignmentId))
      throw new GraderMarketConfigError('not_entitled', 403)
    if (input.channel !== 'operator' && entitlement.tier === 'trial' && !isTrialTierEnabled(env))
      throw new GraderMarketConfigError('disabled')

    // Match method, selection and actor as well as the org-scoped key. Changed payload cannot reuse a billable request.
    const requestHash = sha256Hex(
      JSON.stringify({
        mode: input.mode,
        channel: input.channel,
        actor: input.actor,
        markets: [...requestedIds].sort()
      })
    )

    const existing = await marketQueries(client)(
      `SELECT * FROM greenhouse_growth.grader_run_batches WHERE profile_id=$1 AND idempotency_key=$2`,
      [profile.profileId, input.idempotencyKey]
    )

    if (existing[0]) {
      if (existing[0].request_hash !== requestHash) throw new GraderMarketConfigError('aeo_idempotency_conflict')

      const rows = await marketQueries(client)(
        `SELECT * FROM greenhouse_growth.grader_runs WHERE batch_id=$1 ORDER BY market_id`,
        [existing[0].batch_id]
      )

      return {
        batchId: String(existing[0].batch_id),
        publicId: String(existing[0].public_id),
        runs: rows.map(projectRun),
        idempotentHit: true,
        tier: input.channel !== 'operator' ? entitlement.tier! : 'operator',
        allowanceRemaining: input.channel !== 'operator' ? entitlement.allowanceRemaining : null
      }
    }

    if (input.channel !== 'operator' && entitlement.blockedReason === 'quota_exhausted')
      throw new GraderMarketConfigError('quota_exhausted')
    if (input.channel !== 'operator' && entitlement.blockedReason === 'trial_budget_exhausted')
      throw new GraderMarketConfigError('cost_blocked')

    const ceiling = resolveProviderPolicy(input.mode).costCeilingUsdPerRun
    const total = ceiling * markets.length

    const usedRows = await marketQueries(client)(
      `SELECT
      count(*) FILTER (WHERE run_source LIKE 'portal_%')::int AS used,
      COALESCE(sum(GREATEST(COALESCE(cost_ceiling_usd,0)-estimated_cost_usd,0)) FILTER (WHERE status IN ('pending','running')),0)::float8 AS reserved
      FROM greenhouse_growth.grader_runs WHERE organization_id=$1 AND created_at>=date_trunc('month',CURRENT_DATE)`,
      [input.organizationId]
    )

    const used = Number(usedRows[0]?.used ?? 0)

    if (input.channel !== 'operator') {
      const assignments = await marketQueries(client)(
        `SELECT metadata_json FROM greenhouse_client_portal.module_assignments
        WHERE assignment_id=$1 AND effective_to IS NULL AND status IN ('active','pilot') AND (expires_at IS NULL OR expires_at>now()) FOR UPDATE`,
        [entitlement.assignmentId]
      )

      if (!assignments[0]) throw new GraderMarketConfigError('not_entitled', 403)
      const metadata = assignments[0].metadata_json as Record<string, unknown> | null
      const included = metadata?.aeo_markets_included

      const explicit = Array.isArray(included)
        ? included.filter((value): value is string => typeof value === 'string')
        : null

      if (
        markets.some(
          market => !market!.isPrimary && !(entitlement.tier === 'contracted' && explicit?.includes(market!.marketCode))
        )
      )
        throw new GraderMarketConfigError('aeo_market_not_included', 403)
      if (used + markets.length > entitlement.allowanceCap) throw new GraderMarketConfigError('quota_exhausted')

      if (entitlement.tier === 'trial') {
        const trial = await marketQueries(client)(
          `SELECT COALESCE(sum(COALESCE(cost_ceiling_usd,0)),0)::float8 AS reserved FROM greenhouse_growth.grader_runs WHERE run_source='portal_trial' AND created_at>=date_trunc('month',CURRENT_DATE)`
        )

        if (Number(trial[0].reserved) + total > resolveAeoAllowanceConfig(env).trialGlobalMonthlyBudgetUsd)
          throw new GraderMarketConfigError('cost_blocked')
      }
    }

    if (input.channel !== 'operator' && isAeoBudgetGateEnabled(env)) {
      const budget = await resolveAeoBudget(input.organizationId, env)
      const wouldBlock = budget.wouldBlock || Number(usedRows[0]?.reserved ?? 0) + total > budget.budgetRemainingUsd

      if (wouldBlock) {
        captureWithDomain(new Error('growth ai-visibility budget would block batch'), 'growth', {
          level: 'warning',
          tags: { source: 'aeo_budget_gate', enforced: String(budget.enforced) },
          extra: {
            organizationId: input.organizationId,
            markets: markets.length,
            reservedCeilingUsd: total,
            budgetCapUsd: budget.budgetCapUsd
          }
        })
        if (budget.enforced) throw new GraderMarketConfigError('budget_exhausted')
      }
    }

    if (input.channel === 'recurring') {
      const reserved = await marketQueries(client)(
        `SELECT COALESCE(SUM(CASE WHEN status IN ('pending','running') THEN GREATEST(COALESCE(cost_ceiling_usd,0),estimated_cost_usd) ELSE estimated_cost_usd END),0)::float8 AS reserved
         FROM greenhouse_growth.grader_runs WHERE created_at>=date_trunc('month',CURRENT_DATE)
         AND (idempotency_key LIKE 'growth-ai-visibility-regrade:%' OR batch_id IN
           (SELECT batch_id FROM greenhouse_growth.grader_run_batches WHERE request_channel='recurring'))`
      )

      if (Number(reserved[0]?.reserved ?? 0) + total > resolveRecurringRegradeConfig(env).monthlyBudgetUsd)
        throw new GraderMarketConfigError('budget_exhausted')
    }

    const daily = await marketQueries(client)(
      `SELECT COALESCE(sum(cost_ceiling_total_usd),0)::float8 AS reserved FROM greenhouse_growth.grader_run_batches WHERE created_at >= date_trunc('day',CURRENT_TIMESTAMP AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`
    )

    const dailyLimit = Number(env.GROWTH_AI_VISIBILITY_BATCH_DAILY_BUDGET_USD ?? 25)

    if (!Number.isFinite(dailyLimit) || dailyLimit <= 0 || Number(daily[0].reserved) + total > dailyLimit)
      throw new GraderMarketConfigError('cost_blocked')

    const batches = await marketQueries(client)(
      `INSERT INTO greenhouse_growth.grader_run_batches(profile_id,organization_id,market_ids,mode,requested_by_user_id,request_channel,idempotency_key,request_hash,cost_ceiling_total_usd)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        profile.profileId,
        input.organizationId,
        requestedIds,
        input.mode,
        input.actor,
        input.channel,
        input.idempotencyKey,
        requestHash,
        total
      ]
    )

    const batch = batches[0]
    const runs: GraderRunRow[] = []

    for (const selected of markets) {
      const market = selected!
      const snapshot = await snapshotMarket(profile, market, resolveProviderPolicy(input.mode).policyVersion, client)

      const enqueued = await enqueueGraderDiagnostic({
        profileId: profile.profileId,
        marketId: market.marketId,
        batchId: String(batch.batch_id),
        transaction: client,
        brandName: profile.brandName,
        websiteUrl: profile.websiteUrl,
        market: market.marketCode,
        locale: market.locale,
        category: profile.category ?? '',
        categoryNodeId: profile.categoryNodeId,
        categoryLabel: profile.categoryLabel,
        categoryConfidence: profile.categoryConfidence,
        businessModel: profile.businessModel,
        competitorsDeclared: snapshot.competitors.map(member => member.name),
        mode: input.mode,
        runKind: 'public_diagnostic',
        idempotencyKey: `${batch.batch_id}:${market.marketId}`,
        attribution: {
          organizationId: input.organizationId,
          assignmentId: entitlement.assignmentId,
          runSource:
            input.channel === 'operator'
              ? 'operator_sales'
              : entitlement.tier === 'contracted'
                ? 'portal_contracted'
                : entitlement.tier === 'pilot'
                  ? 'portal_pilot'
                  : 'portal_trial',
          costAttribution: input.channel === 'operator' ? 'sales' : 'client'
        }
      })

      runs.push(enqueued.run)
      await publishOutboxEvent(
        {
          aggregateType: 'growth_ai_visibility_run',
          aggregateId: enqueued.run.runId,
          eventType: 'growth.ai_visibility.run.requested',
          payload: {
            runId: enqueued.run.runId,
            organizationId: input.organizationId,
            assignmentId: entitlement.assignmentId,
            tier: input.channel === 'operator' ? 'operator' : entitlement.tier,
            runSource: enqueued.run.runSource,
            costAttribution: enqueued.run.costAttribution,
            requestedBy: input.actor,
            idempotentHit: false
          }
        },
        client
      )
    }

    await publishOutboxEvent(
      {
        aggregateType: 'growth_ai_visibility_run_batch',
        aggregateId: String(batch.batch_id),
        eventType: 'growth.ai_visibility.run_batch.requested',
        payload: {
          version: 1,
          batchId: batch.batch_id,
          organizationId: input.organizationId,
          marketIds: requestedIds,
          runIds: runs.map(run => run.runId),
          actor: input.actor
        }
      },
      client
    )

    return {
      batchId: String(batch.batch_id),
      publicId: String(batch.public_id),
      runs,
      idempotentHit: false,
      tier: input.channel !== 'operator' ? entitlement.tier! : 'operator',
      allowanceRemaining: input.channel !== 'operator' ? entitlement.allowanceCap - used - runs.length : null
    }
  })
}

/** Cross-organization operator API. Portal uses its existing, tenant-resolved chokepoint. */
export const requestGraderRunBatch = (input: RunBatchInput & { subject: TenantEntitlementSubject }) => {
  if (
    input.channel !== 'operator' ||
    input.subject.tenantType !== 'efeonce_internal' ||
    input.actor !== input.subject.userId ||
    !can(input.subject, 'growth.ai_visibility.run.operator', 'execute', 'tenant')
  )
    throw new GraderMarketConfigError('forbidden', 403)

  return requestRunBatchInternal(input)
}
