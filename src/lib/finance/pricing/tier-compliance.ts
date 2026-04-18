import type { RoleTierMarginEntry } from '@/lib/commercial/pricing-governance-store'
import { getRoleTierMargins } from '@/lib/commercial/pricing-governance-store'
import type { PricingTierCode } from '@/lib/commercial/pricing-governance-types'

import type { TierComplianceV2 } from './contracts'

const EPSILON = 0.0001

export const classifyTierComplianceFromEntry = ({
  effectiveMarginPct,
  tier,
  tierMargins
}: {
  effectiveMarginPct: number | null | undefined
  tier?: string | null
  tierMargins?: RoleTierMarginEntry | null
}): TierComplianceV2 => {
  if (!tier || effectiveMarginPct == null || !Number.isFinite(effectiveMarginPct) || !tierMargins) {
    return {
      tier: tier ?? null,
      status: 'unknown',
      marginMin: tierMargins?.marginMin ?? null,
      marginOpt: tierMargins?.marginOpt ?? null,
      marginMax: tierMargins?.marginMax ?? null
    }
  }

  if (effectiveMarginPct < tierMargins.marginMin - EPSILON) {
    return {
      tier,
      status: 'below_min',
      marginMin: tierMargins.marginMin,
      marginOpt: tierMargins.marginOpt,
      marginMax: tierMargins.marginMax
    }
  }

  if (effectiveMarginPct > tierMargins.marginMax + EPSILON) {
    return {
      tier,
      status: 'above_max',
      marginMin: tierMargins.marginMin,
      marginOpt: tierMargins.marginOpt,
      marginMax: tierMargins.marginMax
    }
  }

  if (Math.abs(effectiveMarginPct - tierMargins.marginOpt) <= EPSILON) {
    return {
      tier,
      status: 'at_optimum',
      marginMin: tierMargins.marginMin,
      marginOpt: tierMargins.marginOpt,
      marginMax: tierMargins.marginMax
    }
  }

  return {
    tier,
    status: 'in_range',
    marginMin: tierMargins.marginMin,
    marginOpt: tierMargins.marginOpt,
    marginMax: tierMargins.marginMax
  }
}

export const classifyTierCompliance = async ({
  effectiveMarginPct,
  tier,
  quoteDate,
  getRoleTierMarginsFn = getRoleTierMargins
}: {
  effectiveMarginPct: number | null | undefined
  tier?: string | null
  quoteDate?: string | null
  getRoleTierMarginsFn?: typeof getRoleTierMargins
}): Promise<TierComplianceV2> => {
  if (!tier) {
    return classifyTierComplianceFromEntry({
      effectiveMarginPct,
      tier,
      tierMargins: null
    })
  }

  const tierMargins = await getRoleTierMarginsFn(tier as PricingTierCode, quoteDate ?? null)

  return classifyTierComplianceFromEntry({
    effectiveMarginPct,
    tier,
    tierMargins
  })
}
