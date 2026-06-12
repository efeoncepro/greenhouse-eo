import type { HomeSnapshot, NexaMessage } from '@/types/home'

import type { NexaRuntimeContext, NexaToolInvocation } from './nexa-contract'

/**
 * TASK-1091 — Abstracción de provider LLM de Nexa.
 *
 * Un `NexaChatProvider` encapsula CÓMO se le habla al modelo (system prompt +
 * declaración de tools + 2-pass tool loop + sugerencias) para un provider concreto
 * (Gemini, Claude, …). El resto de Nexa (orquestador `nexa-service.ts`, persistencia
 * en `nexa_messages.tool_invocations`, señales TASK-1085, Answer Trace TASK-1089)
 * consume el MISMO shape de salida independiente del provider — el adapter solo
 * cambia el transporte, NO qué devuelve el tool (`result.raw.packet` idéntico).
 *
 * Invariante (TASK-1085): el tool `search_knowledge`, las Answer Rules y el contrato
 * `knowledge-search.v1` son provider-agnósticos — los providers los CONSUMEN
 * (`getNexaToolDeclarations` + `executeNexaTool`), NO los modifican.
 */

export type NexaProviderKey = 'google' | 'anthropic'

export interface NexaTurnInput {
  /** System prompt ya construido por el orquestador (provider-agnóstico). */
  systemPrompt: string
  history: NexaMessage[]
  prompt: string
  runtimeContext: NexaRuntimeContext
  /** Snapshot del Home (contexto de usuario/operación). */
  context: HomeSnapshot
  /** Model string concreto para este provider (derivado del NexaModelId). */
  model: string
}

export interface NexaTurnResult {
  /** Texto crudo del modelo (antes de `ensureKnowledgeSourcesVisible`, que aplica el orquestador). */
  text: string
  toolInvocations: NexaToolInvocation[]
}

export interface NexaSuggestionsInput {
  model: string
  prompt: string
  responseText: string
}

export interface NexaChatProvider {
  readonly providerKey: NexaProviderKey
  /** 2-pass tool loop: primer pase (tools AUTO) → ejecutar tools → follow-up con resultados. */
  resolveTurn(input: NexaTurnInput): Promise<NexaTurnResult>
  /** 3 preguntas de seguimiento cortas (best-effort; [] ante fallo). */
  generateSuggestions(input: NexaSuggestionsInput): Promise<string[]>
}

/** Texto por defecto cuando el modelo no devuelve nada (provider-agnóstico). */
export const NEXA_NO_RESPONSE_TEXT = 'Lo siento, no pude procesar tu solicitud en este momento.'

/** Fallback provider-agnóstico cuando el follow-up no sintetiza pero hubo señal de tools. */
export const buildNexaToolFallbackMessage = (toolInvocations: NexaToolInvocation[]): string => {
  const visible = toolInvocations.slice(0, 3).map(invocation => `- ${invocation.result.summary}`)

  return visible.length > 0
    ? ['Recuperé señal operativa real:', ...visible].join('\n')
    : 'Recuperé datos operativos, pero no pude sintetizarlos en lenguaje natural.'
}
