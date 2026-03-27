import type { BonusProrationConfig } from '@/types/payroll'

export const DEFAULT_BONUS_PRORATION_CONFIG: BonusProrationConfig = {
  otdThreshold: 89,
  otdFloor: 70,
  rpaThreshold: 3,
  rpaFullPayoutThreshold: 1.7,
  rpaSoftBandEnd: 2,
  rpaSoftBandFloorFactor: 0.8
}

export const normalizeBonusProrationConfig = (
  config: Partial<BonusProrationConfig> | null | undefined
): BonusProrationConfig => {
  const otdFloor = config?.otdFloor ?? DEFAULT_BONUS_PRORATION_CONFIG.otdFloor

  const otdThreshold = Math.max(config?.otdThreshold ?? DEFAULT_BONUS_PRORATION_CONFIG.otdThreshold, otdFloor)

  const rpaThreshold = Math.max(config?.rpaThreshold ?? DEFAULT_BONUS_PRORATION_CONFIG.rpaThreshold, 0)

  const rpaFullPayoutThreshold = Math.min(
    config?.rpaFullPayoutThreshold ?? DEFAULT_BONUS_PRORATION_CONFIG.rpaFullPayoutThreshold,
    rpaThreshold
  )

  const rpaSoftBandEnd = Math.min(
    Math.max(config?.rpaSoftBandEnd ?? DEFAULT_BONUS_PRORATION_CONFIG.rpaSoftBandEnd, rpaFullPayoutThreshold),
    rpaThreshold
  )

  const rpaSoftBandFloorFactor = Math.min(
    1,
    Math.max(config?.rpaSoftBandFloorFactor ?? DEFAULT_BONUS_PRORATION_CONFIG.rpaSoftBandFloorFactor, 0)
  )

  return {
    otdThreshold,
    otdFloor,
    rpaThreshold,
    rpaFullPayoutThreshold,
    rpaSoftBandEnd,
    rpaSoftBandFloorFactor
  }
}
