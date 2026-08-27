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
import { boundedExcerpt, buildCitations, normalizeDomain, sha256Hex } from '../observation'
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
  /**
   * TASK-1652 — references reales cuyo `domain`/`url` apuntan al wrapper de Google
   * (`google.com/goto`/`searchviewer`) y cuyo `source` es un nombre de marca no
   * convertible a dominio. Se DESCARTAN (atribuirlas a google.com sería falso) pero
   * se cuentan para observabilidad en `usage`.
   */
  unattributableCitations: number
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

/**
 * TASK-1652 (verificado contra respuesta live 2026-08-27) — Google envuelve TODAS las
 * references de AI Mode en redirects propios: `domain` llega como `google.com` y `url`
 * como `google.com/goto?url=<token opaco>` / `google.com/searchviewer`. La identidad
 * real de la fuente viene SOLO en `source` — a veces dominio (`agenciagrowth.cl`),
 * a veces marca (`Bigbuda`). Sin este manejo, cada cita se atribuía a google.com y el
 * SoV de citabilidad quedaba envenenado (la marca jamás aparecería citada).
 */
const GOOGLE_REDIRECT_HOSTS = new Set(['google.com', 'www.google.com'])

const isGoogleRedirectWrapper = (url: string, rawDomain: string | null): boolean => {
  if (rawDomain && GOOGLE_REDIRECT_HOSTS.has(rawDomain.trim().toLowerCase())) {
    return true
  }

  try {
    return GOOGLE_REDIRECT_HOSTS.has(new URL(url).hostname.toLowerCase())
  } catch {
    return false
  }
}

interface CitationCollection {
  candidates: Array<{ url: string; title?: string | null; domain?: string | null }>
  /** URLs de refs envueltas sin dominio derivable — el caller dedupea (top ⊇ anidadas). */
  unattributableUrls: string[]
}

const collectCitationCandidates = (record: UnknownRecord): CitationCollection => {
  const candidates: CitationCollection['candidates'] = []
  const unattributableUrls: string[] = []

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

      const rawDomain = readString(entryRecord, ['domain', 'source_domain', 'host'])

      if (isGoogleRedirectWrapper(url, rawDomain)) {
        // El dominio real solo puede salir de `source`. Marca no domain-shaped →
        // descartar honesto (nunca atribuir a google.com) + contar para telemetría.
        const sourceDomain = normalizeDomain(readString(entryRecord, ['source']))

        if (!sourceDomain) {
          unattributableUrls.push(url)
          continue
        }

        candidates.push({
          url,
          title: readString(entryRecord, ['title', 'text', 'source']) ?? undefined,
          domain: sourceDomain
        })
        continue
      }

      candidates.push({
        url,
        title: readString(entryRecord, ['title', 'text', 'source']) ?? undefined,
        domain: rawDomain
      })
    }
  }

  return { candidates, unattributableUrls }
}

const readItemText = (item: UnknownRecord): string | null =>
  readString(item, ['markdown', 'text', 'content', 'answer', 'description', 'title'])

/**
 * TASK-1652 — Tipos de elementos anidados dentro del item `ai_overview` que cargan
 * `references[]`/`links[]` propias (doc AI Mode §4.1). Descenso ACOTADO a un nivel
 * (el shape documentado no anida más), nunca recursión ilimitada.
 */
const NESTED_AI_ELEMENT_TYPES = new Set(['ai_overview_element', 'ai_overview_table_element', 'ai_overview_expanded_element'])

const collectNestedAiElements = (item: UnknownRecord): UnknownRecord[] => {
  const nested: UnknownRecord[] = []

  for (const sub of asArray(item.items)) {
    const subRecord = asRecord(sub)

    if (subRecord && NESTED_AI_ELEMENT_TYPES.has(readString(subRecord, ['type']) ?? '')) {
      nested.push(subRecord)
    }
  }

  return nested
}

export const parseDataForSeoGoogleAiModeBlock = (tasks: unknown[]): ParsedAiModeBlock => {
  const items = collectResultItems(tasks)

  const aiItems = items.filter(item => {
    const type = readString(item, ['type'])

    return type === 'ai_overview' || type === 'ai_overview_element' || type === 'ai_mode'
  })

  const textParts: string[] = []
  const citationCandidates: Array<{ url: string; title?: string | null; domain?: string | null }> = []
  const unattributableUrls = new Set<string>()

  const collectFrom = (record: UnknownRecord) => {
    const collection = collectCitationCandidates(record)

    citationCandidates.push(...collection.candidates)

    for (const url of collection.unattributableUrls) {
      unattributableUrls.add(url)
    }
  }

  for (const item of aiItems) {
    const nested = collectNestedAiElements(item)
    const ownText = readItemText(item)

    if (ownText) {
      // El `markdown` del bloque padre ya contiene el answer completo — los textos
      // anidados serían duplicado dentro del hash/excerpt.
      textParts.push(ownText)
    } else {
      for (const sub of nested) {
        const subText = readItemText(sub)

        if (subText) {
          textParts.push(subText)
        }
      }
    }

    // Citas: nivel superior + elementos anidados. El proveedor puede duplicar las
    // references arriba (observado en sandbox y live: top ⊇ anidadas) — `buildCitations`
    // dedupea por URL, así que recolectar ambos niveles nunca doble-cuenta.
    collectFrom(item)

    for (const sub of nested) {
      collectFrom(sub)
    }
  }

  return {
    text: textParts.length > 0 ? textParts.join('\n\n') : null,
    citations: buildCitations(citationCandidates),
    unattributableCitations: unattributableUrls.size
  }
}

