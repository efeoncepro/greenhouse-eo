import 'server-only'

/**
 * TASK-1265 — Google AI Overviews / AI Mode provider adapter.
 *
 * DataForSEO es la fuente SERP/answer-engine gobernada para Google AI Mode.
 * Este adapter NO scrapea Google directo y NO trata un HTTP 200 sin bloque AI
 * como exito: degrada honestamente a `skipped:no_ai_overview_block`.
 */

import {
  DATAFORSEO_DEFAULT_AI_MODE_ENDPOINT,
  isDataForSeoConfigured,
  postDataForSeoSerpLiveAdvanced
} from '@/lib/ai/dataforseo'
import { captureWithDomain } from '@/lib/observability/capture'

import {
  type GrowthAiVisibilityCitation,
  type GrowthAiVisibilityProviderObservation
} from '../contracts'
import { isGraderEnabled, isProviderFlagEnabled } from '../flags'
import { boundedExcerpt, buildCitations, sha256Hex } from '../observation'
import {
  buildFailedObservation,
  buildSkippedObservation,
  buildSucceededObservation,
  mapHttpStatusToErrorCode,
  mapThrownErrorToErrorCode
} from './observation-builders'
import { type ProviderAdapter } from './types'

export const GOOGLE_AI_OVERVIEW_PROVIDER_MODEL = 'dataforseo/google-ai-mode-live-advanced'

const PROVIDER = 'google_ai_overview' as const

type UnknownRecord = Record<string, unknown>

interface ParsedAiModeBlock {
  text: string | null
  citations: GrowthAiVisibilityCitation[]
}

const asRecord = (value: unknown): UnknownRecord | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as UnknownRecord) : null

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

const readString = (record: UnknownRecord, keys: string[]): string | null => {
  for (const key of keys) {
    const value = record[key]

    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }

  return null
}

const readNumber = (record: UnknownRecord, keys: string[]): number | null => {
  for (const key of keys) {
    const value = record[key]

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
  }

  return null
}

const collectResultItems = (tasks: unknown[]): UnknownRecord[] => {
  const items: UnknownRecord[] = []

  for (const task of tasks) {
    const taskRecord = asRecord(task)

    for (const result of asArray(taskRecord?.result)) {
      const resultRecord = asRecord(result)

      for (const item of asArray(resultRecord?.items)) {
        const itemRecord = asRecord(item)

        if (itemRecord) {
          items.push(itemRecord)
        }
      }
    }
  }

  return items
}

const collectCitationCandidates = (record: UnknownRecord): Array<{ url: string; title?: string | null; domain?: string | null }> => {
  const candidates: Array<{ url: string; title?: string | null; domain?: string | null }> = []

  for (const key of ['references', 'links', 'sources']) {
    for (const entry of asArray(record[key])) {
      const entryRecord = asRecord(entry)

      if (!entryRecord) {
        continue
      }

      const url = readString(entryRecord, ['url', 'link', 'source_url'])

      if (!url) {
        continue
      }

      candidates.push({
        url,
        title: readString(entryRecord, ['title', 'text', 'source']) ?? undefined,
        domain: readString(entryRecord, ['domain', 'source_domain', 'host'])
      })
    }
  }

  return candidates
}

const readItemText = (item: UnknownRecord): string | null =>
  readString(item, ['markdown', 'text', 'content', 'answer', 'description', 'title'])

export const parseDataForSeoGoogleAiModeBlock = (tasks: unknown[]): ParsedAiModeBlock => {
  const items = collectResultItems(tasks)

  const aiItems = items.filter(item => {
    const type = readString(item, ['type'])

    return type === 'ai_overview' || type === 'ai_overview_element' || type === 'ai_mode'
  })

  const textParts = aiItems.map(readItemText).filter((text): text is string => Boolean(text))
  const citationCandidates = aiItems.flatMap(collectCitationCandidates)

  return {
    text: textParts.length > 0 ? textParts.join('\n\n') : null,
    citations: buildCitations(citationCandidates)
  }
}

const buildKeyword = (promptText: string): string => {
  const trimmed = promptText.trim().replace(/\s+/g, ' ')

  return trimmed.slice(0, 700)
}

const locationFromMarket = (market: string): string => {
  const trimmed = market.trim()

  return trimmed.length > 0 ? trimmed : 'United States'
}

