import { resolveGrowthMarket } from '@/lib/growth/markets'

export const DATAFORSEO_CLI_PRESETS = {
  organic: {
    endpoint: '/v3/serp/google/organic/live/advanced',
    estimatePerTaskUsd: 0.002,
    description: 'Google Organic live/advanced',
    consumer: 'seo'
  },
  'ai-mode': {
    endpoint: '/v3/serp/google/ai_mode/live/advanced',
    estimatePerTaskUsd: 0.004,
    description: 'Google AI Mode live/advanced',
    consumer: 'aeo'
  },
  'keyword-overview': {
    endpoint: '/v3/dataforseo_labs/google/keyword_overview/live',
    estimatePerTaskUsd: null,
    description: 'Volumen, dificultad e intent de keywords',
    consumer: 'seo'
  },
  'ranked-keywords': {
    endpoint: '/v3/dataforseo_labs/google/ranked_keywords/live',
    estimatePerTaskUsd: null,
    description: 'Keywords posicionadas de un dominio',
    consumer: 'seo'
  },
  competitors: {
    endpoint: '/v3/dataforseo_labs/google/competitors_domain/live',
    estimatePerTaskUsd: null,
    description: 'Competidores orgánicos de un dominio',
    consumer: 'seo'
  },
  backlinks: {
    endpoint: '/v3/backlinks/summary/live',
    estimatePerTaskUsd: null,
    description: 'Resumen del perfil de backlinks',
    consumer: 'seo'
  },
  'onpage-instant': {
    endpoint: '/v3/on_page/instant_pages',
    estimatePerTaskUsd: null,
    description: 'Auditoría inmediata de una URL',
    consumer: 'seo'
  },
  'onpage-audit': {
    endpoint: '/v3/on_page/task_post',
    estimatePerTaskUsd: null,
    description: 'Inicia un crawl OnPage asíncrono',
    consumer: 'seo'
  },
  'chatgpt-response': {
    endpoint: '/v3/ai_optimization/chat_gpt/llm_responses/live',
    estimatePerTaskUsd: null,
    description: 'Respuesta estructurada de ChatGPT para research',
    consumer: 'aeo'
  },
  'claude-response': {
    endpoint: '/v3/ai_optimization/claude/llm_responses/live',
    estimatePerTaskUsd: null,
    description: 'Respuesta estructurada de Claude para research',
    consumer: 'aeo'
  },
  'gemini-response': {
    endpoint: '/v3/ai_optimization/gemini/llm_responses/live',
    estimatePerTaskUsd: null,
    description: 'Respuesta estructurada de Gemini para research',
    consumer: 'aeo'
  },
  'perplexity-response': {
    endpoint: '/v3/ai_optimization/perplexity/llm_responses/live',
    estimatePerTaskUsd: null,
    description: 'Respuesta estructurada de Perplexity para research',
    consumer: 'aeo'
  },
  'chatgpt-scraper': {
    endpoint: '/v3/ai_optimization/chat_gpt/llm_scraper/live/advanced',
    estimatePerTaskUsd: null,
    description: 'Respuesta y fuentes observadas en ChatGPT',
    consumer: 'aeo'
  },
  'gemini-scraper': {
    endpoint: '/v3/ai_optimization/gemini/llm_scraper/live/advanced',
    estimatePerTaskUsd: null,
    description: 'Respuesta y fuentes observadas en Gemini',
    consumer: 'aeo'
  },
  'ai-keyword-volume': {
    endpoint: '/v3/ai_optimization/ai_keyword_data/keywords_search_volume/live',
    estimatePerTaskUsd: null,
    description: 'Volumen estimado de búsqueda en interfaces AI',
    consumer: 'aeo'
  },
  'llm-mentions': {
    endpoint: '/v3/ai_optimization/llm_mentions/target_metrics/live',
    estimatePerTaskUsd: null,
    description: 'Menciones de marca o dominio por plataforma AI',
    consumer: 'aeo'
  }
} as const

export type DataForSeoCliPreset = keyof typeof DATAFORSEO_CLI_PRESETS

export const isDataForSeoCliPreset = (value: string): value is DataForSeoCliPreset =>
  Object.prototype.hasOwnProperty.call(DATAFORSEO_CLI_PRESETS, value)

