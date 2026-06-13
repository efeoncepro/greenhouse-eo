import type { NexaConversationBubbleKind, NexaConversationBubbleTone, NexaConversationBubbleVariant } from './nexa-conversation-bubble-types'

export interface NexaConversationBubbleVariantConfig {
  variant: NexaConversationBubbleVariant
  align: 'start' | 'end' | 'center'
  showAvatar: boolean
  showHeader: boolean
  role?: 'status' | 'alert'
}

export interface NexaConversationBubbleKindConfig {
  kind: NexaConversationBubbleKind
  variant: NexaConversationBubbleVariant
  tone: NexaConversationBubbleTone
  iconClassName?: string
}

export const NEXA_CONVERSATION_BUBBLE_VARIANT_CONFIG = {
  userQuestion: {
    variant: 'userQuestion',
    align: 'end',
    showAvatar: false,
    showHeader: false
  },
  assistantThinking: {
    variant: 'assistantThinking',
    align: 'start',
    showAvatar: true,
    showHeader: true,
    role: 'status'
  },
  assistantText: {
    variant: 'assistantText',
    align: 'start',
    showAvatar: true,
    showHeader: true
  },
  assistantFollowUp: {
    variant: 'assistantFollowUp',
    align: 'start',
    showAvatar: true,
    showHeader: true
  },
  systemNotice: {
    variant: 'systemNotice',
    align: 'center',
    showAvatar: false,
    showHeader: false,
    role: 'status'
  }
} as const satisfies Record<NexaConversationBubbleVariant, NexaConversationBubbleVariantConfig>

export const NEXA_CONVERSATION_BUBBLE_KIND_CONFIG = {
  surfaceUserQuestion: {
    kind: 'surfaceUserQuestion',
    variant: 'userQuestion',
    tone: 'neutral'
  },
  nexaThinking: {
    kind: 'nexaThinking',
    variant: 'assistantThinking',
    tone: 'info'
  },
  nexaText: {
    kind: 'nexaText',
    variant: 'assistantText',
    tone: 'neutral'
  },
  nexaFollowUp: {
    kind: 'nexaFollowUp',
    variant: 'assistantFollowUp',
    tone: 'info',
    iconClassName: 'tabler-arrow-forward-up'
  },
  contextLoaded: {
    kind: 'contextLoaded',
    variant: 'systemNotice',
    tone: 'success',
    iconClassName: 'tabler-circle-check'
  },
  lowConfidence: {
    kind: 'lowConfidence',
    variant: 'systemNotice',
    tone: 'warning',
    iconClassName: 'tabler-alert-triangle'
  },
  staleData: {
    kind: 'staleData',
    variant: 'systemNotice',
    tone: 'warning',
    iconClassName: 'tabler-clock-exclamation'
  },
  policyFiltered: {
    kind: 'policyFiltered',
    variant: 'systemNotice',
    tone: 'info',
    iconClassName: 'tabler-shield-lock'
  },
  partialAnswer: {
    kind: 'partialAnswer',
    variant: 'systemNotice',
    tone: 'info',
    iconClassName: 'tabler-adjustments'
  },
  custom: {
    kind: 'custom',
    variant: 'assistantText',
    tone: 'neutral'
  }
} as const satisfies Record<NexaConversationBubbleKind, NexaConversationBubbleKindConfig>

export const resolveNexaConversationBubbleKind = (kind?: NexaConversationBubbleKind): NexaConversationBubbleKindConfig =>
  NEXA_CONVERSATION_BUBBLE_KIND_CONFIG[kind ?? 'nexaText']

export const resolveNexaConversationBubbleVariant = (
  variant?: NexaConversationBubbleVariant,
  kind?: NexaConversationBubbleKind
): NexaConversationBubbleVariantConfig => {
  const resolvedVariant = variant ?? resolveNexaConversationBubbleKind(kind).variant

  return NEXA_CONVERSATION_BUBBLE_VARIANT_CONFIG[resolvedVariant]
}
