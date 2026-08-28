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
  /**
   * TASK-1696 — Organización dueña del gasto de esta corrida, o `null` cuando el perfil es un
   * prospecto público.
   *
   * ⚠️ SE DERIVA SÓLO DE `grader_profiles.organization_id`, server-side, en el run-engine. NUNCA
   * del payload del run ni de nada que venga del caller: el gasto atribuido a la organización
   * equivocada es peor que el gasto sin atribuir — uno se ve en la señal de drift, el otro se le
   * cobra al presupuesto de un cliente que no lo gastó.
   *
   * `null` es un estado LEGÍTIMO, no un hueco: el grader corre sobre prospectos que no son
   * clientes y el ledger tiene FK a organizations, así que ese gasto no entra a la tabla. Queda
   * contado como no atribuible en `growth.dataforseo.spend_ledger_drift`, nunca invisible, y
   * jamás se le inventa una organización sintética.
   */
  organizationId: string | null
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
  /** Requerido: `null` explícito para prospecto público. Omitirlo dejaría el gasto sin atribuir. */
  organizationId: string | null
  now?: () => string
  newObservationId?: () => string
}): ProviderAdapterContext => ({
  providerPolicyVersion: input.providerPolicyVersion,
  promptPackVersion: input.promptPackVersion,
  timeoutMs: input.timeoutMs,
  maxRetries: input.maxRetries,
  organizationId: input.organizationId,
  now: input.now ?? (() => new Date().toISOString()),
  newObservationId: input.newObservationId ?? (() => `obs-${crypto.randomUUID()}`)
})
