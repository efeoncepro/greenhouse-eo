export type NexaModelId =
  | 'google/gemini-2.5-flash@default'
  | 'google/gemini-2.5-pro@default'
  | 'google/gemini-3-flash-preview@default'
  | 'google/gemini-3-pro-preview@default'
  | 'google/gemini-3.1-pro-preview@default'

export interface NexaModelOption {
  id: NexaModelId
  label: string
  description: string
  badge?: 'Stable' | 'Preview'
}

export const DEFAULT_NEXA_MODEL: NexaModelId = 'google/gemini-2.5-flash@default'

export const NEXA_MODEL_OPTIONS: NexaModelOption[] = [
  {
    id: 'google/gemini-2.5-flash@default',
    label: 'Gemini 2.5 Flash',
    description: 'Rapido y economico para uso diario.',
    badge: 'Stable'
  },
  {
    id: 'google/gemini-2.5-pro@default',
    label: 'Gemini 2.5 Pro',
    description: 'Mas profundidad para preguntas complejas.',
    badge: 'Stable'
  },
  {
    id: 'google/gemini-3-flash-preview@default',
    label: 'Gemini 3 Flash',
    description: 'Preview de Gemini 3 orientada a latencia baja.',
    badge: 'Preview'
  },
  {
    id: 'google/gemini-3-pro-preview@default',
    label: 'Gemini 3 Pro',
    description: 'Preview de razonamiento alto para workflows complejos.',
    badge: 'Preview'
  },
  {
    id: 'google/gemini-3.1-pro-preview@default',
    label: 'Gemini 3.1 Pro',
    description: 'Preview mas avanzado para razonamiento y tareas complejas.',
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
