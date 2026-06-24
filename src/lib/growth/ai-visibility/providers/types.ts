/**
 * TASK-1226 — Growth AI Visibility Grader · Provider adapter interface (Slice 2).
 *
 * Contrato común que TODOS los adapters implementan (fake + OpenAI/Anthropic/
 * Perplexity/Gemini). `runPrompt` SIEMPRE resuelve a una observación normalizada
 * — incluso en skip (flag/secret ausente) o fallo (status skipped/failed +
 * errorCode), NUNCA lanza por configuración ausente. El raw provider error va a
 * observabilidad, jamás al cliente.
 */

import {
  type GrowthAiVisibilityProviderId,
  type GrowthAiVisibilityPromptInput,
  type GrowthAiVisibilityProviderObservation
} from '../contracts'

export interface ProviderAdapterCapabilities {
  provider: GrowthAiVisibilityProviderId
  /** Si el provider hace grounding/web search en este adapter. */
  supportsWebSearch: boolean
  /** Modelo por defecto que usa el adapter. */
  defaultModel: string
}

/**
 * Contexto de ejecución de una llamada. Lleva las versiones que la observación
 * debe persistir + caps de la policy + factories de id/clock inyectables (para
 * que el fake adapter sea determinista en tests).
 */
export interface ProviderAdapterContext {
  providerPolicyVersion: string
  promptPackVersion: string
  timeoutMs: number
  maxRetries: number
  /** ISO timestamp factory (inyectable para tests). */
  now: () => string
  /** Generador de observationId (inyectable para tests). */
  newObservationId: () => string
}

export interface ProviderAdapter {
  readonly provider: GrowthAiVisibilityProviderId
  readonly capabilities: ProviderAdapterCapabilities
  /**
   * ¿Está el adapter habilitado? (flag global + flag del provider + secret
   * presente). Resuelve a false sin lanzar cuando falta config.
   */
  isEnabled(): Promise<boolean>
  /** Ejecuta un prompt. SIEMPRE resuelve a una observación (status refleja el resultado). */
  runPrompt(
    input: GrowthAiVisibilityPromptInput,
    context: ProviderAdapterContext
  ): Promise<GrowthAiVisibilityProviderObservation>
}

/** Contexto por defecto (runtime real): clock = Date, id = crypto.randomUUID con prefijo. */
export const createProviderAdapterContext = (input: {
  providerPolicyVersion: string
  promptPackVersion: string
  timeoutMs: number
  maxRetries: number
  now?: () => string
  newObservationId?: () => string
}): ProviderAdapterContext => ({
  providerPolicyVersion: input.providerPolicyVersion,
  promptPackVersion: input.promptPackVersion,
  timeoutMs: input.timeoutMs,
  maxRetries: input.maxRetries,
  now: input.now ?? (() => new Date().toISOString()),
  newObservationId: input.newObservationId ?? (() => `obs-${crypto.randomUUID()}`)
})
