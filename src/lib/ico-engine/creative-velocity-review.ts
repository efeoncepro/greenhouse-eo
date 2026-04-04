import {
  buildRevenueEnabledMeasurementModel,
  type RevenueEnabledMeasurementModel,
  type RevenueEnabledThroughputInput
} from './revenue-enabled'
import {
  resolveIterationVelocityMetric,
  type IterationVelocityMetric,
  type IterationVelocityTaskEvidence
} from './iteration-velocity'
import { resolveTimeToMarketMetric, type TimeToMarketMetric } from './time-to-market'

export type CreativeVelocityReviewPolicyVersion = 'cvr_v1'
export type CreativeVelocityReviewTier = 'basic' | 'pro' | 'enterprise'
export type CreativeVelocityReviewVisibilityStatus =
  | 'visible'
  | 'visible_with_policy'
  | 'included'
  | 'conditional'
  | 'not_included'
export type CreativeVelocityReviewGuardrailEmphasis =
  | 'always'
  | 'never'
  | 'explicit'
  | 'observed_range_estimated'

export interface CreativeVelocityReviewStructureStep {
  id: string
  label: string
  durationMinutes: number
  detail: string
}

export interface CreativeVelocityReviewTierVisibility {
  status: CreativeVelocityReviewVisibilityStatus
  detail?: string
}

export interface CreativeVelocityReviewTierRule {
  id: string
  metric: string
  byTier: Record<CreativeVelocityReviewTier, CreativeVelocityReviewTierVisibility>
  note?: string
}

export interface CreativeVelocityReviewGuardrail {
  id: string
  label: string
  emphasis: CreativeVelocityReviewGuardrailEmphasis
  detail: string
}

export interface CreativeVelocityReviewContract {
  policyVersion: CreativeVelocityReviewPolicyVersion
  structure: CreativeVelocityReviewStructureStep[]
  tierMatrix: CreativeVelocityReviewTierRule[]
  guardrails: CreativeVelocityReviewGuardrail[]
  timeToMarket: TimeToMarketMetric
  iterationVelocity: IterationVelocityMetric
  revenueEnabled: RevenueEnabledMeasurementModel
}

interface CreativeVelocityReviewInput {
  tasks: IterationVelocityTaskEvidence[]
  throughput?: RevenueEnabledThroughputInput | null
  timeToMarket?: TimeToMarketMetric | null
  hasDirectRevenueAttribution?: boolean
  hasComparableRevenueBaseline?: boolean
}

const buildUnavailableTimeToMarket = (): TimeToMarketMetric =>
  resolveTimeToMarketMetric({
    startCandidates: [],
    activationCandidates: []
  })

const CREATIVE_VELOCITY_REVIEW_STRUCTURE: CreativeVelocityReviewStructureStep[] = [
  {
    id: 'executive-summary',
    label: 'Resumen ejecutivo',
    durationMinutes: 5,
    detail:
      'Revenue Enabled del trimestre, tendencia versus el trimestre anterior y una lectura ejecutiva honesta de la evidencia.'
  },
  {
    id: 'levers',
    label: 'Las 3 palancas',
    durationMinutes: 10,
    detail:
      'Early Launch, Iteration y Throughput se explican por separado, con ejemplos concretos y policy de atribucion visible.'
  },
  {
    id: 'drivers',
    label: 'Drivers operativos',
    durationMinutes: 10,
    detail:
      'OTD, RpA, FTR y Cycle Time muestran que cambios operativos sostienen la historia de negocio.'
  },
  {
    id: 'continuous-improvement',
    label: 'Mejora continua',
    durationMinutes: 5,
    detail:
      'El cierre del review debe dejar 1 o 2 focos claros para el siguiente trimestre, no una lista plana de vanity metrics.'
  },
  {
    id: 'expansion',
    label: 'Expansion',
    durationMinutes: 5,
    detail:
      'El CVR tambien sirve para detectar nuevos formatos, mercados o carriles donde la velocidad creativa puede habilitar crecimiento.'
  }
]