const buildKeyword = (promptText: string): string => {
  const trimmed = promptText.trim().replace(/\s+/g, ' ')

  return trimmed.slice(0, 700)
}

/**
 * TASK-1652 — Los caminos productivos (`provision-profile.ts`, `aeo-form-grader-adapter.ts`)
 * producen `market` como ISO-2, pero DataForSEO exige nombre completo (`location_name`) o
 * `location_code` numérico: un ISO-2 crudo falla per-task con HTTP 200 batch. Mapa cerrado
 * verificado contra el apéndice gratuito `GET /v3/serp/google/locations/{cc}` (2026-08-27).
 */
export const GOOGLE_AI_MODE_MARKET_LOCATION_CODES: Record<string, number> = {
  CL: 2152,
  MX: 2484,
  CO: 2170,
  PE: 2604,
  US: 2840
}

const FALLBACK_LOCATION_CODE = GOOGLE_AI_MODE_MARKET_LOCATION_CODES.US

type TaskLocation = { location_code: number } | { location_name: string }

const locationFromMarket = (
  market: string,
  onUnmappedMarket: (rawMarket: string) => void
): TaskLocation => {
  const trimmed = market.trim()

  if (trimmed.length === 0) {
    return { location_code: FALLBACK_LOCATION_CODE }
  }

  if (/^[a-z]{2}$/i.test(trimmed)) {
    const mapped = GOOGLE_AI_MODE_MARKET_LOCATION_CODES[trimmed.toUpperCase()]

    if (mapped !== undefined) {
      return { location_code: mapped }
    }

    // ISO-2 fuera del mapa: nunca pasar el código crudo como location_name (fallaría
    // per-task). Fallback observable a US para que el gap sea visible y ampliable.
    onUnmappedMarket(trimmed)

    return { location_code: FALLBACK_LOCATION_CODE }
  }

  // Nombre completo ("Chile") — válido para el proveedor tal cual.
  return { location_name: trimmed }
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
      const location = locationFromMarket(input.market, rawMarket => {
        captureWithDomain(new Error('growth_ai_visibility: market ISO-2 sin location_code mapeado'), 'growth', {
          level: 'warning',
          tags: { source: 'growth_ai_visibility_google_ai_overview_adapter', provider: PROVIDER },
          extra: { runId: input.runId, promptId: input.promptId, market: rawMarket }
        })
      })

      const result = await postDataForSeoSerpLiveAdvanced({
        endpoint: DATAFORSEO_DEFAULT_AI_MODE_ENDPOINT,
        timeoutMs: context.timeoutMs,
        tasks: [
          {
            keyword: buildKeyword(input.promptText),
            ...location,
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
          // ⚠️ El breaker corta SIN llamar y devuelve `httpStatus: 0` (TASK-1300). Ese 0 no
          // entra en ninguna rama de `mapHttpStatusToErrorCode` y caería en
          // `invalid_response`, que culpa al parser cuando el proveedor ni se consultó —
          // manda al operador a diagnosticar el lugar equivocado. `provider_error` es el
          // código honesto: el proveedor está degradado y por eso frenamos.
          errorCode: result.breakerOpen ? 'provider_error' : mapHttpStatusToErrorCode(result.httpStatus),
          latencyMs: result.latencyMs
        })
      }

      // TASK-1652 — gate per-task: HTTP 200 ≠ éxito en DataForSEO. Cada task del batch trae
      // su propio `status_code` (20000 = ok); un task fallido (p. ej. 40501 por location
      // inválida) viene con `result: null` bajo HTTP 200 y ANTES se clasificaba como
      // `skipped:no_ai_overview_block` — falso negativo disfrazado de degradación honesta.
      // Invariante: el skip honesto queda RESERVADO para tasks realmente ejecutadas (20000).
      const firstTask = asRecord(result.tasks[0])
      const taskStatusCode = firstTask ? readNumber(firstTask, ['status_code']) : null

      if (taskStatusCode !== 20000) {
        captureWithDomain(new Error('growth_ai_visibility: DataForSEO task-level failure'), 'growth', {
          tags: { source: 'growth_ai_visibility_google_ai_overview_adapter', provider: PROVIDER },
          extra: {
            runId: input.runId,
            promptId: input.promptId,
            dataforseoStatusCode: taskStatusCode,
            dataforseoStatusMessage: firstTask ? readString(firstTask, ['status_message']) : null
          }
        })

        return {
          ...buildFailedObservation({
            promptInput: input,
            context,
            provider: PROVIDER,
            model: GOOGLE_AI_OVERVIEW_PROVIDER_MODEL,
            // `null` = shape inesperado (sin task o sin status_code) → invalid_response;
            // cualquier código != 20000 = el proveedor reportó fallo de la task → provider_error.
            errorCode: taskStatusCode === null ? 'invalid_response' : 'provider_error',
            latencyMs: result.latencyMs
          }),
          usage
        }
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
        usage: {
          ...usage,
          // Refs envueltas por Google sin dominio derivable desde `source` — se descartan
          // (nunca atribuir a google.com); el conteo queda observable para dimensionar.
          ...(parsed.unattributableCitations > 0
            ? { dataforseo_citations_unattributable: parsed.unattributableCitations }
            : {})
        },
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
