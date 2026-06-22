import type { SxProps, Theme } from '@mui/material/styles'

export type NexaExpressionCueKey =
  | 'ready'
  | 'reviewing'
  | 'risk'
  | 'idea'
  | 'source'
  | 'next_step'
  | 'opportunity'
  | 'missing_context'
  | 'blocked'
  | 'sensitive'

export type NexaExpressionCueContext = 'chatText' | 'answerSurface' | 'stateChip' | 'emptyState' | 'promptDock'

export type NexaExpressionCueTreatment = 'nexaMark' | 'fluentAsset' | 'tablerIcon' | 'statusDot' | 'textOnly' | 'none'

export type NexaExpressionCueTone = 'neutral' | 'success' | 'info' | 'warning' | 'error' | 'nexa' | 'creative'

export type NexaExpressionCuePriority = 'low' | 'medium' | 'high'

export type NexaExpressionCueSensitivity = boolean | 'none' | 'standard' | 'low' | 'medium' | 'sensitive' | 'high'

export type NexaExpressionCueSensitiveDomain = 'finance' | 'payroll' | 'legal' | 'security' | 'contractual'

export type NexaExpressionCueDomain =
  | NexaExpressionCueSensitiveDomain
  | 'general'
  | 'knowledge'
  | 'agency'
  | 'people'
  | 'commercial'
  | 'home'
  | 'custom'
  | (string & {})

export type NexaExpressionCueVariant = 'inline' | 'badge' | 'standalone'

export interface NexaExpressionCueRegistryItem {
  key: NexaExpressionCueKey
  label: string
  ariaLabel: string
  sensitiveLabel?: string
  sensitiveAriaLabel?: string
  tone: NexaExpressionCueTone
  visualPriority: NexaExpressionCuePriority
  allowedContexts: readonly NexaExpressionCueContext[]
  defaultTreatment: NexaExpressionCueTreatment
  treatmentByContext?: Partial<Record<NexaExpressionCueContext, NexaExpressionCueTreatment>>
  sensitiveTreatment: NexaExpressionCueTreatment
  tablerIconClassName: string
  soberIconClassName?: string
  assetSrc?: string
}

export type NexaExpressionCueConfig = NexaExpressionCueRegistryItem

export interface NexaExpressionCueResolveInput {
  cue: NexaExpressionCueKey
  context?: NexaExpressionCueContext
  treatment?: NexaExpressionCueTreatment
  domain?: NexaExpressionCueDomain
  sensitivity?: NexaExpressionCueSensitivity
  decorative?: boolean
  label?: string
  ariaLabel?: string
}

export type NexaExpressionCueDegradationReason =
  | 'none'
  | 'cue-sensitive'
  | 'sensitive-domain'
  | 'high-sensitivity'
  | 'context-not-allowed'
  | 'asset-unavailable'

export interface ResolvedNexaExpressionCue extends NexaExpressionCueRegistryItem {
  context: NexaExpressionCueContext
  label: string
  ariaLabel: string
  treatment: NexaExpressionCueTreatment
  iconClassName: string
  isSensitive: boolean
  degraded: boolean
  decorative: boolean
  degradationReason: NexaExpressionCueDegradationReason
}

export interface NexaExpressionCueProps extends Omit<NexaExpressionCueResolveInput, 'cue'> {
  cue: NexaExpressionCueKey
  variant?: NexaExpressionCueVariant
  size?: 'small' | 'medium'
  showLabel?: boolean | 'auto'
  dataCapture?: string
  sx?: SxProps<Theme>
}
