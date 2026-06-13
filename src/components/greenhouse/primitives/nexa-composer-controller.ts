export type NexaComposerVariant = 'chat' | 'command'
export type NexaComposerKind = 'floatingChat' | 'knowledgeAsk' | 'globalCommand' | 'inlineFollowUp'

export interface NexaComposerVariantConfig {
  variant: NexaComposerVariant
  radius: number
  thickness: number
  inputRadius: number
  minBlockSize: number
  multiline: boolean
  minRows: number
  maxRows: number
  showNexaMark: boolean
  shortcutLabel?: string
  endAdornmentAlign: 'center' | 'bottom'
}

export interface NexaComposerKindConfig {
  kind: NexaComposerKind
  variant: NexaComposerVariant
  ariaLabel: string
  shortcutLabel?: string
}

export const NEXA_COMPOSER_VARIANT_CONFIG: Record<NexaComposerVariant, NexaComposerVariantConfig> = {
  chat: {
    variant: 'chat',
    radius: 14,
    thickness: 2,
    inputRadius: 14,
    minBlockSize: 44,
    multiline: true,
    minRows: 1,
    maxRows: 4,
    showNexaMark: false,
    endAdornmentAlign: 'bottom'
  },
  command: {
    variant: 'command',
    radius: 10,
    thickness: 1.5,
    inputRadius: 10,
    minBlockSize: 44,
    multiline: false,
    minRows: 1,
    maxRows: 1,
    showNexaMark: true,
    shortcutLabel: '⌘ K',
    endAdornmentAlign: 'center'
  }
}

export const NEXA_COMPOSER_KIND_CONFIG: Record<NexaComposerKind, NexaComposerKindConfig> = {
  floatingChat: {
    kind: 'floatingChat',
    variant: 'chat',
    ariaLabel: 'Mensaje para Nexa'
  },
  knowledgeAsk: {
    kind: 'knowledgeAsk',
    variant: 'command',
    ariaLabel: 'Pregúntale a Nexa',
    shortcutLabel: '↵'
  },
  globalCommand: {
    kind: 'globalCommand',
    variant: 'command',
    ariaLabel: 'Comando para Nexa'
  },
  inlineFollowUp: {
    kind: 'inlineFollowUp',
    variant: 'chat',
    ariaLabel: 'Continuar conversación con Nexa'
  }
}

export const resolveNexaComposerKind = (kind?: NexaComposerKind): NexaComposerKindConfig =>
  NEXA_COMPOSER_KIND_CONFIG[kind ?? 'floatingChat']

export const resolveNexaComposerVariant = (
  variant?: NexaComposerVariant,
  kind?: NexaComposerKind
): NexaComposerVariantConfig => {
  const kindConfig = resolveNexaComposerKind(kind)
  const resolvedVariant = variant ?? kindConfig.variant
  const variantConfig = NEXA_COMPOSER_VARIANT_CONFIG[resolvedVariant]

  return {
    ...variantConfig,
    shortcutLabel: kindConfig.shortcutLabel ?? variantConfig.shortcutLabel
  }
}
