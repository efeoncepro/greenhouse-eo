import 'server-only'

import type { PoolClient } from 'pg'

import { query } from '@/lib/db'
import { resolveGrowthMarket } from '@/lib/growth/markets'

import type { GraderProfileRow } from '../store'
import {
  type BrandAlias,
  type GraderMarket,
  type MarketCompetitor,
  type MatchingSnapshot,
  GraderMarketConfigError,
  validateCompetitors
} from './contracts'

// These statements share the caller's transaction and row locks with the existing grader ledger.
export const marketQueries =
  (client?: PoolClient) =>
  async <T extends Record<string, unknown>>(sql: string, values: unknown[] = []): Promise<T[]> =>
    client ? (await client.query<T>(sql, values)).rows : query<T>(sql, values)

const iso = (value: unknown) => (value == null ? null : new Date(value as string | Date).toISOString())

export const projectMarket = (row: Record<string, unknown>): GraderMarket => ({
  marketId: String(row.market_id),
  profileId: String(row.profile_id),
  marketCode: String(row.market_code),
  locale: String(row.locale),
  status: row.status as GraderMarket['status'],
  isPrimary: Boolean(row.is_primary),
  recurringRegradeEnabled: Boolean(row.recurring_regrade_enabled),
  recurringRegradeCadence: row.recurring_regrade_cadence as GraderMarket['recurringRegradeCadence'],
  recurringRegradeNextAt: iso(row.recurring_regrade_next_at)
})

export const listProfileMarkets = async (profileId: string, client?: PoolClient) =>
  (
    await marketQueries(client)(
      `SELECT * FROM greenhouse_growth.grader_profile_markets WHERE profile_id=$1 ORDER BY is_primary DESC,market_code,locale`,
      [profileId]
    )
  ).map(projectMarket)

export const lockGraderProfile = async (profileId: string, client: PoolClient) => {
  const rows = await marketQueries(client)(
    `SELECT * FROM greenhouse_growth.grader_profiles WHERE profile_id=$1 AND status='active' FOR UPDATE`,
    [profileId]
  )

  if (!rows[0]) throw new GraderMarketConfigError('aeo_profile_not_found', 404)

  return rows[0]
}

/** Lazy primary provisioning only, under the profile lock; never creates a second market implicitly. */
export const ensurePrimaryMarket = async (profile: GraderProfileRow, client: PoolClient): Promise<GraderMarket> => {
  const current = await lockGraderProfile(profile.profileId, client)
  const markets = await listProfileMarkets(profile.profileId, client)
  const primary = markets.find(market => market.isPrimary && market.status === 'active')

  if (primary) return primary
  if (markets.length) throw new GraderMarketConfigError('aeo_primary_market_required')

  const market = resolveGrowthMarket(String(current.market), String(current.locale))

  const rows = await marketQueries(client)(
    `INSERT INTO greenhouse_growth.grader_profile_markets
    (profile_id,market_code,locale,is_primary,created_by,recurring_regrade_enabled,recurring_regrade_cadence,recurring_regrade_next_at,recurring_regrade_last_run_id,recurring_regrade_last_at)
    VALUES ($1,$2,$3,true,'system:primary-provision',$4,$5,$6,$7,$8) RETURNING *`,
    [
      profile.profileId,
      market.code,
      market.locale,
      current.recurring_regrade_enabled,
      current.recurring_regrade_cadence,
      current.recurring_regrade_next_at,
      current.recurring_regrade_last_run_id,
      current.recurring_regrade_last_at
    ]
  )

  const created = projectMarket(rows[0])

  await insertCompetitorSet(
    created.marketId,
    validateCompetitors((current.competitors_declared as string[]).map(name => ({ name }))),
    'system:primary-provision',
    'legacy primary configuration',
    client
  )

  // Bind legacy authored configurations to the primary they belonged to. Run history is untouched.
  await client.query(
    `UPDATE greenhouse_growth.grader_prompt_sets SET market_id=$2 WHERE profile_id=$1 AND market_id IS NULL`,
    [profile.profileId, created.marketId]
  )

  return created
}

export const insertCompetitorSet = async (
  marketId: string,
  members: MarketCompetitor[],
  actor: string,
  reason: string,
  client: PoolClient
) => {
  // Profile lock serializes all market configuration and run snapshots for that brand.
  const active = await marketQueries(client)(
    `SELECT * FROM greenhouse_growth.grader_competitor_sets WHERE market_id=$1 AND status='active'`,
    [marketId]
  )

  if (active[0]) {
    const identical = await marketQueries(client)(
      `SELECT 1 FROM greenhouse_growth.grader_competitor_sets WHERE competitor_set_id=$1 AND members_json=$2::jsonb`,
      [active[0].competitor_set_id, JSON.stringify(members)]
    )

    if (identical.length) return active[0]
  }

  await client.query(
    `UPDATE greenhouse_growth.grader_competitor_sets SET status='superseded' WHERE market_id=$1 AND status='active'`,
    [marketId]
  )

  const rows = await marketQueries(client)(
    `INSERT INTO greenhouse_growth.grader_competitor_sets(market_id,version,status,members_json,created_by,reason)
    SELECT $1,COALESCE(max(version),0)+1,'active',$2::jsonb,$3,$4 FROM greenhouse_growth.grader_competitor_sets WHERE market_id=$1 RETURNING *`,
    [marketId, JSON.stringify(members), actor, reason]
  )

  return rows[0]
}

export const snapshotMarket = async (
  profile: GraderProfileRow,
  market: GraderMarket,
  policyVersion: string,
  client: PoolClient
): Promise<MatchingSnapshot> => {
  const current = await lockGraderProfile(profile.profileId, client)

  const rows = await marketQueries(client)(
    `SELECT * FROM greenhouse_growth.grader_competitor_sets WHERE market_id=$1 AND status='active'`,
    [market.marketId]
  )

  const set = rows[0]

  if (!set) throw new GraderMarketConfigError('aeo_competitor_set_required')

  return {
    version: 'matching.v1',
    brand: {
      name: String(current.brand_name),
      aliases: (current.brand_aliases ?? []) as BrandAlias[],
      websiteUrl: current.website_url as string | null,
      category: current.category as string | null
    },
    competitors: set.members_json as MarketCompetitor[],
    competitorSetId: String(set.competitor_set_id),
    setVersion: Number(set.version),
    market: resolveGrowthMarket(market.marketCode, market.locale),
    providerPolicyVersion: policyVersion
  }
}
