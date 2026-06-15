export type NexaModelId =
  | 'google/gemini-2.5-flash@default'
  | 'google/gemini-2.5-pro@default'
  | 'google/gemini-3-flash-preview@default'
  | 'google/gemini-3-pro-preview@default'
  | 'google/gemini-3.1-pro-preview@default'
  // TASK-1091 — Anthropic (Claude) provider para el router interno de Nexa.
  | 'anthropic/claude-sonnet-4-6@default'

/** Provider LLM derivado del prefijo del NexaModelId (TASK-1091). */
export type NexaProviderKey = 'google' | 'anthropic'

export interface NexaModelOption {
  id: NexaModelId
  label: string
  description: string
  badge?: 'Stable' | 'Preview'
}

export const DEFAULT_NEXA_MODEL: NexaModelId = 'google/gemini-2.5-flash@default'

/** Modelo Claude por defecto del router "auto" (grounding/sensible). */
export const DEFAULT_NEXA_ANTHROPIC_MODEL: NexaModelId = 'anthropic/claude-sonnet-4-6@default'

/**
 * Provider del NexaModelId (prefijo antes de `/`). El router (TASK-1091) usa esto
 * para elegir el adapter; el orquestador para derivar el provider de cada turno.
 */
export const resolveNexaProviderKey = (id: NexaModelId): NexaProviderKey =>
  id.startsWith('anthropic/') ? 'anthropic' : 'google'

/**
 * String de modelo que recibe el SDK del provider. Gemini recibe el NexaModelId
 * verbatim (comportamiento actual del cliente Vertex, NO cambiar). Anthropic recibe
 * el id limpio (`anthropic/claude-sonnet-4-6@default` → `claude-sonnet-4-6`).
 */
export const resolveNexaSdkModel = (id: NexaModelId): string =>
  resolveNexaProviderKey(id) === 'anthropic' ? id.replace(/^anthropic\//, '').replace(/@.*$/, '') : id

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

/**
 * TASK-1134 — modo de selección de modelo del chat de Nexa.
 * - `auto`: el runtime decide server-side (pin `NEXA_PROVIDER` → auto-router → default Gemini). Es el modo real por defecto.
 * - `manual`: el operador fijó un modelo del picker (override explícito y observable).
 */
export type NexaModelMode = 'auto' | 'manual'

/**
 * TASK-1134 — decide qué `requestedModel` recibe `NexaService` desde el payload del chat. Es el
 * contrato que destraba el auto-router: hoy el endpoint resolvía SIEMPRE un modelo soportado, así
 * que `buildProviderPlan` step 1 ganaba y el router nunca se alcanzaba.
 *
 * - `manual` (o cliente legacy que manda un modelo soportado SIN `modelMode`) → ese modelo (override explícito).
 * - `auto` (o sin modelo) → `null`: `buildProviderPlan` decide (pin `NEXA_PROVIDER` → auto-router → default Gemini).
 *
 * Backward compat: los clientes viejos mandan `model` sin `modelMode` → se respeta como manual (sin regresión).
 * Con los flags de router OFF, `auto` cae al default Gemini → comportamiento idéntico al previo.
 */
export const resolveNexaRequestedModel = ({
  modelMode,
  model
}: {
  modelMode?: NexaModelMode | null
  model?: string | null
}): NexaModelId | null => {
  const isManual = modelMode === 'manual' || (modelMode == null && isSupportedNexaModel(model))

  if (isManual && isSupportedNexaModel(model)) {
    return model
  }

  return null
}
