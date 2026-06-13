import type { NexaComposerKind } from '../nexa-composer-controller'

import type { NexaPromptDockCopy, NexaPromptDockKind, NexaPromptDockVariant } from './nexa-prompt-dock-types'

export interface NexaPromptDockVariantConfig {
  variant: NexaPromptDockVariant
  composerKind: NexaComposerKind
  minInlineSize: number
  maxInlineSize: number
  collapsedMinInlineSize: number
  panelPadding: number
  radius: 'md' | 'lg' | 'xl'
  elevation: number
}

export interface NexaPromptDockKindConfig {
  kind: NexaPromptDockKind
  variant: NexaPromptDockVariant
  copy: NexaPromptDockCopy
}

const DEFAULT_COPY: NexaPromptDockCopy = {
  collapsedLabel: 'Preguntar a Nexa',
  expandedLabel: 'Nexa lista para ayudarte',
  placeholder: 'Escribe tu pregunta para Nexa',
  submitLabel: 'Enviar pregunta',
  closeLabel: 'Cerrar prompt de Nexa',
  successLabel: 'Pregunta enviada',
  shortcutLabel: 'Ctrl/⌘ Enter'
}

export const NEXA_PROMPT_DOCK_VARIANT_CONFIG: Record<NexaPromptDockVariant, NexaPromptDockVariantConfig> = {
  compactDock: {
    variant: 'compactDock',
    composerKind: 'inlineFollowUp',
    minInlineSize: 176,
    maxInlineSize: 440,
    collapsedMinInlineSize: 176,
    panelPadding: 2,
    radius: 'xl',
    elevation: 16
  },
  inlinePanel: {
    variant: 'inlinePanel',
    composerKind: 'inlineFollowUp',
    minInlineSize: 280,
    maxInlineSize: 640,
    collapsedMinInlineSize: 220,
    panelPadding: 3,
    radius: 'lg',
    elevation: 4
  },
  floatingPrompt: {
    variant: 'floatingPrompt',
    composerKind: 'floatingChat',
    minInlineSize: 300,
    maxInlineSize: 520,
    collapsedMinInlineSize: 188,
    panelPadding: 2,
    radius: 'xl',
    elevation: 16
  }
}

export const NEXA_PROMPT_DOCK_KIND_CONFIG: Record<NexaPromptDockKind, NexaPromptDockKindConfig> = {
  quickAsk: {
    kind: 'quickAsk',
    variant: 'compactDock',
    copy: DEFAULT_COPY
  },
  knowledgeAsk: {
    kind: 'knowledgeAsk',
    variant: 'inlinePanel',
    copy: {
      ...DEFAULT_COPY,
      collapsedLabel: 'Preguntar en Knowledge',
      expandedLabel: 'Consulta el corpus con Nexa',
      placeholder: 'Pregunta sobre este documento o corpus',
      submitLabel: 'Buscar con Nexa'
    }
  },
  surfaceFollowUp: {
    kind: 'surfaceFollowUp',
    variant: 'inlinePanel',
    copy: {
      ...DEFAULT_COPY,
      collapsedLabel: 'Continuar con Nexa',
      expandedLabel: 'Haz un follow-up contextual',
      placeholder: 'Pide una explicación o siguiente paso',
      submitLabel: 'Enviar follow-up'
    }
  },
  contextualAction: {
    kind: 'contextualAction',
    variant: 'floatingPrompt',
    copy: {
      ...DEFAULT_COPY,
      collapsedLabel: 'Pedir acción a Nexa',
      expandedLabel: 'Describe la acción contextual',
      placeholder: 'Describe qué necesitas preparar',
      submitLabel: 'Preparar acción'
    }
  },
  custom: {
    kind: 'custom',
    variant: 'compactDock',
    copy: DEFAULT_COPY
  }
}

export const resolveNexaPromptDockKind = (kind?: NexaPromptDockKind): NexaPromptDockKindConfig =>
  NEXA_PROMPT_DOCK_KIND_CONFIG[kind ?? 'quickAsk']

export const resolveNexaPromptDockVariant = (
  variant?: NexaPromptDockVariant,
  kind?: NexaPromptDockKind
): NexaPromptDockVariantConfig => {
  const kindConfig = resolveNexaPromptDockKind(kind)
  const resolvedVariant = variant ?? kindConfig.variant

  return NEXA_PROMPT_DOCK_VARIANT_CONFIG[resolvedVariant]
}

export const resolveNexaPromptDockCopy = (
  kind?: NexaPromptDockKind,
  copy?: Partial<NexaPromptDockCopy>
): NexaPromptDockCopy => ({
  ...resolveNexaPromptDockKind(kind).copy,
  ...copy
})
