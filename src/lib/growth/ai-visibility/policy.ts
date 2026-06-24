/**
 * TASK-1226 — Growth AI Visibility Grader · Provider policy resolver (Slice 2).
 *
 * Resuelve, por modo de ejecución, qué providers son elegibles + los caps de
 * costo/latencia/retries. PURO (sin IO). Anclado a la evidencia del spike
 * TASK-1228 (`GREENHOUSE_AI_VISIBILITY_GRADER_CALIBRATION_V1.md` §5):
 *  - Anthropic + web_search fue 3-4× más lento/caro que OpenAI → se EXCLUYE del
 *    tier `light` (público/barato) y se reserva para `full`/`internal_audit`.
 *  - El cost ceiling exacto por modo queda pendiente de la corrida de costo
 *    agregado N≥3 (follow-up #1 de la calibración); acá se fijan techos
 *    conservadores como guard real, NO un placeholder permisivo.
 */

import {
  GROWTH_AI_VISIBILITY_PROVIDER_IDS,
  type GrowthAiVisibilityExecutionMode,
  type GrowthAiVisibilityProviderId
} from './contracts'

/** Versión del contrato de policy. Bump al cambiar elegibilidad/caps (las observations la persisten). */
export const GROWTH_AI_VISIBILITY_PROVIDER_POLICY_VERSION = 'policy.v1'

export interface GrowthAiVisibilityProviderPolicy {
  policyVersion: string
  mode: GrowthAiVisibilityExecutionMode
  /** Providers elegibles para el modo (orden = prioridad de ejecución). */
  eligibleProviders: GrowthAiVisibilityProviderId[]
  /** Máximo de prompts a ejecutar por run (cota de costo; el harness no debe exceder el prompt pack). */
  maxPromptsPerRun: number
  /** Timeout por llamada individual a provider (ms). */
  perCallTimeoutMs: number
  /** Reintentos acotados por llamada (además del intento inicial). */
  maxRetriesPerCall: number
  /**
   * Techo de costo estimado por run (USD). Guard conservador derivado de los
   * rangos de tokens del spike (OpenAI ~17-35k input, Anthropic ~20-35k +
   * web searches). Tightening pendiente de la corrida de costo agregado N≥3.
   */
  costCeilingUsdPerRun: number
}

const ALL_PROVIDERS = [...GROWTH_AI_VISIBILITY_PROVIDER_IDS]

const POLICY_BY_MODE: Record<GrowthAiVisibilityExecutionMode, GrowthAiVisibilityProviderPolicy> = {
  // Público / barato. Excluye Anthropic+web_search por costo/latencia (calibración §5).
  light: {
    policyVersion: GROWTH_AI_VISIBILITY_PROVIDER_POLICY_VERSION,
    mode: 'light',
    eligibleProviders: ['openai', 'perplexity', 'gemini'],
    maxPromptsPerRun: 6,
    perCallTimeoutMs: 20_000,
    maxRetriesPerCall: 1,
    costCeilingUsdPerRun: 0.5
  },
  // Diagnóstico completo. Todos los providers, incluido Anthropic.
  full: {
    policyVersion: GROWTH_AI_VISIBILITY_PROVIDER_POLICY_VERSION,
    mode: 'full',
    eligibleProviders: ALL_PROVIDERS,
    maxPromptsPerRun: 12,
    perCallTimeoutMs: 35_000,
    maxRetriesPerCall: 2,
    costCeilingUsdPerRun: 2
  },
  // Auditoría interna profunda (sin restricción de público). Todos + más prompts.
  internal_audit: {
    policyVersion: GROWTH_AI_VISIBILITY_PROVIDER_POLICY_VERSION,
    mode: 'internal_audit',
    eligibleProviders: ALL_PROVIDERS,
    maxPromptsPerRun: 16,
    perCallTimeoutMs: 35_000,
    maxRetriesPerCall: 2,
    costCeilingUsdPerRun: 5
  }
}

/** Devuelve la policy (copia inmutable) para un modo de ejecución. */
export const resolveProviderPolicy = (
  mode: GrowthAiVisibilityExecutionMode
): GrowthAiVisibilityProviderPolicy => {
  const policy = POLICY_BY_MODE[mode]

  return {
    ...policy,
    eligibleProviders: [...policy.eligibleProviders]
  }
}

/** ¿El provider es elegible en este modo según la policy? */
export const isProviderEligibleForMode = (
  provider: GrowthAiVisibilityProviderId,
  mode: GrowthAiVisibilityExecutionMode
): boolean => POLICY_BY_MODE[mode].eligibleProviders.includes(provider)
