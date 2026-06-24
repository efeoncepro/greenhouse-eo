import 'server-only'

import { resolveSecret, type SecretResolutionSource } from '@/lib/secrets/secret-manager'

// Canonical OpenAI TEXT client (TASK-1226). Sibling of openai-image.ts (images),
// anthropic.ts (Claude) y google-genai.ts (Gemini/Vertex). NEVER instantiate a
// parallel OpenAI SDK/fetch inside a domain module — extend this client. Secret
// resolves server-side via OPENAI_API_KEY / OPENAI_API_KEY_SECRET_REF
// (canonical secret: greenhouse-openai-api-key). No SDK installed → fetch wrapper
// (same canonical pattern as openai-image.ts).

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'

/** Default Responses model with web search (verificable contra docs vigentes al correr). */
export const OPENAI_RESPONSES_DEFAULT_MODEL = 'gpt-4.1'

export interface OpenAIResponsesCitation {
  url: string
  title: string | null
}

export interface OpenAIResponsesWebSearchResult {
  ok: boolean
  httpStatus: number
  model: string
  text: string | null
  citations: OpenAIResponsesCitation[]
  usage: Record<string, unknown>
  latencyMs: number
  secretSource: SecretResolutionSource
}

export const isOpenAIConfigured = async (): Promise<boolean> => {
  try {
    const resolution = await resolveSecret({ envVarName: 'OPENAI_API_KEY' })

    return Boolean(resolution.value)
  } catch {
    return false
  }
}

const resolveOpenAIApiKey = async () => {
  const resolution = await resolveSecret({ envVarName: 'OPENAI_API_KEY' })

  if (!resolution.value) {
    throw new Error('OpenAI no está configurado. Define OPENAI_API_KEY o OPENAI_API_KEY_SECRET_REF (greenhouse-openai-api-key).')
  }

  return { ...resolution, value: resolution.value }
}

interface OpenAIOutputContent {
  type?: string
  text?: string
  annotations?: Array<{ type?: string; url?: string; title?: string }>
}

interface OpenAIOutputBlock {
  type?: string
  content?: OpenAIOutputContent[]
}

/**
 * Ejecuta un prompt único contra la Responses API con web_search. Devuelve texto
 * + citations normalizadas (url_citation annotations) + usage. NO lanza por HTTP
 * no-ok (devuelve ok=false + httpStatus); sí lanza por timeout/abort y errores de
 * red (el caller los mapea a clase canónica). NUNCA loggea el secret.
 */
export const runOpenAIResponsesWebSearch = async (input: {
  prompt: string
  model?: string
  timeoutMs?: number
}): Promise<OpenAIResponsesWebSearchResult> => {
  const apiKey = await resolveOpenAIApiKey()
  const model = input.model?.trim() || OPENAI_RESPONSES_DEFAULT_MODEL
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 35_000)
  const started = Date.now()

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.value}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model, tools: [{ type: 'web_search' }], input: input.prompt }),
      signal: controller.signal
    })

    const latencyMs = Date.now() - started

    if (!response.ok) {
      // Drenar el body para liberar la conexión; no se propaga al cliente.
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
      output?: OpenAIOutputBlock[]
      output_text?: string
      usage?: Record<string, unknown>
    }

    const messageContents = (Array.isArray(json.output) ? json.output : [])
      .filter(block => block.type === 'message')
      .flatMap(block => (Array.isArray(block.content) ? block.content : []))
      .filter(content => content.type === 'output_text')

    const text = json.output_text ?? (messageContents.map(content => content.text ?? '').join('') || null)

    const citations: OpenAIResponsesCitation[] = messageContents
      .flatMap(content => (Array.isArray(content.annotations) ? content.annotations : []))
      .filter(annotation => annotation.type === 'url_citation' && typeof annotation.url === 'string')
      .map(annotation => ({ url: annotation.url as string, title: annotation.title ?? null }))

    return {
      ok: true,
      httpStatus: response.status,
      model,
      text,
      citations,
      usage: json.usage ?? {},
      latencyMs,
      secretSource: apiKey.source
    }
  } finally {
    clearTimeout(timeout)
  }
}
