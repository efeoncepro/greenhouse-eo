import type { IterationVelocityMetric } from './iteration-velocity'
import type { TimeToMarketMetric } from './time-to-market'
import type { MetricQualityGateStatus } from './metric-registry'

export type RevenueEnabledAttributionClass = 'observed' | 'range' | 'estimated' | 'unavailable'
export type RevenueEnabledLeverCode = 'early_launch' | 'iteration' | 'throughput'
export type RevenueEnabledConfidenceLevel = 'high' | 'medium' | 'low'
export type RevenueEnabledPolicyVersion = 're_v1'

export interface RevenueEnabledThroughputInput {
  value: number | null
  qualityGateStatus?: MetricQualityGateStatus | null
  qualityGateReasons?: string[]
  confidenceLevel?: RevenueEnabledConfidenceLevel | 'none' | null
}

export interface RevenueEnabledLever {
  code: RevenueEnabledLeverCode
  label: string
  supportingMetric: 'time_to_market' | 'iteration_velocity' | 'throughput'
  supportingValue: number | null
  supportingUnit: 'days' | 'iterations' | 'tasks'
  attributionClass: RevenueEnabledAttributionClass
  confidenceLevel: RevenueEnabledConfidenceLevel | null
  qualityGateReasons: string[]
}

export interface RevenueEnabledMeasurementModel {
  policyVersion: RevenueEnabledPolicyVersion
  attributionClass: RevenueEnabledAttributionClass
  levers: {
    earlyLaunch: RevenueEnabledLever
    iteration: RevenueEnabledLever
    throughput: RevenueEnabledLever
  }
  qualityGateReasons: string[]
}

interface RevenueEnabledInput {
  timeToMarket?: TimeToMarketMetric | null
  iterationVelocity?: IterationVelocityMetric | null
  throughput?: RevenueEnabledThroughputInput | null
  hasDirectRevenueAttribution?: boolean
  hasComparableRevenueBaseline?: boolean
}

const ATTRIBUTION_PRIORITY: RevenueEnabledAttributionClass[] = ['observed', 'range', 'estimated', 'unavailable']

const normalizeConfidence = (
  value: RevenueEnabledConfidenceLevel | 'none' | null | undefined
): RevenueEnabledConfidenceLevel | null => {
  if (value === 'high' || value === 'medium' || value === 'low') return value

  return null
}

const pickSummaryClass = (classes: RevenueEnabledAttributionClass[]): RevenueEnabledAttributionClass =>
  ATTRIBUTION_PRIORITY.find(candidate => classes.includes(candidate)) ?? 'unavailable'

const buildEarlyLaunchLever = ({
  timeToMarket,
  hasDirectRevenueAttribution,
  hasComparableRevenueBaseline
}: RevenueEnabledInput): RevenueEnabledLever => {
  const reasons = [...(timeToMarket?.qualityGateReasons ?? [])]

  if (!timeToMarket || timeToMarket.valueDays === null) {
    reasons.push('Sin TTM canónico para esta scope; no se debe inferir Early Launch desde OTD ni benchmarks locales.')

    return {
      code: 'early_launch',
      label: 'Early Launch Advantage',
      supportingMetric: 'time_to_market',
      supportingValue: null,
      supportingUnit: 'days',
      attributionClass: 'unavailable',
      confidenceLevel: null,
      qualityGateReasons: reasons
    }
  }

  let attributionClass: RevenueEnabledAttributionClass = 'estimated'

  if (timeToMarket.dataStatus === 'available' && hasDirectRevenueAttribution) {
    attributionClass = 'observed'
  } else if (timeToMarket.dataStatus === 'available' && hasComparableRevenueBaseline) {
    attributionClass = 'range'
    reasons.push('Hay velocidad observada, pero el revenue solo puede tratarse como rango por baseline comparable.')
  } else {
    reasons.push('La ventaja temprana sigue sin baseline directo de revenue; no debe presentarse como revenue observado.')
  }

  return {
    code: 'early_launch',
    label: 'Early Launch Advantage',
    supportingMetric: 'time_to_market',
    supportingValue: timeToMarket.valueDays,
    supportingUnit: 'days',
    attributionClass,
    confidenceLevel: timeToMarket.confidenceLevel,
    qualityGateReasons: reasons
  }
}

