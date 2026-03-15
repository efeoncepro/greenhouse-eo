import 'server-only'

import type { BonusProrationConfig } from '@/types/payroll'

type BonusResult = {
  amount: number
  prorationFactor: number
  qualifies: boolean
}

const roundCurrency = (value: number) => Math.round(value * 100) / 100

/**
 * OTD (On-Time Delivery) bonus with graduated proration:
 *   >= otdThreshold (94%) → 100% of bonusAmount
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
    const proratedFactor = Math.round(factor * 10000) / 10000

    return {
      amount: roundCurrency(bonusAmount * proratedFactor),
      prorationFactor: proratedFactor,
      qualifies: true
    }
  }

  return { amount: 0, prorationFactor: 0, qualifies: false }
}

/**
 * RpA (Rounds per Artwork) bonus with inverse proration:
 *   rpaAvg > rpaThreshold (3) → $0 (higher is worse)
 *   rpaAvg <= rpaThreshold → prorated: (threshold - avg) / threshold
 */
export const calculateRpaBonus = (
  rpaAvg: number | null,
  bonusAmount: number,
  config: BonusProrationConfig
): BonusResult => {
  if (typeof rpaAvg !== 'number' || !Number.isFinite(rpaAvg) || bonusAmount <= 0) {
    return { amount: 0, prorationFactor: 0, qualifies: false }
  }

  if (rpaAvg > config.rpaThreshold) {
    return { amount: 0, prorationFactor: 0, qualifies: false }
  }

  const factor = (config.rpaThreshold - rpaAvg) / config.rpaThreshold
  const proratedFactor = Math.max(0, Math.round(factor * 10000) / 10000)

  return {
    amount: roundCurrency(bonusAmount * proratedFactor),
    prorationFactor: proratedFactor,
    qualifies: true
  }
}
