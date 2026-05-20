import 'server-only'

import type { BonusProrationConfig } from '@/types/payroll'

type BonusResult = {
  amount: number
  prorationFactor: number
  qualifies: boolean
}

const roundCurrency = (value: number) => Math.round(value * 100) / 100
const roundFactor = (value: number) => Math.round(value * 10000) / 10000

/**
 * TASK-910 Slice 5 — Defense in depth canonical para demo members.
 *
 * El filter principal canonical vive en `fetchKpisForPeriod` (Slice 5
 * upstream): demo members NUNCA llegan al BQ snapshot → su rpaAvg/otdPercent
 * será undefined cuando bonus calc lookup → calculateRpaBonus(null, ...)
 * retorna $0 + qualifies=false naturally.
 *
 * Esta función es la **segunda capa defensive** canonical: cualquier callsite
 * que tenga acceso al `member` object PUEDE invocar esta función pre-check
 * antes del calc canonical. Useful para:
 * - Endpoints que llaman bonus calc directamente sin pasar por fetchKpis
 * - Tests anti-regresión
 * - Manual scripts / admin tools
 * - Future audit consumers
 *
 * Strict `=== true` check anti-coersion (mismo pattern que isDemoMember
 * en src/lib/identity/demo-members.ts).
 *
 * Retorna `null` cuando el member NO es demo (consumer procede al calc puro).
 * Retorna `BonusResult` con $0 + qualifies=false cuando es demo.
 */
export const guardDemoMemberBonus = (
  member: { readonly isDemo?: boolean | null } | null | undefined
): BonusResult | null => {
  if (!member) return null

  if (member.isDemo === true) {
    return { amount: 0, prorationFactor: 0, qualifies: false }
  }

  return null
}

/**
 * Wrapper canonical TASK-910 Slice 5 — calculateRpaBonus con pre-check
 * demo member. Defense in depth secondary layer.
 *
 * Para callsites que tengan acceso al `member` object, usar esta wrapper
 * en lugar de `calculateRpaBonus` directo. Para callsites donde solo
 * llega el snapshot KPI sin member context, el filter upstream en
 * `fetchKpisForPeriod` ya garantiza demo members nunca tienen snapshot.
 */
export const calculateRpaBonusForMember = (
  member: { readonly isDemo?: boolean | null } | null | undefined,
  rpaAvg: number | null,
  bonusAmount: number,
  config: BonusProrationConfig
): BonusResult => {
  const demoResult = guardDemoMemberBonus(member)

  if (demoResult) return demoResult

  return calculateRpaBonus(rpaAvg, bonusAmount, config)
}

/**
 * Wrapper canonical TASK-910 Slice 5 — calculateOtdBonus con pre-check
 * demo member. Defense in depth secondary layer.
 */
export const calculateOtdBonusForMember = (
  member: { readonly isDemo?: boolean | null } | null | undefined,
  otdPercent: number | null,
  bonusAmount: number,
  config: BonusProrationConfig
): BonusResult => {
  const demoResult = guardDemoMemberBonus(member)

  if (demoResult) return demoResult

  return calculateOtdBonus(otdPercent, bonusAmount, config)
}

/**
 * OTD (On-Time Delivery) bonus with graduated proration:
 *   >= otdThreshold (89%) → 100% of bonusAmount
 *   >= otdFloor (70%) and < otdThreshold → linear proration
 *   < otdFloor → $0
 */
export const calculateOtdBonus = (
  otdPercent: number | null,
  bonusAmount: number,
  config: BonusProrationConfig
): BonusResult => {
  if (typeof otdPercent !== 'number' || !Number.isFinite(otdPercent) || bonusAmount <= 0) {
    return { amount: 0, prorationFactor: 0, qualifies: false }
  }

  if (otdPercent >= config.otdThreshold) {
    return { amount: roundCurrency(bonusAmount), prorationFactor: 1, qualifies: true }
  }

  if (otdPercent >= config.otdFloor) {
    const factor = (otdPercent - config.otdFloor) / (config.otdThreshold - config.otdFloor)
    const proratedFactor = roundFactor(factor)

    return {
      amount: roundCurrency(bonusAmount * proratedFactor),
      prorationFactor: proratedFactor,
      qualifies: true
    }
  }

  return { amount: 0, prorationFactor: 0, qualifies: false }
}

/**
 * RpA (Rounds per Artwork) bonus with banded inverse proration:
 *   <= rpaFullPayoutThreshold (1.7) → 100%
 *   <= rpaSoftBandEnd (2.0) → from 100% down to soft-band floor factor (80%)
 *   < rpaThreshold (3.0) → from soft-band floor factor down to 0%
 *   >= rpaThreshold → $0 (higher is worse)
 */
export const calculateRpaBonus = (
  rpaAvg: number | null,
  bonusAmount: number,
  config: BonusProrationConfig
): BonusResult => {
  if (typeof rpaAvg !== 'number' || !Number.isFinite(rpaAvg) || bonusAmount <= 0) {
    return { amount: 0, prorationFactor: 0, qualifies: false }
  }

  if (rpaAvg >= config.rpaThreshold) {
    return { amount: 0, prorationFactor: 0, qualifies: false }
  }

  if (rpaAvg <= config.rpaFullPayoutThreshold) {
    return { amount: roundCurrency(bonusAmount), prorationFactor: 1, qualifies: true }
  }

  if (config.rpaSoftBandEnd <= config.rpaFullPayoutThreshold) {
    const factor = config.rpaThreshold > 0 ? (config.rpaThreshold - rpaAvg) / config.rpaThreshold : 0
    const proratedFactor = roundFactor(Math.min(1, Math.max(0, factor)))

    return {
      amount: roundCurrency(bonusAmount * proratedFactor),
      prorationFactor: proratedFactor,
      qualifies: proratedFactor > 0
    }
  }

  if (rpaAvg <= config.rpaSoftBandEnd) {
    const bandProgress = (rpaAvg - config.rpaFullPayoutThreshold) / (config.rpaSoftBandEnd - config.rpaFullPayoutThreshold)
    const factor = 1 - bandProgress * (1 - config.rpaSoftBandFloorFactor)
    const proratedFactor = roundFactor(Math.min(1, Math.max(config.rpaSoftBandFloorFactor, factor)))

    return {
      amount: roundCurrency(bonusAmount * proratedFactor),
      prorationFactor: proratedFactor,
      qualifies: true
    }
  }

  if (config.rpaThreshold <= config.rpaSoftBandEnd) {
    return { amount: 0, prorationFactor: 0, qualifies: false }
  }

  const declineProgress = (rpaAvg - config.rpaSoftBandEnd) / (config.rpaThreshold - config.rpaSoftBandEnd)

  const factor = config.rpaSoftBandFloorFactor * (1 - declineProgress)
  const proratedFactor = roundFactor(Math.max(0, factor))

  return {
    amount: roundCurrency(bonusAmount * proratedFactor),
    prorationFactor: proratedFactor,
    qualifies: true
  }
}
