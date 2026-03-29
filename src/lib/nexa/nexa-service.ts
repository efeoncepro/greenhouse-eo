import 'server-only'

import {
  FunctionCallingConfigMode,
  createModelContent,
  createPartFromFunctionCall,
  createPartFromFunctionResponse,
  createUserContent
} from '@google/genai'

import { getGoogleGenAIClient, getGreenhouseAgentModel } from '@/lib/ai/google-genai'
import type { NexaMessage, HomeSnapshot } from '@/types/home'

import type { NexaResponse, NexaRuntimeContext, NexaToolInvocation } from './nexa-contract'
import { executeNexaTool, getNexaToolDeclarations } from './nexa-tools'

interface NexaServiceInput {
  prompt: string
  history: NexaMessage[]
  context: HomeSnapshot
  runtimeContext: NexaRuntimeContext
}

/**
 * Nexa Service: The AI core for Greenhouse Home.
 * Uses Google GenAI (Gemini) to provide conversational assistance.
 */
export class NexaService {
  private static getTimestamp() {
    return new Date().toISOString()
  }

  private static extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message
    }

    if (typeof error === 'string') {
      return error
    }

    try {
      return JSON.stringify(error)
    } catch {
      return 'Unknown Nexa generation error'
    }
  }

  private static isVertexPermissionDenied(errorMessage: string) {
    const normalized = errorMessage.toLowerCase()

    return normalized.includes('permission_denied') || normalized.includes('aiplatform.endpoints.predict')
  }

  private static buildPermissionDeniedFallback(context: HomeSnapshot): NexaResponse {
    const topModules = context.modules.slice(0, 3).map(module => module.title)

    const moduleHint =
      topModules.length > 0
        ? `Mientras recuperamos el acceso conversacional, puedes moverte por ${topModules.join(', ')} desde Home.`
        : 'Mientras recuperamos el acceso conversacional, puedes seguir navegando tu operación desde Home.'

    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `Hoy no pude conectarme al motor de IA de este entorno. ${moduleHint}`,
      timestamp: this.getTimestamp(),
      suggestions: [],
      toolInvocations: []
    }
  }

  private static buildSystemPrompt(context: HomeSnapshot): string {
    const { user, modules, tasks } = context

    return [
      'Eres Nexa, el asistente inteligente de Greenhouse.',
      'Tu misión es ayudar a navegar la operación real del portal y resolver dudas rápidas con contexto confiable.',
      '',
      'CONTEXTO DEL USUARIO:',
      `- Nombre: ${user.firstName} ${user.lastName || ''}`,
      `- Rol: ${user.role}`,
      '',
      'OPERACIÓN ACTIVA:',
      `- Módulos disponibles: ${modules.map(m => m.title).join(', ')}`,
      `- Tareas pendientes: ${tasks.length} identificadas (OTD, FTR, RPA, etc.)`,
      '',
      'REGLAS DE RESPUESTA:',
      '- Sé conciso, profesional y humano.',
      '- Usa un tono operativo, claro y grounded; no inventes métricas ni estados.',
      '- Si el usuario pregunta por nómina, OTD, correos operativos, capacidad o cuentas por cobrar, usa los tools disponibles antes de responder.',
      '- Si un tool no está disponible por permisos o por falta de datos, dilo con honestidad.',
      '- Si el usuario pregunta por algo que está en sus tareas pendientes, menciónalo directamente.',
      '- Mantén las respuestas breves para que quepan bien en el panel de Home.',
      '',
      'Recuerda: Eres parte de Efeonce Group y Greenhouse es la plataforma que materializa la visión de sus proyectos.'
    ].join('\n')
  }

  private static buildContents(input: NexaServiceInput) {
    return [
      ...input.history.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      })),
      { role: 'user', parts: [{ text: input.prompt }] }
    ]
  }

  private static buildToolFallbackMessage(toolInvocations: NexaToolInvocation[]) {
    const visible = toolInvocations.slice(0, 3).map(invocation => `- ${invocation.result.summary}`)

    return visible.length > 0
      ? ['Recuperé señal operativa real:', ...visible].join('\n')
      : 'Recuperé datos operativos, pero no pude sintetizarlos en lenguaje natural.'
  }

  private static async resolveToolTurn({
    client,
    model,
    systemPrompt,
    input
  }: {
    client: Awaited<ReturnType<typeof getGoogleGenAIClient>>
    model: string
    systemPrompt: string
    input: NexaServiceInput
  }) {
    const contents = this.buildContents(input)

    const firstPass = await client.models.generateContent({
      model,
      contents: contents as any,
      config: {
        systemInstruction: systemPrompt,
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
        text: firstPass.text?.trim() || 'Lo siento, no pude procesar tu solicitud en este momento.',
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
      model,
      contents: [
        ...contents,
        createModelContent(
          functionCalls.map(call => createPartFromFunctionCall(call.name || 'unknown_tool', call.args ?? {}))
        ),
        createUserContent(
          toolInvocations.map(invocation =>
            createPartFromFunctionResponse(
              invocation.toolCallId,
              invocation.toolName,
              invocation.result as unknown as Record<string, unknown>
            )
          )
        )
      ] as any,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.2,
        maxOutputTokens: 500
      }
    })

    return {
      text: followUp.text?.trim() || this.buildToolFallbackMessage(toolInvocations),
      toolInvocations
    }
  }

  static async generateResponse(input: NexaServiceInput): Promise<NexaResponse> {
    const client = await getGoogleGenAIClient()
    const model = getGreenhouseAgentModel()
    const systemPrompt = this.buildSystemPrompt(input.context)

    try {
      const result = await this.resolveToolTurn({
        client,
        model,
        systemPrompt,
        input
      })

      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.text,
        timestamp: this.getTimestamp(),
        suggestions: [],
        toolInvocations: result.toolInvocations
      }
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error)

      console.error('Nexa AI generation failed:', error)

      if (this.isVertexPermissionDenied(errorMessage)) {
        console.warn('Nexa AI permission denied on Vertex AI, serving graceful fallback response.')

        return this.buildPermissionDeniedFallback(input.context)
      }

      throw new Error(errorMessage)
    }
  }
}
