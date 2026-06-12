import 'server-only'

import {
  FunctionCallingConfigMode,
  createModelContent,
  createPartFromFunctionCall,
  createUserContent
} from '@google/genai'

import { getGoogleGenAIClient } from '@/lib/ai/google-genai'

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
 * TASK-1091 — Provider Gemini (Google GenAI / Vertex). Extracción 1:1 del loop que
 * vivía en `nexa-service.ts` (cero cambio de comportamiento). Implementa el contrato
 * `NexaChatProvider`. El orquestador aplica `ensureKnowledgeSourcesVisible` sobre el
 * texto que este provider devuelve (provider-agnóstico).
 */

const buildContents = (input: NexaTurnInput) => [
  ...input.history.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  })),
  { role: 'user', parts: [{ text: input.prompt }] }
]

export class GeminiNexaProvider implements NexaChatProvider {
  readonly providerKey = 'google' as const

  async resolveTurn(input: NexaTurnInput): Promise<NexaTurnResult> {
    const client = await getGoogleGenAIClient()
    const contents = buildContents(input)

    const firstPass = await client.models.generateContent({
      model: input.model,
      contents: contents as never,
      config: {
        systemInstruction: input.systemPrompt,
        temperature: 0.2,
        maxOutputTokens: 500,
        tools: [{ functionDeclarations: getNexaToolDeclarations(input.runtimeContext) }],
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingConfigMode.AUTO
          }
        }
      }
    })

    const functionCalls = firstPass.functionCalls?.filter(call => call.name) ?? []

    if (functionCalls.length === 0) {
      return {
        text: firstPass.text?.trim() || NEXA_NO_RESPONSE_TEXT,
        toolInvocations: [] as NexaToolInvocation[]
      }
    }

    const toolInvocations = await Promise.all(
      functionCalls.map(call =>
        executeNexaTool({
          toolCallId: call.id || crypto.randomUUID(),
          toolName: call.name || 'check_payroll',
          args: call.args,
          context: input.runtimeContext
        })
      )
    )

    const followUp = await client.models.generateContent({
      model: input.model,
      contents: [
        ...contents,
        createModelContent(
          functionCalls.map(call => createPartFromFunctionCall(call.name || 'unknown_tool', call.args ?? {}))
        ),
        createUserContent(
          // ISSUE-092 — el functionCall part se construye SIN id, así que el
          // functionResponse tampoco debe llevarlo: `createPartFromFunctionResponse`
          // (@google/genai 1.45.0) inyecta un id huérfano que Gemini rechaza con
          // "Unknown name 'id' at function_response" (rompía TODO tool-calling de Nexa).
          // Gemini matchea call↔response por nombre.
          toolInvocations.map(invocation => ({
            functionResponse: {
              name: invocation.toolName,
              response: invocation.result as unknown as Record<string, unknown>
            }
          }))
        )
      ] as never,
      config: {
        systemInstruction: input.systemPrompt,
        temperature: 0.2,
        maxOutputTokens: 500
      }
    })

    return {
      text: followUp.text?.trim() || buildNexaToolFallbackMessage(toolInvocations),
      toolInvocations
    }
  }

  async generateSuggestions({ model, prompt, responseText }: NexaSuggestionsInput): Promise<string[]> {
    try {
      const client = await getGoogleGenAIClient()

      const suggestionResult = await client.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: [
                  'Genera exactamente 3 preguntas de seguimiento cortas en español para una conversación operativa.',
                  'Devuelve solo JSON válido con forma {"suggestions":["...", "...", "..."]}.',
                  'No uses markdown.',
                  `Prompt original: ${prompt}`,
                  `Respuesta de Nexa: ${responseText}`
                ].join('\n')
              }
            ]
          }
        ] as never,
        config: {
          temperature: 0.3,
          maxOutputTokens: 200
        }
      })

      const rawText = suggestionResult.text?.trim() || ''

      if (!rawText) {
        return []
      }

      const parsed = JSON.parse(rawText) as { suggestions?: unknown }

      if (!Array.isArray(parsed.suggestions)) {
        return []
      }

      return parsed.suggestions
        .filter((item): item is string => typeof item === 'string')
        .map(item => item.trim())
        .filter(Boolean)
        .slice(0, 3)
    } catch {
      return []
    }
  }
}
