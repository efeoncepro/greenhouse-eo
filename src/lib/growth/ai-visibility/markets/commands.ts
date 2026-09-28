import 'server-only'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'
import { can } from '@/lib/entitlements/runtime'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'
import { resolveGrowthMarket } from '@/lib/growth/markets'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { isMultiMarketEnabled } from '../flags'
import { getGraderProfileForOrganization } from '../store'
import {
  type BrandAlias,
  type MatchMode,
  GraderMarketConfigError,
  validateAliases,
  validateCompetitors
} from './contracts'
import {
  ensurePrimaryMarket,
  insertCompetitorSet,
  listProfileMarkets,
  lockGraderProfile,
  marketQueries,
  projectMarket
} from './store'

export interface MarketActor {
  subject: TenantEntitlementSubject
  actor: string
}

const authorize = (input: MarketActor) => {
  if (
    input.actor !== input.subject.userId ||
    input.subject.tenantType !== 'efeonce_internal' ||
    !can(input.subject, 'growth.ai_visibility.market.manage', 'execute', 'tenant')
  ) {
    throw new GraderMarketConfigError('forbidden', 403)
  }
}

const audit = (
  client: PoolClient,
  profileId: string,
  actor: string,
  action: string,
  details: Record<string, unknown>
) =>
  publishOutboxEvent(
    {
      aggregateType: 'growth_ai_visibility_profile',
      aggregateId: profileId,
      eventType: 'growth.ai_visibility.market_configured',
      payload: { version: 1, profileId, actor, action, ...details }
    },
    client
  )

