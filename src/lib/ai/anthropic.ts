import 'server-only'

import Anthropic from '@anthropic-ai/sdk'

import { resolveSecret } from '@/lib/secrets/secret-manager'

// Canonical Anthropic/Claude client (TASK-1019). Sibling of openai-image.ts +
// google-genai.ts. NEVER instantiate the Anthropic SDK inside a domain module —
// extend this client. Secret resolves server-side via ANTHROPIC_API_KEY /
// ANTHROPIC_API_KEY_SECRET_REF (canonical secret: greenhouse-anthropic-api-key).

let anthropicClient: Anthropic | undefined

export const isAnthropicConfigured = async (): Promise<boolean> => {
  try {
    const resolution = await resolveSecret({ envVarName: 'ANTHROPIC_API_KEY' })

    return Boolean(resolution.value)
  } catch {
    return false
  }
}

export const getAnthropicClient = async (): Promise<Anthropic> => {
  if (anthropicClient) {
    return anthropicClient
  }

  const resolution = await resolveSecret({ envVarName: 'ANTHROPIC_API_KEY' })

  if (!resolution.value) {
    throw new Error(
      'Anthropic no está configurado. Define ANTHROPIC_API_KEY o ANTHROPIC_API_KEY_SECRET_REF (greenhouse-anthropic-api-key).'
    )
  }

  anthropicClient = new Anthropic({ apiKey: resolution.value })

  return anthropicClient
}

export interface AnthropicStructuredUsage {
  inputTokens: number
  outputTokens: number
}

export interface AnthropicStructuredResult<T> {
  data: T
  model: string
  stopReason: string | null
  usage: AnthropicStructuredUsage
}

export interface GenerateStructuredAnthropicInput {
  model: string
  system: string
  prompt: string
  /** Tool name the model is forced to call; its validated input is the structured output. */
  toolName: string
  toolDescription: string
  /** JSON Schema for the tool input (constrained structured output). */
  inputSchema: Anthropic.Messages.Tool.InputSchema
  maxTokens?: number
  temperature?: number
}

/**
 * Force a schema-constrained structured response from Claude via a single forced
 * tool call (tool_choice). Returns the tool input as the typed structured output.
 */
export const generateStructuredAnthropic = async <T>(
  input: GenerateStructuredAnthropicInput
): Promise<AnthropicStructuredResult<T>> => {
  const client = await getAnthropicClient()

  const response = await client.messages.create({
    model: input.model,
    max_tokens: input.maxTokens ?? 4096,
    temperature: input.temperature ?? 0.2,
    system: input.system,
    tools: [
      {
        name: input.toolName,
        description: input.toolDescription,
        input_schema: input.inputSchema
      }
    ],
    tool_choice: { type: 'tool', name: input.toolName },
    messages: [{ role: 'user', content: input.prompt }]
  })

  const toolUse = response.content.find(
    (block): block is Anthropic.Messages.ToolUseBlock => block.type === 'tool_use'
  )

  if (!toolUse) {
    throw new Error('Claude no devolvió salida estructurada (sin tool_use).')
  }

  return {
    data: toolUse.input as T,
    model: response.model,
    stopReason: response.stop_reason,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens
    }
  }
}

// ── Web search runner (TASK-1226) ────────────────────────────────────────────

/** Default Claude model con web search (verificable contra docs vigentes al correr). */
export const ANTHROPIC_WEB_SEARCH_DEFAULT_MODEL = 'claude-sonnet-4-6'

export interface AnthropicWebSearchCitation {
  url: string
  title: string | null
}

export interface AnthropicWebSearchResult {
  ok: boolean
  model: string
  text: string | null
  citations: AnthropicWebSearchCitation[]
  usage: Record<string, unknown>
  latencyMs: number
}

/**
 * Ejecuta un prompt único contra Claude con la herramienta web_search. Devuelve
 * texto + citations normalizadas (parseo per-provider: citations de text blocks +
 * web_search_tool_result, validado en el spike TASK-1228). Lanza en error de
 * red/SDK (el caller lo mapea a clase canónica). NUNCA loggea el secret.
 */
export const runAnthropicWebSearch = async (input: {
  prompt: string
  model?: string
  maxUses?: number
  maxTokens?: number
  timeoutMs?: number
}): Promise<AnthropicWebSearchResult> => {
  const client = await getAnthropicClient()
  const model = input.model?.trim() || ANTHROPIC_WEB_SEARCH_DEFAULT_MODEL
  const started = Date.now()

  const response = await client.messages.create(
    {
      model,
      max_tokens: input.maxTokens ?? 1024,
      messages: [{ role: 'user', content: input.prompt }],
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: input.maxUses ?? 5 }]
    },
    input.timeoutMs ? { timeout: input.timeoutMs } : undefined
  )

  const latencyMs = Date.now() - started
  const blocks = Array.isArray(response.content) ? response.content : []

  const text =
    blocks
      .filter((block): block is Anthropic.Messages.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('') || null

  const citations: AnthropicWebSearchCitation[] = []

  for (const block of blocks as unknown as Array<Record<string, unknown>>) {
    const blockCitations = block.citations

    if (Array.isArray(blockCitations)) {
      for (const citation of blockCitations as Array<Record<string, unknown>>) {
        if (typeof citation.url === 'string') {
          citations.push({ url: citation.url, title: typeof citation.title === 'string' ? citation.title : null })
        }
      }
    }

    if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
      for (const result of block.content as Array<Record<string, unknown>>) {
        if (typeof result.url === 'string') {
          citations.push({ url: result.url, title: typeof result.title === 'string' ? result.title : null })
        }
      }
    }
  }

  return {
    ok: true,
    model: response.model,
    text,
    citations,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens
    },
    latencyMs
  }
}