const buildIterationLever = ({
  iterationVelocity,
  hasDirectRevenueAttribution,
  hasComparableRevenueBaseline
}: RevenueEnabledInput): RevenueEnabledLever => {
  const reasons = [...(iterationVelocity?.qualityGateReasons ?? [])]

  if (!iterationVelocity || iterationVelocity.value === null) {
    reasons.push('Sin evidencia suficiente para sostener RE Iteration en esta scope.')

    return {
      code: 'iteration',
      label: 'Iteration Velocity Impact',
      supportingMetric: 'iteration_velocity',
      supportingValue: null,
      supportingUnit: 'iterations',
      attributionClass: 'unavailable',
      confidenceLevel: null,
      qualityGateReasons: reasons
    }
  }

  let attributionClass: RevenueEnabledAttributionClass = 'estimated'

  if (iterationVelocity.evidenceMode === 'observed' && hasDirectRevenueAttribution) {
    attributionClass = 'observed'
  } else if (iterationVelocity.evidenceMode === 'observed' && hasComparableRevenueBaseline) {
    attributionClass = 'range'
    reasons.push('La iteración ya es observada, pero el revenue sigue dependiendo de baseline comparable.')
  } else {
    reasons.push('La iteración sigue en proxy operativo o sin baseline de revenue; no equivale a uplift observado.')
  }

  return {
    code: 'iteration',
    label: 'Iteration Velocity Impact',
    supportingMetric: 'iteration_velocity',
    supportingValue: iterationVelocity.value,
    supportingUnit: 'iterations',
    attributionClass,
    confidenceLevel: iterationVelocity.confidenceLevel,
    qualityGateReasons: reasons
  }
}

const buildThroughputLever = ({
  throughput
}: RevenueEnabledInput): RevenueEnabledLever => {
  const reasons = [...(throughput?.qualityGateReasons ?? [])]

  if (!throughput || throughput.value === null) {
    reasons.push('Sin throughput canónico suficiente para sostener RE Throughput.')

    return {
      code: 'throughput',
      label: 'Throughput Expandido',
      supportingMetric: 'throughput',
      supportingValue: null,
      supportingUnit: 'tasks',
      attributionClass: 'unavailable',
      confidenceLevel: null,
      qualityGateReasons: reasons
    }
  }

  reasons.push('El throughput actual mide tareas completadas; todavia no equivale a iniciativas incrementales atribuibles a revenue.')

  if (throughput.qualityGateStatus === 'degraded') {
    reasons.push('La muestra de throughput sigue parcial o limitada para usarla como palanca fuerte de Revenue Enabled.')
  }

  return {
    code: 'throughput',
    label: 'Throughput Expandido',
    supportingMetric: 'throughput',
    supportingValue: throughput.value,
    supportingUnit: 'tasks',
    attributionClass: 'estimated',
    confidenceLevel: normalizeConfidence(throughput.confidenceLevel) ?? 'low',
    qualityGateReasons: reasons
  }
}

export const buildRevenueEnabledMeasurementModel = (
  input: RevenueEnabledInput
): RevenueEnabledMeasurementModel => {
  const earlyLaunch = buildEarlyLaunchLever(input)
  const iteration = buildIterationLever(input)
  const throughput = buildThroughputLever(input)

  const attributionClass = pickSummaryClass([
    earlyLaunch.attributionClass,
    iteration.attributionClass,
    throughput.attributionClass
  ])

  const qualityGateReasons = [
    ...earlyLaunch.qualityGateReasons,
    ...iteration.qualityGateReasons,
    ...throughput.qualityGateReasons
  ]

  return {
    policyVersion: 're_v1',
    attributionClass,
    levers: {
      earlyLaunch,
      iteration,
      throughput
    },
    qualityGateReasons
  }
}
