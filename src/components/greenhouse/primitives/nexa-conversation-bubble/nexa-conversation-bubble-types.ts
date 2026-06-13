import type { GreenhouseButtonKind, GreenhouseButtonTone, GreenhouseButtonVariant } from '../greenhouse-button-controller'
import type { NexaExpressiveTextValue } from '../nexa-expressive-text/nexa-expressive-text-types'

export type NexaConversationBubbleVariant =
  | 'userQuestion'
  | 'assistantThinking'
  | 'assistantText'
  | 'assistantFollowUp'
  | 'systemNotice'

export type NexaConversationBubbleKind =
  | 'surfaceUserQuestion'
  | 'nexaThinking'
  | 'nexaText'
  | 'nexaFollowUp'
  | 'contextLoaded'
  | 'lowConfidence'
  | 'staleData'
  | 'policyFiltered'
  | 'partialAnswer'
  | 'custom'

export type NexaConversationBubbleTone = 'neutral' | 'info' | 'success' | 'warning' | 'error'

export interface NexaConversationBubbleAction {
  label: string
  iconClassName?: string
  kind?: GreenhouseButtonKind
  variant?: GreenhouseButtonVariant
  tone?: Extract<GreenhouseButtonTone, 'primary' | 'secondary'>
  onClick?: () => void
  disabled?: boolean
  disabledReason?: string
}

export interface NexaConversationBubbleProps {
  variant?: NexaConversationBubbleVariant
  kind?: NexaConversationBubbleKind
  body: NexaExpressiveTextValue
  title?: NexaExpressiveTextValue
  metaLabel?: NexaExpressiveTextValue
  assistantName?: string
  senderLabel?: string
  tone?: NexaConversationBubbleTone
  thinkingLabel?: string
  actions?: NexaConversationBubbleAction[]
  dataCapture?: string
}
