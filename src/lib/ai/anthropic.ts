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