const usageFromDataForSeo = (input: {
  cost: number | null
  tasks: unknown[]
  endpoint: string
}): Record<string, unknown> => {
  const firstTask = asRecord(input.tasks[0])
  const statusCode = firstTask ? readNumber(firstTask, ['status_code']) : null

  return {
    dataforseo_cost_usd: input.cost ?? 0,
    dataforseo_endpoint: input.endpoint,
    dataforseo_tasks_count: input.tasks.length,
    ...(statusCode !== null ? { dataforseo_status_code: statusCode } : {})
  }
}

const buildNoAiOverviewObservation = (input: {
  promptInput: Parameters<ProviderAdapter['runPrompt']>[0]
  context: Parameters<ProviderAdapter['runPrompt']>[1]
  latencyMs: number
  usage: Record<string, unknown>
}): GrowthAiVisibilityProviderObservation => ({
  ...buildSkippedObservation({
    promptInput: input.promptInput,
    context: input.context,
    provider: PROVIDER,
    model: GOOGLE_AI_OVERVIEW_PROVIDER_MODEL,
    errorCode: 'no_ai_overview_block'
  }),
  latencyMs: input.latencyMs,
  usage: input.usage
})

export const createGoogleAiOverviewProviderAdapter = (): ProviderAdapter => ({
  provider: PROVIDER,
  capabilities: {
    provider: PROVIDER,
    supportsWebSearch: true,
    defaultModel: GOOGLE_AI_OVERVIEW_PROVIDER_MODEL
  },
  isEnabled: async () => isProviderFlagEnabled(PROVIDER) && (await isDataForSeoConfigured()),
  runPrompt: async (input, context) => {
    const skip = (errorCode: 'grader_disabled' | 'provider_disabled' | 'missing_secret') =>
      buildSkippedObservation({
        promptInput: input,
        context,
        provider: PROVIDER,
        model: GOOGLE_AI_OVERVIEW_PROVIDER_MODEL,
        errorCode
      })

    if (!isGraderEnabled()) {
      return skip('grader_disabled')
    }

    if (!isProviderFlagEnabled(PROVIDER)) {
      return skip('provider_disabled')
    }

    if (!(await isDataForSeoConfigured())) {
      return skip('missing_secret')
    }

    try {
      const result = await postDataForSeoSerpLiveAdvanced({
        endpoint: DATAFORSEO_DEFAULT_AI_MODE_ENDPOINT,
        timeoutMs: context.timeoutMs,
        tasks: [
          {
            keyword: buildKeyword(input.promptText),
            location_name: locationFromMarket(input.market),
            // DataForSEO documents Google AI Mode as English-only today.
            language_code: 'en',
            device: 'desktop'
          }
        ]
      })

      const usage = usageFromDataForSeo({ cost: result.cost, tasks: result.tasks, endpoint: result.endpoint })

      if (!result.ok) {
        return buildFailedObservation({
          promptInput: input,
          context,
          provider: PROVIDER,
          model: GOOGLE_AI_OVERVIEW_PROVIDER_MODEL,
          errorCode: mapHttpStatusToErrorCode(result.httpStatus),
          latencyMs: result.latencyMs
        })
      }

      const parsed = parseDataForSeoGoogleAiModeBlock(result.tasks)

      if (!parsed.text) {
        return buildNoAiOverviewObservation({
          promptInput: input,
          context,
          latencyMs: result.latencyMs,
          usage
        })
      }

      return buildSucceededObservation({
        promptInput: input,
        context,
        provider: PROVIDER,
        model: GOOGLE_AI_OVERVIEW_PROVIDER_MODEL,
        answerTextHash: sha256Hex(parsed.text),
        answerExcerpt: boundedExcerpt(parsed.text),
        citations: parsed.citations,
        usage,
        latencyMs: result.latencyMs,
        rawEvidencePointer: null
      })
    } catch (error) {
      const errorCode = mapThrownErrorToErrorCode(error)

      captureWithDomain(error, 'growth', {
        tags: { source: 'growth_ai_visibility_google_ai_overview_adapter', provider: PROVIDER, error_code: errorCode },
        extra: { runId: input.runId, promptId: input.promptId }
      })

      return buildFailedObservation({
        promptInput: input,
        context,
        provider: PROVIDER,
        model: GOOGLE_AI_OVERVIEW_PROVIDER_MODEL,
        errorCode,
        latencyMs: 0
      })
    }
  }
})
