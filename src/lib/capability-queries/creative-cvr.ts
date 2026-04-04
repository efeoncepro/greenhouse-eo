import {
  type CreativeVelocityReviewContract,
  type CreativeVelocityReviewGuardrailEmphasis,
  type CreativeVelocityReviewVisibilityStatus
} from '@/lib/ico-engine/creative-velocity-review'
import type { CapabilityCardData, CapabilityTierMatrixCell, CapabilityTierMatrixRow } from '@/types/capabilities'

const tierCell = (
  label: string,
  tone: CapabilityTierMatrixCell['tone'],
  detail?: string
): CapabilityTierMatrixCell => ({
  label,
  tone,
  detail
})

const visibilityLabelMap: Record<CreativeVelocityReviewVisibilityStatus, string> = {
  visible: 'Visible',
  visible_with_policy: 'Visible con policy',
  included: 'Incluido',
  conditional: 'Condicional',
  not_included: 'No incluido'
}

const visibilityToneMap: Record<CreativeVelocityReviewVisibilityStatus, CapabilityTierMatrixCell['tone']> = {
  visible: 'success',
  visible_with_policy: 'warning',
  included: 'info',
  conditional: 'warning',
  not_included: 'default'
}

const guardrailEmphasisLabelMap: Record<CreativeVelocityReviewGuardrailEmphasis, string> = {
  always: 'Siempre',
  never: 'Nunca',
  explicit: 'Explicito',
  observed_range_estimated: 'Observed / Range / Estimated'
}

const revenueEnabledClassLabelMap: Record<CreativeVelocityReviewContract['revenueEnabled']['attributionClass'], string> = {
  observed: 'Observed',
  range: 'Range',
  estimated: 'Estimated',
  unavailable: 'Unavailable'
}

const toTierCell = ({
  status,
  detail
}: CreativeVelocityReviewContract['tierMatrix'][number]['byTier']['basic']): CapabilityTierMatrixCell =>
  tierCell(visibilityLabelMap[status], visibilityToneMap[status], detail)

const buildTierMatrixFootnote = (contract: CreativeVelocityReviewContract) => {
  const firstTimeToMarketReason = contract.timeToMarket.qualityGateReasons[0]

  if (!firstTimeToMarketReason) {
    return 'Si una metrica no tiene evidencia suficiente en la cuenta, el estado correcto sigue siendo parcial, degradado o no disponible aunque el tier permita verla.'
  }

  return `Estado actual de la cuenta: Early Launch sigue controlado porque ${firstTimeToMarketReason.replace(/\.$/, '')}. Revenue Enabled resumen: ${revenueEnabledClassLabelMap[contract.revenueEnabled.attributionClass]}.`
}

export const buildCreativeCvrStructureCardData = (contract: CreativeVelocityReviewContract): CapabilityCardData => ({
  type: 'metric-list',
  items: contract.structure.map(step => ({
    label: step.label,
    value: `${step.durationMinutes} min`,
    detail: step.detail
  }))
})

const methodologyStatusLabelMap = {
  available: 'Disponible',
  degraded: 'Parcial',
  unavailable: 'Sin evidencia'
} as const

const methodologyEvidenceLabelMap = {
  observed: 'Observed',
  proxy: 'Proxy',
  missing: 'Missing'
} as const

const methodologyLinkLabel = (contract: CreativeVelocityReviewContract, signal: CreativeVelocityReviewContract['methodologicalAccelerators']['designSystem']) => {
  const connected = signal.outcomeLinks.filter(link => link.status === 'connected').map(link => link.label)
  const partial = signal.outcomeLinks.filter(link => link.status === 'partial').map(link => link.label)

  const segments: string[] = []

  if (connected.length > 0) {
    segments.push(`Conecta con ${connected.join(', ')}.`)
  }

  if (partial.length > 0) {
    segments.push(`Mantiene conexión parcial con ${partial.join(', ')}.`)
  }

  const primaryReason = signal.qualityGateReasons[0]

  if (primaryReason) {
    segments.push(primaryReason)
  }

  if (signal.id === 'brand_voice_ai' && contract.revenueEnabled.attributionClass !== 'unavailable') {
    segments.push(`Revenue Enabled sigue comunicado como ${revenueEnabledClassLabelMap[contract.revenueEnabled.attributionClass]}.`)
  }

  return segments.join(' ')
}

export const buildCreativeMethodologicalAcceleratorsCardData = (
  contract: CreativeVelocityReviewContract
): CapabilityCardData => ({
  type: 'metric-list',
  items: [contract.methodologicalAccelerators.designSystem, contract.methodologicalAccelerators.brandVoiceAi].map(signal => ({
    label: signal.label,
    value:
      signal.summaryValue
        ? `${methodologyEvidenceLabelMap[signal.evidenceMode]} · ${signal.summaryValue}`
        : methodologyStatusLabelMap[signal.dataStatus],
    detail: methodologyLinkLabel(contract, signal)
  }))
})

const buildTierRows = (contract: CreativeVelocityReviewContract): CapabilityTierMatrixRow[] =>
  contract.tierMatrix.map(row => ({
    id: row.id,
    metric: row.metric,
    basic: toTierCell(row.byTier.basic),
    pro: toTierCell(row.byTier.pro),
    enterprise: toTierCell(row.byTier.enterprise),
    note: row.note
  }))

export const buildCreativeCvrTierMatrixCardData = (contract: CreativeVelocityReviewContract): CapabilityCardData => ({
  type: 'tier-matrix',
  intro:
    'La visibilidad por tier es un contrato de lectura. El runtime actual no hace hard-gating por Basic, Pro o Enterprise; esta matriz define que puede comunicarse sin vender humo.',
  rows: buildTierRows(contract),
  footnote: buildTierMatrixFootnote(contract)
})

export const buildCreativeNarrativeGuardrailsCardData = (contract: CreativeVelocityReviewContract): CapabilityCardData => ({
  type: 'metric-list',
  items: contract.guardrails.map(rule => ({
    label: rule.label,
    value: guardrailEmphasisLabelMap[rule.emphasis],
    detail:
      rule.id === 'name-the-evidence'
        ? `${rule.detail} Estado actual de Revenue Enabled: ${revenueEnabledClassLabelMap[contract.revenueEnabled.attributionClass]}.`
        : rule.id === 'explain-missing-inputs' && contract.timeToMarket.qualityGateReasons[0]
          ? `${rule.detail} Hoy el primer faltante visible es: ${contract.timeToMarket.qualityGateReasons[0]}`
          : rule.detail
  }))
})
