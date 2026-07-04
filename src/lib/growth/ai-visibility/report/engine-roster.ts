import {
  GROWTH_AI_VISIBILITY_PROVIDER_IDS,
  type GrowthAiVisibilityProviderId
} from '../contracts'
import { GRADER_PROVIDER_SURFACE } from '../normalization/contracts'
import type { PublicEngineDisplayId } from './contracts'

export const PROVIDER_DISPLAY_ID = {
  openai: 'chatgpt',
  anthropic: 'claude',
  gemini: 'gemini',
  perplexity: 'perplexity',
  google_ai_overview: 'google_ai_overview'
} as const satisfies Record<GrowthAiVisibilityProviderId, PublicEngineDisplayId>

export const PUBLIC_ENGINE_ROSTER = [
  'openai',
  'anthropic',
  'gemini',
  'perplexity',
  'google_ai_overview'
] as const satisfies readonly GrowthAiVisibilityProviderId[]

export const providerSurface = (providerId: GrowthAiVisibilityProviderId) => GRADER_PROVIDER_SURFACE[providerId]

export const PUBLIC_ENGINE_ROSTER_COVERS_PROVIDER_IDS =
  GROWTH_AI_VISIBILITY_PROVIDER_IDS.every(providerId => PUBLIC_ENGINE_ROSTER.includes(providerId)) &&
  PUBLIC_ENGINE_ROSTER.length === GROWTH_AI_VISIBILITY_PROVIDER_IDS.length
