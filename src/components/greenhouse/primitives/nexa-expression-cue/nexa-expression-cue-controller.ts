import {
  NEXA_EXPRESSION_CUE_REGISTRY,
  NEXA_EXPRESSION_SENSITIVE_DOMAINS
} from './nexa-expression-cue-registry'
import type {
  NexaExpressionCueDegradationReason,
  NexaExpressionCueDomain,
  NexaExpressionCueResolveInput,
  NexaExpressionCueSensitivity,
  NexaExpressionCueTreatment,
  ResolvedNexaExpressionCue
} from './nexa-expression-cue-types'

const SOBER_TREATMENTS = new Set<NexaExpressionCueTreatment>(['tablerIcon', 'statusDot', 'textOnly', 'none'])

const isSensitiveDomain = (domain?: NexaExpressionCueDomain) =>
  Boolean(domain && NEXA_EXPRESSION_SENSITIVE_DOMAINS.includes(domain as never))

const isHighSensitivity = (sensitivity?: NexaExpressionCueSensitivity) =>
  sensitivity === true || sensitivity === 'sensitive' || sensitivity === 'high'

const resolveSensitivityReason = ({
  cue,
  domain,
  sensitivity
}: NexaExpressionCueResolveInput): NexaExpressionCueDegradationReason => {
  if (cue === 'sensitive') return 'cue-sensitive'
  if (isHighSensitivity(sensitivity)) return 'high-sensitivity'
  if (isSensitiveDomain(domain)) return 'sensitive-domain'

  return 'none'
}

const resolveSoberTreatment = (
  requestedTreatment: NexaExpressionCueTreatment,
  sensitiveTreatment: NexaExpressionCueTreatment
) => (SOBER_TREATMENTS.has(requestedTreatment) ? requestedTreatment : sensitiveTreatment)

const coerceUnavailableTreatment = (
  requestedTreatment: NexaExpressionCueTreatment,
  hasIcon: boolean
): { treatment: NexaExpressionCueTreatment; degraded: boolean } => {
  if (requestedTreatment === 'tablerIcon' && !hasIcon) return { treatment: 'textOnly', degraded: true }

  return { treatment: requestedTreatment, degraded: false }
}

export const isNexaExpressionCueSensitive = (input: NexaExpressionCueResolveInput) =>
  resolveSensitivityReason(input) !== 'none'

export const resolveNexaExpressionCue = (input: NexaExpressionCueResolveInput): ResolvedNexaExpressionCue => {
  const context = input.context ?? 'chatText'
  const metadata = NEXA_EXPRESSION_CUE_REGISTRY[input.cue]
  const contextAllowed = metadata.allowedContexts.includes(context)
  const contextTreatment = metadata.treatmentByContext?.[context] ?? metadata.defaultTreatment
  const requestedTreatment = input.treatment ?? contextTreatment
  const sensitivityReason = resolveSensitivityReason(input)

  const degradationReason: NexaExpressionCueDegradationReason = contextAllowed
    ? sensitivityReason
    : 'context-not-allowed'

  const isSensitive = degradationReason !== 'none'

  const sensitivityTreatment = isSensitive
    ? resolveSoberTreatment(requestedTreatment, metadata.sensitiveTreatment)
    : requestedTreatment

  const contextSafeTreatment = contextAllowed ? sensitivityTreatment : 'textOnly'
  const coerced = coerceUnavailableTreatment(contextSafeTreatment, Boolean(metadata.tablerIconClassName))
  const finalDegradationReason = coerced.degraded && degradationReason === 'none' ? 'asset-unavailable' : degradationReason
  const label = input.label ?? (isSensitive ? metadata.sensitiveLabel ?? metadata.label : metadata.label)
  const ariaLabel = input.ariaLabel ?? input.label ?? (isSensitive ? metadata.sensitiveAriaLabel ?? metadata.ariaLabel : metadata.ariaLabel)
  const iconClassName = isSensitive ? metadata.soberIconClassName ?? metadata.tablerIconClassName : metadata.tablerIconClassName

  return {
    ...metadata,
    context,
    label,
    ariaLabel,
    treatment: coerced.treatment,
    iconClassName,
    isSensitive,
    degraded: finalDegradationReason !== 'none',
    decorative: input.decorative ?? false,
    degradationReason: finalDegradationReason
  }
}

export const getNexaExpressionCuePlainText = (input: NexaExpressionCueResolveInput) => {
  const resolved = resolveNexaExpressionCue(input)

  return resolved.decorative || resolved.treatment === 'none' ? '' : resolved.label
}
