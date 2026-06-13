import type { NexaResponseToolbarKind, NexaResponseToolbarVariant } from './nexa-response-toolbar-types'

export interface NexaResponseToolbarKindConfig {
  kind: NexaResponseToolbarKind
  defaultVariant: NexaResponseToolbarVariant
}

/** kind→variant. Cualquier kind nuevo resuelve a un variant EXISTENTE (no se inventan variants por consumer). */
export const NEXA_RESPONSE_TOOLBAR_KIND_CONFIG = {
  responseSettle: { kind: 'responseSettle', defaultVariant: 'embedded' },
  chatMessage: { kind: 'chatMessage', defaultVariant: 'floating' },
  surfaceBar: { kind: 'surfaceBar', defaultVariant: 'docked' },
  custom: { kind: 'custom', defaultVariant: 'embedded' }
} as const satisfies Record<NexaResponseToolbarKind, NexaResponseToolbarKindConfig>

export const resolveNexaResponseToolbarVariant = ({
  kind,
  variant
}: {
  kind?: NexaResponseToolbarKind
  variant?: NexaResponseToolbarVariant
}): NexaResponseToolbarVariant => variant ?? NEXA_RESPONSE_TOOLBAR_KIND_CONFIG[kind ?? 'custom'].defaultVariant
