import 'server-only'

import { generateStructuredAnthropic, isAnthropicConfigured } from '@/lib/ai/anthropic'
import { captureWithDomain } from '@/lib/observability/capture'
import type { OpeningPublicCopyProposal } from '@/types/hiring-assessment-ai'

import { HIRING_VACANCY_COPY_PROVIDER, getHiringVacancyCopyModel } from './config'
import { OPENING_PUBLIC_COPY_JSON_SCHEMA, sanitizeOpeningPublicCopy } from './contracts'
import { VACANCY_COPY_SYSTEM_PROMPT, buildVacancyCopyPrompt, type VacancyPromptInput } from './prompt'

// El adapter es honest-degrading: NUNCA throwea al caller. Devuelve status + copy o null
// (espeja assessment/ai/providers.ts — el caller degrada honesto y la redacción manual sigue).

export interface PublicCopyGenerationResult {
  copy: OpeningPublicCopyProposal | null
  provider: string
  model: string
  usage: Record<string, unknown>
  status: 'ok' | 'not_configured' | 'provider_error' | 'schema_invalid'
}

export interface PublicCopyDeps {
  isConfigured: () => Promise<boolean>
  generate: typeof generateStructuredAnthropic
}

const defaultDeps: PublicCopyDeps = {
  isConfigured: isAnthropicConfigured,
  generate: generateStructuredAnthropic,
}

/** Redacta el borrador del copy público (tier calidad Anthropic). Borrador, no verdad final. */
export const runPublicCopyGeneration = async (
  input: VacancyPromptInput,
  deps: PublicCopyDeps = defaultDeps,
): Promise<PublicCopyGenerationResult> => {
  const model = getHiringVacancyCopyModel()
  const base = { provider: HIRING_VACANCY_COPY_PROVIDER, model, usage: {} as Record<string, unknown> }

  if (!(await deps.isConfigured())) {
    return { ...base, copy: null, status: 'not_configured' }
  }

  try {
    const result = await deps.generate<unknown>({
      model,
      system: VACANCY_COPY_SYSTEM_PROMPT,
      prompt: buildVacancyCopyPrompt(input),
      toolName: 'propose_opening_public_copy',
      toolDescription: 'Propone el borrador del copy público (public_*) del aviso de una vacante.',
      inputSchema: OPENING_PUBLIC_COPY_JSON_SCHEMA as never,
      temperature: 0.2,
    })

    const copy = sanitizeOpeningPublicCopy(result.data)

    if (!copy) {
      return { ...base, model: result.model, usage: { ...result.usage }, copy: null, status: 'schema_invalid' }
    }

    return { provider: base.provider, model: result.model, usage: { ...result.usage }, copy, status: 'ok' }
  } catch (error) {
    captureWithDomain(error, 'hiring', { tags: { source: 'vacancy_ai_public_copy', provider: base.provider } })

    return { ...base, copy: null, status: 'provider_error' }
  }
}
