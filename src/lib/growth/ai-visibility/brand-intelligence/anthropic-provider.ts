import 'server-only'

/**
 * TASK-1288 — Brand Intelligence · Anthropic adapter (premium fallback).
 *
 * Wraps the canonical `generateStructuredAnthropic` (forced tool-call; NEVER the SDK).
 * Premium tier — used when Gemini/OpenAI are not configured, or pinned via env for quality.
 */

import { type Anthropic } from '@anthropic-ai/sdk'

import { generateStructuredAnthropic, isAnthropicConfigured } from '@/lib/ai/anthropic'

import {
  type BrandIntelligenceInput,
  type BrandIntelligenceProvider,
  type BrandIntelligenceProviderResponse,
  type BrandIntelligenceRawOutput
} from './contracts'
import {
  BRAND_INTELLIGENCE_JSON_SCHEMA,
  BRAND_INTELLIGENCE_SYSTEM_PROMPT,
  BRAND_INTELLIGENCE_TOOL_DESCRIPTION,
  BRAND_INTELLIGENCE_TOOL_NAME,
  buildBrandIntelligencePrompt
} from './prompt'

export const PROSE_BRAND_INTELLIGENCE_ANTHROPIC_DEFAULT_MODEL = 'claude-haiku-4-5-20251001'

export const resolveAnthropicBrandIntelligenceModel = (env: NodeJS.ProcessEnv = process.env): string =>
  env.GROWTH_AI_VISIBILITY_BRAND_INTELLIGENCE_MODEL_ANTHROPIC?.trim() ||
  PROSE_BRAND_INTELLIGENCE_ANTHROPIC_DEFAULT_MODEL

export const anthropicBrandIntelligenceProvider: BrandIntelligenceProvider = {
  id: 'anthropic',

  isConfigured: () => isAnthropicConfigured(),

  extract: async (input: BrandIntelligenceInput): Promise<BrandIntelligenceProviderResponse> => {
    const result = await generateStructuredAnthropic<BrandIntelligenceRawOutput>({
      model: resolveAnthropicBrandIntelligenceModel(),
      system: BRAND_INTELLIGENCE_SYSTEM_PROMPT,
      prompt: buildBrandIntelligencePrompt(input),
      toolName: BRAND_INTELLIGENCE_TOOL_NAME,
      toolDescription: BRAND_INTELLIGENCE_TOOL_DESCRIPTION,
      inputSchema: BRAND_INTELLIGENCE_JSON_SCHEMA as unknown as Anthropic.Messages.Tool.InputSchema,
      maxTokens: input.maxTokens,
      temperature: 0
    })

    return {
      data: result.data,
      model: result.model,
      usage: { inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens }
    }
  }
}
