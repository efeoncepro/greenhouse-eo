import 'server-only'

import { can } from '@/lib/entitlements/runtime'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'
import { resolveGrowthMarket } from '@/lib/growth/markets'

import { readGraderReport } from '../report/command'
import { getGraderProfileForOrganization } from '../store'
import { GraderMarketConfigError } from './contracts'
import { listProfileMarkets, marketQueries } from './store'

const assertRead = (subject: TenantEntitlementSubject) => {
  if (
    subject.tenantType !== 'efeonce_internal' ||
    !can(subject, 'growth.ai_visibility.report.read_operator', 'read', 'tenant')
  )
    throw new GraderMarketConfigError('forbidden', 403)
}

export const readGraderMarkets = async (input: { subject: TenantEntitlementSubject; organizationId: string }) => {
  assertRead(input.subject)
  const profile = await getGraderProfileForOrganization(input.organizationId)

  if (!profile) throw new GraderMarketConfigError('aeo_profile_not_found', 404)

  const markets = await listProfileMarkets(profile.profileId)

  const profileRows = await marketQueries()(
    `SELECT brand_aliases FROM greenhouse_growth.grader_profiles WHERE profile_id=$1`,
    [profile.profileId]
  )

  const sets = await marketQueries()(
    `SELECT s.* FROM greenhouse_growth.grader_competitor_sets s JOIN greenhouse_growth.grader_profile_markets m USING(market_id) WHERE m.profile_id=$1 AND s.status='active'`,
    [profile.profileId]
  )

  return {
    profileId: profile.profileId,
    brandAliases: profileRows[0]?.brand_aliases ?? [],
    markets: markets.map(market => ({
      ...market,
      label: resolveGrowthMarket(market.marketCode, market.locale).label,
      competitors: sets.find(set => set.market_id === market.marketId)?.members_json ?? [],
      competitorSetVersion: sets.find(set => set.market_id === market.marketId)?.version ?? null
    })),
    signals: markets.some(market => market.isPrimary && market.status === 'active') ? [] : ['market_primary_missing']
  }
}

export const readGraderRunBatch = async (input: {
  subject: TenantEntitlementSubject
  organizationId: string
  batchRef: string
}) => {
  assertRead(input.subject)

  const batches = await marketQueries()(
    `SELECT b.* FROM greenhouse_growth.grader_run_batches b JOIN greenhouse_growth.grader_profiles p USING(profile_id)
    WHERE p.organization_id=$1 AND (b.batch_id=$2 OR b.public_id=$2)`,
    [input.organizationId, input.batchRef]
  )

  if (!batches[0]) throw new GraderMarketConfigError('aeo_batch_not_found', 404)

  const runs = await marketQueries()(
    `SELECT run_id,public_id,market_id,market_code,locale,status,estimated_cost_usd FROM greenhouse_growth.grader_runs WHERE batch_id=$1 ORDER BY market_code,locale`,
    [batches[0].batch_id]
  )

  const pending = runs.some(run => ['pending', 'running'].includes(String(run.status)))
  const succeeded = runs.every(run => run.status === 'succeeded')
  const hasData = runs.some(run => ['succeeded', 'partial'].includes(String(run.status)))
  const status = pending ? 'running' : succeeded ? 'succeeded' : hasData ? 'partial' : 'failed'

  return {
    batchId: String(batches[0].batch_id),
    publicId: String(batches[0].public_id),
    status,
    runs,
    signal: status === 'partial' ? 'run_batch_partial' : null
  }
}

export const readGraderMarketMatrix = async (input: {
  subject: TenantEntitlementSubject
  organizationId: string
  markets?: string[]
}) => {
  const configured = await readGraderMarkets(input)
  const markets = configured.markets.filter(market => !input.markets || input.markets.includes(market.marketId))

  if (input.markets?.some(id => !configured.markets.some(market => market.marketId === id)))
    throw new GraderMarketConfigError('aeo_market_not_configured')

  const rows = []

  for (const market of markets) {
    const runs = await marketQueries()(
      `SELECT run_id,provider_policy_version,competitor_set_id,matching_snapshot FROM greenhouse_growth.grader_runs r
      WHERE market_id=$1 AND status IN ('succeeded','partial')
        AND EXISTS (SELECT 1 FROM greenhouse_growth.grader_scores s WHERE s.run_id=r.run_id) ORDER BY finished_at DESC NULLS LAST,created_at DESC LIMIT 1`,
      [market.marketId]
    )

    const latest = runs[0]

    // A missing persisted score is an explicit unavailable cell, never zero.
    const scores = latest
      ? await marketQueries()(`SELECT 1 FROM greenhouse_growth.grader_scores WHERE run_id=$1 LIMIT 1`, [latest.run_id])
      : []

    const report =
      latest && scores.length ? (await readGraderReport({ runId: String(latest.run_id) })).publicReport : null

    rows.push({
      market,
      runId: latest?.run_id ?? null,
      report,
      methodology: report
        ? {
            scoreVersion: report.provenance.scoreVersion,
            promptPackVersion: report.provenance.promptPackVersion,
            providerPolicyVersion: latest?.provider_policy_version,
            competitorSetId: latest?.competitor_set_id
          }
        : null
    })
  }

  const versions = new Set(rows.filter(row => row.report).map(row => row.report!.provenance.scoreVersion))

  return {
    organizationId: input.organizationId,
    rows,
    scoreVersionsComparable: versions.size <= 1,
    blendedOverall: null,
    signals: configured.signals
  }
}
