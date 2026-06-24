/**
 * TASK-1226 — Growth AI Visibility Grader · Feature flags (Slice 3).
 *
 * Flags env-var del grader, TODOS default OFF (ver FEATURE_FLAG_STATE_LEDGER).
 * El kill switch global `GROWTH_AI_VISIBILITY_GRADER_ENABLED` gatea a todos; cada
 * provider tiene además su propio flag. Sin flag → el adapter resuelve enabled=
 * false y produce skip controlado (NUNCA crash). Lectura pura de env (testeable).
 */

import { type GrowthAiVisibilityProviderId } from './contracts'

export const GROWTH_AI_VISIBILITY_GRADER_FLAG = 'GROWTH_AI_VISIBILITY_GRADER_ENABLED'

export const GROWTH_AI_VISIBILITY_PROVIDER_FLAGS: Record<GrowthAiVisibilityProviderId, string> = {
  openai: 'GROWTH_AI_VISIBILITY_OPENAI_ENABLED',
  anthropic: 'GROWTH_AI_VISIBILITY_ANTHROPIC_ENABLED',
  perplexity: 'GROWTH_AI_VISIBILITY_PERPLEXITY_ENABLED',
  gemini: 'GROWTH_AI_VISIBILITY_GEMINI_ENABLED'
}

const isTrue = (value: string | undefined): boolean => value?.trim().toLowerCase() === 'true'

/** Kill switch global. Default OFF. */
export const isGraderEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  isTrue(env[GROWTH_AI_VISIBILITY_GRADER_FLAG])

/** Flag del provider (solo cuenta si el grader global está ON). Default OFF. */
export const isProviderFlagEnabled = (
  provider: GrowthAiVisibilityProviderId,
  env: NodeJS.ProcessEnv = process.env
): boolean => isGraderEnabled(env) && isTrue(env[GROWTH_AI_VISIBILITY_PROVIDER_FLAGS[provider]])
