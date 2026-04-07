import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { resolveAvatarUrl } from '@/lib/person-360/resolve-avatar'
import type {
  AccountStaffAugFacet,
  AccountStaffAugPlacement,
  AccountScope,
  AccountFacetContext
} from '@/types/account-complete-360'

// ── Row shapes ──

type PlacementRow = {
  placement_id: string
  member_name: string | null
  member_avatar_url: string | null
  user_id: string | null
  organization_name: string | null
  status: string
  lifecycle_stage: string | null
  billing_rate_amount: string | number | null
  billing_rate_currency: string | null
  contract_start_date: string | null
  contract_end_date: string | null
  provider_relationship_type: string | null
  required_skills: string | string[] | null
}

// ── Helpers ──

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v

  if (typeof v === 'string') { const n = Number(v);

 

return Number.isFinite(n) ? n : 0 }
  
return 0
}

/** Parse required_skills — handles TEXT[], JSON array, comma-separated string, or null */
const parseSkills = (raw: string | string[] | null): string[] | null => {
  if (raw == null) return null
  if (Array.isArray(raw)) return raw


  // pg TEXT[] may arrive as '{skill1,skill2}' string
  if (typeof raw === 'string' && raw.startsWith('{') && raw.endsWith('}')) {
    return raw.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean)
  }

  if (typeof raw === 'string') {
    return raw.split(',').map(s => s.trim()).filter(Boolean)
  }

  
return null
}

// ── Facet ──

export const fetchStaffAugFacet = async (
  scope: AccountScope,
  ctx: AccountFacetContext
): Promise<AccountStaffAugFacet | null> => {
  if (scope.spaceIds.length === 0) return null

  const limit = ctx.limit ?? 20

  const rows = await runGreenhousePostgresQuery<PlacementRow>(
    `SELECT
      p.placement_id,
      p360.resolved_display_name AS member_name,
      p360.resolved_avatar_url AS member_avatar_url,
      p360.user_id,
      o.organization_name,
      p.status,
      p.lifecycle_stage,
      p.billing_rate_amount,
      p.billing_rate_currency,
      p.contract_start_date::text,
      p.contract_end_date::text,
      p.provider_relationship_type,
      p.required_skills
    FROM greenhouse_delivery.staff_aug_placements p
    LEFT JOIN greenhouse_serving.person_360 p360 ON p360.member_id = p.member_id
    LEFT JOIN greenhouse_core.organizations o ON o.organization_id = p.organization_id
    WHERE p.space_id = ANY($1)
    ORDER BY p.contract_start_date DESC NULLS LAST
    LIMIT $2`,
    [scope.spaceIds, limit]
  )

  // ── Map placements ──
  const placements: AccountStaffAugPlacement[] = rows.map(row => ({
    placementId: row.placement_id,
    memberName: row.member_name,
    memberAvatarUrl: resolveAvatarUrl(row.member_avatar_url, row.user_id),
    organizationName: row.organization_name,
    status: row.status,
    lifecycleStage: row.lifecycle_stage,
    billingRate: row.billing_rate_amount != null ? toNum(row.billing_rate_amount) : null,
    billingCurrency: row.billing_rate_currency,
    contractStart: row.contract_start_date,
    contractEnd: row.contract_end_date,
    providerType: row.provider_relationship_type,
    requiredSkills: parseSkills(row.required_skills)
  }))

  // ── Aggregations ──
  let activePlacementCount = 0
  let totalBillingRate = 0
  const currencyMap = new Map<string, { totalRate: number; count: number }>()

  for (const row of rows) {
    const isActive = row.status === 'active'

    if (isActive) activePlacementCount++

    const rate = row.billing_rate_amount != null ? toNum(row.billing_rate_amount) : 0

    totalBillingRate += rate

    if (row.billing_rate_currency && rate > 0) {
      const entry = currencyMap.get(row.billing_rate_currency)

      if (entry) {
        entry.totalRate += rate
        entry.count += 1
      } else {
        currencyMap.set(row.billing_rate_currency, { totalRate: rate, count: 1 })
      }
    }
  }

  const byCurrency = Array.from(currencyMap.entries()).map(([currency, agg]) => ({
    currency,
    totalRate: agg.totalRate,
    count: agg.count
  }))

  return {
    placements,
    activePlacementCount,
    totalBillingRate,
    byCurrency
  }
}
