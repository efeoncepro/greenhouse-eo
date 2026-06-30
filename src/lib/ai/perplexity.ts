import 'server-only'

import { resolveSecret, type SecretResolutionSource } from '@/lib/secrets/secret-manager'

// Canonical Perplexity client (TASK-1226). Sibling of openai.ts / anthropic.ts /
// google-genai.ts. NEVER instantiate a parallel Perplexity fetch inside a domain
// module — extend this client. Secret resolves server-side via PERPLEXITY_API_KEY
// / PERPLEXITY_API_KEY_SECRET_REF. No SDK → fetch wrapper (canonical pattern).

const PERPLEXITY_CHAT_URL = 'https://api.perplexity.ai/chat/completions'

export const PERPLEXITY_DEFAULT_MODEL = 'sonar'

export interface PerplexitySearchResult {
  ok: boolean
  httpStatus: number
  model: string
  text: string | null
  citations: Array<{ url: string; title: string | null }>
  usage: Record<string, unknown>
  latencyMs: number
  secretSource: SecretResolutionSource
}

export const isPerplexityConfigured = async (): Promise<boolean> => {
  try {
    const resolution = await resolveSecret({ envVarName: 'PERPLEXITY_API_KEY' })

    return Boolean(resolution.value)
  } catch {
    return false
  }
}

const resolvePerplexityApiKey = async () => {
  const resolution = await resolveSecret({ envVarName: 'PERPLEXITY_API_KEY' })

  if (!resolution.value) {
    throw new Error('Perplexity no está configurado. Define PERPLEXITY_API_KEY o PERPLEXITY_API_KEY_SECRET_REF.')
  }

  return { ...resolution, value: resolution.value }
}

const normalizeCitations = (raw: unknown): Array<{ url: string; title: string | null }> => {
  if (!Array.isArray(raw)) {
    return []
  }

  return raw
    .map(item => {
      if (typeof item === 'string') {
        return { url: item, title: null }
      }

      if (item && typeof item === 'object' && typeof (item as Record<string, unknown>).url === 'string') {
        const record = item as Record<string, unknown>

        return { url: record.url as string, title: typeof record.title === 'string' ? record.title : null }
      }

      return null
    })
    .filter((item): item is { url: string; title: string | null } => item !== null)
}

/** Ejecuta un prompt contra Perplexity Sonar (search-grounded). No lanza por HTTP no-ok. */
export const runPerplexitySearch = async (input: {
  prompt: string
  model?: string
  timeoutMs?: number
}): Promise<PerplexitySearchResult> => {
  const apiKey = await resolvePerplexityApiKey()
  const model = input.model?.trim() || PERPLEXITY_DEFAULT_MODEL
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 35_000)
  const started = Date.now()

  try {
    const response = await fetch(PERPLEXITY_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.value}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: input.prompt }] }),
      signal: controller.signal
    })

    const latencyMs = Date.now() - started

    if (!response.ok) {
      await response.text().catch(() => undefined)

      return {
        ok: false,
        httpStatus: response.status,
        model,
        text: null,
        citations: [],
        usage: {},
        latencyMs,
        secretSource: apiKey.source
      }
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
      citations?: unknown
      search_results?: unknown
      usage?: Record<string, unknown>
    }

    return {
      ok: true,
      httpStatus: response.status,
      model,
      text: json.choices?.[0]?.message?.content ?? null,
      citations: normalizeCitations(json.citations ?? json.search_results),
      usage: json.usage ?? {},
      latencyMs,
      secretSource: apiKey.source
    }
  } finally {
    clearTimeout(timeout)
  }
}