export const buildDataForSeoPresetPayload = (input: {
  preset: DataForSeoCliPreset
  keyword?: string
  target?: string
  market?: string
  locale?: string
  device?: string
  depth?: number
  loadAiOverview?: boolean
  limit?: number
  maxCrawlPages?: number
  prompt?: string
  model?: string
  systemMessage?: string
  maxOutputTokens?: number
  webSearch?: boolean
  forceWebSearch?: boolean
  platform?: string
}) => {
  const market = resolveGrowthMarket(input.market ?? 'CL', input.locale)
  const location = market.locationCode

  if (location === null) throw new Error(`El mercado ${market.code} no tiene location_code verificado.`)

  if (input.preset === 'organic' || input.preset === 'ai-mode') {
    if (!input.keyword?.trim()) throw new Error(`El preset ${input.preset} exige --keyword.`)

    if (input.depth !== undefined && (!Number.isInteger(input.depth) || input.depth < 1 || input.depth > 200)) {
      throw new Error('--depth debe ser un entero entre 1 y 200.')
    }

    return [
      {
        keyword: input.keyword.trim(),
        location_code: location,
        language_code: input.preset === 'ai-mode' ? market.googleAiModeLanguageCode : market.language,
        device: input.device ?? 'desktop',
        ...(input.preset === 'organic' && input.target?.trim() ? { target: input.target.trim() } : {}),
        ...(input.preset === 'organic' && input.depth !== undefined ? { depth: input.depth } : {}),
        ...(input.preset === 'organic' && input.loadAiOverview ? { load_async_ai_overview: true } : {})
      }
    ]
  }

  if (input.preset.endsWith('-response')) {
    if (!input.prompt?.trim()) throw new Error(`El preset ${input.preset} exige --prompt.`)

    if (!input.model?.trim()) {
      throw new Error(`El preset ${input.preset} exige --model; consulta primero el endpoint /models del proveedor.`)
    }

    return [
      {
        user_prompt: input.prompt.trim(),
        model_name: input.model.trim(),
        max_output_tokens: input.maxOutputTokens ?? 1024,
        ...(input.systemMessage?.trim() ? { system_message: input.systemMessage.trim() } : {}),
        ...(input.webSearch
          ? {
              web_search: true,
              force_web_search: input.forceWebSearch ?? false,
              web_search_country_iso_code: market.code
            }
          : {})
      }
    ]
  }

  if (input.preset === 'chatgpt-scraper' || input.preset === 'gemini-scraper') {
    if (!input.keyword?.trim()) throw new Error(`El preset ${input.preset} exige --keyword.`)

    return [
      {
        keyword: input.keyword.trim(),
        location_code: location,
        language_code: market.language,
        ...(input.forceWebSearch ? { force_web_search: true } : {})
      }
    ]
  }

  if (input.preset === 'ai-keyword-volume') {
    if (!input.keyword?.trim()) throw new Error('El preset ai-keyword-volume exige --keyword.')

    return [
      {
        keywords: input.keyword
          .split(',')
          .map(value => value.trim())
          .filter(Boolean),
        location_code: location,
        language_code: market.language
      }
    ]
  }

  if (input.preset === 'llm-mentions') {
    if (!input.platform || !['chat_gpt', 'google'].includes(input.platform)) {
      throw new Error('El preset llm-mentions exige --platform chat_gpt|google.')
    }

    if (input.platform === 'chat_gpt' && (market.code !== 'US' || market.language !== 'en')) {
      throw new Error('LLM Mentions para chat_gpt sólo admite US/en; usa --market US --locale en-US.')
    }

    if (!input.target?.trim() && !input.keyword?.trim()) {
      throw new Error('El preset llm-mentions exige --target <dominio> o --keyword <marca>.')
    }

    return [
      {
        target: [
          ...(input.target?.trim()
            ? [{ domain: input.target.trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '') }]
            : []),
          ...(input.keyword?.trim() ? [{ keyword: input.keyword.trim(), search_scope: ['any'] }] : [])
        ],
        platform: input.platform,
        location_code: location,
        language_code: market.language,
        internal_list_limit: input.limit ?? 10
      }
    ]
  }

  if (input.preset === 'keyword-overview') {
    if (!input.keyword?.trim()) throw new Error('El preset keyword-overview exige --keyword.')

    return [
      {
        keywords: input.keyword
          .split(',')
          .map(value => value.trim())
          .filter(Boolean),
        location_code: location,
        language_code: market.language
      }
    ]
  }

  if (!input.target?.trim()) throw new Error(`El preset ${input.preset} exige --target.`)

  if (input.preset === 'ranked-keywords' || input.preset === 'competitors') {
    return [
      {
        target: input.target.trim(),
        location_code: location,
        language_code: market.language,
        limit: input.limit ?? 100
      }
    ]
  }

  if (input.preset === 'backlinks') {
    return [{ target: input.target.trim(), include_subdomains: true, rank_scale: 'one_hundred' }]
  }

  if (input.preset === 'onpage-instant') {
    return [
      { url: input.target.trim(), enable_javascript: false, custom_js: 'meta = {}; meta.url = document.URL; meta;' }
    ]
  }

  return [{ target: input.target.trim(), max_crawl_pages: input.maxCrawlPages ?? 100, validate_micromarkup: true }]
}