export const addGraderMarket = async (
  input: MarketActor & { organizationId: string; marketCode: string; locale?: string; env?: NodeJS.ProcessEnv }
) => {
  authorize(input)
  const resolved = resolveGrowthMarket(input.marketCode, input.locale)
  const profile = await getGraderProfileForOrganization(input.organizationId)

  if (!profile) throw new GraderMarketConfigError('aeo_profile_not_found', 404)

  return withTransaction(async client => {
    await ensurePrimaryMarket(profile, client)
    const markets = await listProfileMarkets(profile.profileId, client)
    const existing = markets.find(market => market.marketCode === resolved.code && market.locale === resolved.locale)

    if (existing) return existing
    if (markets.length && !isMultiMarketEnabled(input.env))
      throw new GraderMarketConfigError('aeo_multi_market_disabled')

    const rows = await marketQueries(client)(
      `INSERT INTO greenhouse_growth.grader_profile_markets(profile_id,market_code,locale,is_primary,created_by)
      VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [profile.profileId, resolved.code, resolved.locale, !markets.length, input.actor]
    )

    const market = projectMarket(rows[0])

    await insertCompetitorSet(market.marketId, [], input.actor, 'market_created', client)
    await audit(client, profile.profileId, input.actor, 'added', { marketId: market.marketId })

    return market
  })
}

const withMarket = async <T>(
  input: MarketActor & { marketId: string },
  work: (client: PoolClient, market: ReturnType<typeof projectMarket>) => Promise<T>
) => {
  authorize(input)

  return withTransaction(async client => {
    const rows = await marketQueries(client)(
      `SELECT * FROM greenhouse_growth.grader_profile_markets WHERE market_id=$1`,
      [input.marketId]
    )

    if (!rows[0]) throw new GraderMarketConfigError('aeo_market_not_configured', 404)

    await lockGraderProfile(String(rows[0].profile_id), client)

    const fresh = await marketQueries(client)(
      `SELECT * FROM greenhouse_growth.grader_profile_markets WHERE market_id=$1`,
      [input.marketId]
    )

    return work(client, projectMarket(fresh[0]))
  })
}

export const setGraderPrimaryMarket = async (input: MarketActor & { marketId: string }) =>
  withMarket(input, async (client, market) => {
    if (market.status !== 'active') throw new GraderMarketConfigError('aeo_market_not_active')
    if (market.isPrimary) return market

    await client.query(
      `UPDATE greenhouse_growth.grader_profile_markets SET is_primary=false WHERE profile_id=$1 AND is_primary`,
      [market.profileId]
    )
    await client.query(`UPDATE greenhouse_growth.grader_profile_markets SET is_primary=true WHERE market_id=$1`, [
      market.marketId
    ])
    // Legacy fields remain a primary mirror for old consumers throughout the additive rollout.
    await client.query(
      `UPDATE greenhouse_growth.grader_profiles p SET market=m.market_code,locale=m.locale,
    competitors_declared=ARRAY(SELECT member->>'name' FROM greenhouse_growth.grader_competitor_sets s,
      jsonb_array_elements(s.members_json) member WHERE s.market_id=m.market_id AND s.status='active'),
    recurring_regrade_enabled=m.recurring_regrade_enabled,recurring_regrade_cadence=m.recurring_regrade_cadence,
    recurring_regrade_next_at=m.recurring_regrade_next_at,recurring_regrade_last_run_id=m.recurring_regrade_last_run_id,
    recurring_regrade_last_at=m.recurring_regrade_last_at
    FROM greenhouse_growth.grader_profile_markets m WHERE p.profile_id=$1 AND m.market_id=$2`,
      [market.profileId, market.marketId]
    )
    await audit(client, market.profileId, input.actor, 'primary_changed', { marketId: market.marketId })

    return { ...market, isPrimary: true }
  })

const setMarketStatus = (input: MarketActor & { marketId: string }, status: 'paused' | 'archived') =>
  withMarket(input, async (client, market) => {
    if (market.isPrimary) throw new GraderMarketConfigError('aeo_primary_market_required')
    if (market.status === status) return market
    if (market.status === 'archived') throw new GraderMarketConfigError('aeo_market_archived')

    await client.query(
      `UPDATE greenhouse_growth.grader_profile_markets SET status=$2,recurring_regrade_enabled=false WHERE market_id=$1`,
      [market.marketId, status]
    )
    await audit(client, market.profileId, input.actor, status, { marketId: market.marketId })

    return { ...market, status, recurringRegradeEnabled: false }
  })

export const pauseGraderMarket = (input: MarketActor & { marketId: string }) => setMarketStatus(input, 'paused')
export const archiveGraderMarket = (input: MarketActor & { marketId: string }) => setMarketStatus(input, 'archived')

export const setGraderMarketCompetitors = (
  input: MarketActor & {
    marketId: string
    competitors: Array<{ name: string; aliases?: BrandAlias[]; matchMode?: MatchMode }>
    reason: string
  }
) => {
  authorize(input)
  const members = validateCompetitors(input.competitors)

  if (!input.reason?.trim()) throw new GraderMarketConfigError('aeo_reason_required', 400)

  return withMarket(input, async (client, market) => {
    if (market.status === 'archived') throw new GraderMarketConfigError('aeo_market_archived')

    const previous = await marketQueries(client)(
      `SELECT competitor_set_id FROM greenhouse_growth.grader_competitor_sets WHERE market_id=$1 AND status='active'`,
      [market.marketId]
    )

    const set = await insertCompetitorSet(market.marketId, members, input.actor, input.reason, client)

    if (set.competitor_set_id !== previous[0]?.competitor_set_id) {
      if (market.isPrimary)
        await client.query(`UPDATE greenhouse_growth.grader_profiles SET competitors_declared=$2 WHERE profile_id=$1`, [
          market.profileId,
          members.map(member => member.name)
        ])
      await audit(client, market.profileId, input.actor, 'competitors_changed', {
        marketId: market.marketId,
        competitorSetId: set.competitor_set_id
      })
    }

    return { competitorSetId: String(set.competitor_set_id), version: Number(set.version), members }
  })
}

export const setGraderBrandAliases = async (
  input: MarketActor & { profileId: string; aliases: BrandAlias[]; reason: string }
) => {
  authorize(input)
  const aliases = validateAliases(input.aliases)

  if (!input.reason?.trim()) throw new GraderMarketConfigError('aeo_reason_required', 400)

  return withTransaction(async client => {
    await lockGraderProfile(input.profileId, client)

    const identical = await marketQueries(client)(
      `SELECT 1 FROM greenhouse_growth.grader_profiles WHERE profile_id=$1 AND brand_aliases=$2::jsonb`,
      [input.profileId, JSON.stringify(aliases)]
    )

    if (identical.length) return { changed: false, aliases }

    await client.query(`UPDATE greenhouse_growth.grader_profiles SET brand_aliases=$2::jsonb WHERE profile_id=$1`, [
      input.profileId,
      JSON.stringify(aliases)
    ])
    await client.query(
      `INSERT INTO greenhouse_growth.grader_brand_alias_history(profile_id,aliases_json,created_by,reason) VALUES ($1,$2::jsonb,$3,$4)`,
      [input.profileId, JSON.stringify(aliases), input.actor, input.reason]
    )
    await audit(client, input.profileId, input.actor, 'aliases_changed', {})

    return { changed: true, aliases }
  })
}

export const configureGraderMarketRegrade = (
  input: MarketActor & { marketId: string; enabled: boolean; cadence: 'weekly' | 'monthly' | 'quarterly' }
) =>
  withMarket(input, async (client, market) => {
    if (market.status !== 'active') throw new GraderMarketConfigError('aeo_market_not_active')
    if (!['weekly', 'monthly', 'quarterly'].includes(input.cadence))
      throw new GraderMarketConfigError('aeo_batch_invalid', 400)
    if (!market.isPrimary && !isMultiMarketEnabled()) throw new GraderMarketConfigError('aeo_multi_market_disabled')
    await client.query(
      `UPDATE greenhouse_growth.grader_profile_markets SET recurring_regrade_enabled=$2,recurring_regrade_cadence=$3,
      recurring_regrade_next_at=CASE WHEN $2 THEN COALESCE(recurring_regrade_next_at,now()) ELSE NULL END WHERE market_id=$1`,
      [market.marketId, input.enabled, input.cadence]
    )
    if (market.isPrimary)
      await client.query(
        `UPDATE greenhouse_growth.grader_profiles SET recurring_regrade_enabled=$2,recurring_regrade_cadence=$3,
      recurring_regrade_next_at=CASE WHEN $2 THEN COALESCE(recurring_regrade_next_at,now()) ELSE NULL END WHERE profile_id=$1`,
        [market.profileId, input.enabled, input.cadence]
      )
    await audit(client, market.profileId, input.actor, 'cadence_changed', {
      marketId: market.marketId,
      enabled: input.enabled,
      cadence: input.cadence
    })

    return { marketId: market.marketId, enabled: input.enabled, cadence: input.cadence }
  })

export const resumeGraderMarket = (input: MarketActor & { marketId: string }) =>
  withMarket(input, async (client, market) => {
    if (market.status === 'archived') throw new GraderMarketConfigError('aeo_market_archived')
    if (market.status === 'active') return market
    if (!isMultiMarketEnabled()) throw new GraderMarketConfigError('aeo_multi_market_disabled')
    await client.query(`UPDATE greenhouse_growth.grader_profile_markets SET status='active' WHERE market_id=$1`, [
      market.marketId
    ])
    await audit(client, market.profileId, input.actor, 'resumed', { marketId: market.marketId })

    return { ...market, status: 'active' as const }
  })
