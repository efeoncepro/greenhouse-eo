export type NexaModelId =
  | 'gemini-2.5-flash'
  | 'gemini-2.5-pro'
  | 'gemini-3-flash-preview'
  | 'gemini-3-pro-preview'

export interface NexaModelOption {
  id: NexaModelId
  label: string
  description: string
  badge?: 'Stable' | 'Preview'
}

export const DEFAULT_NEXA_MODEL: NexaModelId = 'gemini-2.5-flash'

export const NEXA_MODEL_OPTIONS: NexaModelOption[] = [
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    description: 'Rapido y economico para uso diario.',
    badge: 'Stable'
  },
  {
    id: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    description: 'Mas profundidad para preguntas complejas.',
    badge: 'Stable'
  },
  {
    id: 'gemini-3-flash-preview',
    label: 'Gemini 3 Flash',
    description: 'Preview de Gemini 3 orientada a latencia baja.',
    badge: 'Preview'
  },
  {
    id: 'gemini-3-pro-preview',
    label: 'Gemini 3 Pro',
    description: 'Preview de razonamiento alto para workflows complejos.',
    badge: 'Preview'
  }
]

const NEXA_MODEL_IDS = new Set<string>(NEXA_MODEL_OPTIONS.map(option => option.id))

export const isSupportedNexaModel = (value: unknown): value is NexaModelId =>
  typeof value === 'string' && NEXA_MODEL_IDS.has(value)

export const resolveNexaModel = ({
  requestedModel,
  fallbackModel
}: {
  requestedModel?: string | null
  fallbackModel?: string | null
} = {}): NexaModelId => {
  if (isSupportedNexaModel(requestedModel)) {
    return requestedModel
  }

  if (isSupportedNexaModel(fallbackModel)) {
    return fallbackModel
  }

  return DEFAULT_NEXA_MODEL
}
