import 'server-only'

import type Anthropic from '@anthropic-ai/sdk'

import { resolveNexaSdkModel, type NexaModelId } from '@/config/nexa-models'
import { getAnthropicClient } from '@/lib/ai/anthropic'

import type { NexaToolInvocation } from '../nexa-contract'
import {
  NEXA_NO_RESPONSE_TEXT,
  buildNexaToolFallbackMessage,
  type NexaChatProvider,
  type NexaSuggestionsInput,
  type NexaTurnInput,
  type NexaTurnResult
} from '../nexa-provider'
import { executeNexaTool, getNexaToolDeclarations } from '../nexa-tools'

/**
 * TASK-1091 — Provider Anthropic (Claude). Implementa el MISMO contrato
 * `NexaChatProvider` que Gemini: 2-pass tool loop + sugerencias. El tool
 * `search_knowledge`, las Answer Rules y el packet `knowledge-search.v1` son
 * provider-agnósticos — este adapter solo cambia el transporte (Anthropic Messages
 * API), NO qué devuelve el tool (`result.raw.packet` idéntico al de Gemini).
 *
 * Las declaraciones de tools viven en shape Gemini (`FunctionDeclaration`); acá se
 * mapean a `Anthropic.Messages.Tool` (`parametersJsonSchema` → `input_schema`) sin
 * tocar `nexa-tools.ts`.
 *
 * NO hay equivalente al gotcha ISSUE-092 de Gemini: el protocolo Anthropic EXIGE
 * `tool_use_id` en cada `tool_result` (matchea call↔result por id), así que el id
 * SÍ se incluye (es correcto, no huérfano).
 */

const TURN_MAX_TOKENS = 700
const SUGGESTIONS_MAX_TOKENS = 200

const toAnthropicTools = (input: NexaTurnInput): Anthropic.Messages.Tool[] =>
  getNexaToolDeclarations(input.runtimeContext).map(declaration => ({
    name: declaration.name ?? 'unknown_tool',
    description: declaration.description ?? '',
    input_schema: (declaration.parametersJsonSchema ?? {
      type: 'object',
      properties: {}
    }) as Anthropic.Messages.Tool.InputSchema
  }))

const buildMessages = (input: NexaTurnInput): Anthropic.Messages.MessageParam[] => [
  ...input.history.map(message => ({
    role: message.role === 'assistant' ? ('assistant' as const) : ('user' as const),
    content: message.content
  })),
  { role: 'user' as const, content: input.prompt }
]

const extractText = (content: Anthropic.Messages.ContentBlock[]): string =>
  content
    .filter((block): block is Anthropic.Messages.TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('')
    .trim()

/** Claude puede prefijar prosa antes del JSON; intenta parse directo y luego el primer objeto `{…}`. */
const parseSuggestionsJson = (rawText: string): string[] => {
  const tryParse = (candidate: string): string[] | null => {
    try {
      const parsed = JSON.parse(candidate) as { suggestions?: unknown }

      if (!Array.isArray(parsed.suggestions)) {
        return null
      }

      return parsed.suggestions
        .filter((item): item is string => typeof item === 'string')
        .map(item => item.trim())
        .filter(Boolean)
        .slice(0, 3)
    } catch {
      return null
    }
  }

  const direct = tryParse(rawText)

  if (direct) {
    return direct
  }

  const firstBrace = rawText.indexOf('{')
  const lastBrace = rawText.lastIndexOf('}')

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return tryParse(rawText.slice(firstBrace, lastBrace + 1)) ?? []
  }

  return []
}

export class AnthropicNexaProvider implements NexaChatProvider {
  readonly providerKey = 'anthropic' as const

  async resolveTurn(input: NexaTurnInput): Promise<NexaTurnResult> {
    const client = await getAnthropicClient()
    const model = resolveNexaSdkModel(input.model as NexaModelId)
    const tools = toAnthropicTools(input)
    const messages = buildMessages(input)

    const firstPass = await client.messages.create({
      model,
      max_tokens: TURN_MAX_TOKENS,
      temperature: 0.2,
      system: input.systemPrompt,
      tools,
      messages
    })

    const toolUseBlocks = firstPass.content.filter(
      (block): block is Anthropic.Messages.ToolUseBlock => block.type === 'tool_use'
    )

    if (toolUseBlocks.length === 0) {
      return {
        text: extractText(firstPass.content) || NEXA_NO_RESPONSE_TEXT,
        toolInvocations: [] as NexaToolInvocation[]
      }
    }

    const toolInvocations = await Promise.all(
      toolUseBlocks.map(block =>
        executeNexaTool({
          toolCallId: block.id,
          toolName: block.name,
          args: block.input,
          context: input.runtimeContext
        })
      )
    )

    const toolResultBlocks: Anthropic.Messages.ToolResultBlockParam[] = toolUseBlocks.map((block, index) => ({
      type: 'tool_result',
      tool_use_id: block.id,
      // El packet completo del tool (citas, score, confidence, freshness) viaja en el
      // tool_result para que Claude lo cite [n] — paridad con el functionResponse de Gemini.
      content: JSON.stringify(toolInvocations[index].result)
    }))

    const followUp = await client.messages.create({
      model,
      max_tokens: TURN_MAX_TOKENS,
      temperature: 0.2,
      system: input.systemPrompt,
      tools,
      messages: [
        ...messages,
        { role: 'assistant', content: firstPass.content },
        { role: 'user', content: toolResultBlocks }
      ]
    })

    return {
      text: extractText(followUp.content) || buildNexaToolFallbackMessage(toolInvocations),
      toolInvocations
    }
  }

  async generateSuggestions({ model, prompt, responseText }: NexaSuggestionsInput): Promise<string[]> {
    try {
      const client = await getAnthropicClient()

      const result = await client.messages.create({
        model: resolveNexaSdkModel(model as NexaModelId),
        max_tokens: SUGGESTIONS_MAX_TOKENS,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: [
              'Genera exactamente 3 preguntas de seguimiento cortas en español para una conversación operativa.',
              'Devuelve solo JSON válido con forma {"suggestions":["...", "...", "..."]}.',
              'No uses markdown.',
              `Prompt original: ${prompt}`,
              `Respuesta de Nexa: ${responseText}`
            ].join('\n')
          }
        ]
      })

      return parseSuggestionsJson(extractText(result.content))
    } catch {
      return []
    }
  }
}