const CREATIVE_VELOCITY_REVIEW_TIER_MATRIX: CreativeVelocityReviewTierRule[] = [
  {
    id: 'otd',
    metric: 'OTD%',
    byTier: {
      basic: { status: 'visible', detail: 'Driver operativo base.' },
      pro: { status: 'visible' },
      enterprise: { status: 'visible' }
    }
  },
  {
    id: 'rpa',
    metric: 'RpA',
    byTier: {
      basic: { status: 'visible', detail: 'Friccion de revision.' },
      pro: { status: 'visible' },
      enterprise: { status: 'visible' }
    }
  },
  {
    id: 'cycle-time',
    metric: 'Cycle Time',
    byTier: {
      basic: { status: 'not_included' },
      pro: { status: 'visible', detail: 'Solo con framing operacional claro.' },
      enterprise: { status: 'visible' }
    }
  },
  {
    id: 'ftr',
    metric: 'FTR%',
    byTier: {
      basic: { status: 'not_included' },
      pro: { status: 'visible' },
      enterprise: { status: 'visible' }
    }
  },
  {
    id: 'revenue-enabled',
    metric: 'Revenue Enabled',
    byTier: {
      basic: { status: 'not_included' },
      pro: { status: 'visible_with_policy', detail: 'Debe mostrar observed, range o estimated.' },
      enterprise: { status: 'visible_with_policy', detail: 'Puede sumar benchmarks y comparativos defendibles.' }
    }
  },
  {
    id: 'cvr',
    metric: 'CVR trimestral',
    byTier: {
      basic: { status: 'not_included' },
      pro: { status: 'included' },
      enterprise: { status: 'included' }
    }
  },
  {
    id: 'benchmarks',
    metric: 'Benchmarks de industria',
    byTier: {
      basic: { status: 'not_included' },
      pro: { status: 'not_included' },
      enterprise: { status: 'included', detail: 'Solo donde exista benchmark defendible.' }
    }
  },
  {
    id: 're-comparativo',
    metric: 'Revenue Enabled comparativo',
    byTier: {
      basic: { status: 'not_included' },
      pro: { status: 'not_included' },
      enterprise: {
        status: 'conditional',
        detail: 'Requiere baseline comparable y narrativa sin precision falsa.'
      }
    }
  }
]

const CREATIVE_VELOCITY_REVIEW_GUARDRAILS: CreativeVelocityReviewGuardrail[] = [
  {
    id: 'separate-layers',
    label: 'Separar capas',
    emphasis: 'always',
    detail:
      'Drivers operativos, metricas puente y Revenue Enabled no deben mezclarse como si fueran la misma historia.'
  },
  {
    id: 'name-the-evidence',
    label: 'Nombrar la evidencia',
    emphasis: 'observed_range_estimated',
    detail:
      'La lectura client-facing debe decir que clase de evidencia sostiene cada palanca y que limites tiene.'
  },
  {
    id: 'do-not-inflate-proxies',
    label: 'No inflar proxies',
    emphasis: 'never',
    detail:
      'Iteration proxy o throughput operativo no pueden presentarse como revenue observado solo porque se ven bien en una card.'
  },
  {
    id: 'explain-missing-inputs',
    label: 'Explicar faltantes',
    emphasis: 'explicit',
    detail:
      'Si falta TTM, baseline comparable o attribution layer, el review debe decirlo y no rellenarlo con heuristicas heroicas.'
  }
]

export const buildCreativeVelocityReviewContract = ({
  tasks,
  throughput,
  timeToMarket,
  hasDirectRevenueAttribution = false,
  hasComparableRevenueBaseline = false
}: CreativeVelocityReviewInput): CreativeVelocityReviewContract => {
  const resolvedTimeToMarket = timeToMarket ?? buildUnavailableTimeToMarket()
  const iterationVelocity = resolveIterationVelocityMetric({ tasks })

  const revenueEnabled = buildRevenueEnabledMeasurementModel({
    timeToMarket: resolvedTimeToMarket,
    iterationVelocity,
    throughput,
    hasDirectRevenueAttribution,
    hasComparableRevenueBaseline
  })

  return {
    policyVersion: 'cvr_v1',
    structure: CREATIVE_VELOCITY_REVIEW_STRUCTURE,
    tierMatrix: CREATIVE_VELOCITY_REVIEW_TIER_MATRIX,
    guardrails: CREATIVE_VELOCITY_REVIEW_GUARDRAILS,
    timeToMarket: resolvedTimeToMarket,
    iterationVelocity,
    revenueEnabled
  }
}
