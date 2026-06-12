import 'server-only'

import { resolveNexaModel, type NexaModelId } from '@/config/nexa-models'
import { getGreenhouseAgentModel } from '@/lib/ai/google-genai'
import { KNOWLEDGE_SEARCH_CONTRACT_VERSION, type KnowledgeRetrievalPacket } from '@/lib/knowledge/search'
import type { NexaMessage, HomeSnapshot } from '@/types/home'

import { isNexaKnowledgeRetrievalEnabled } from './flags'
import type { NexaResponse, NexaRuntimeContext, NexaToolInvocation } from './nexa-contract'
import type { NexaChatProvider } from './nexa-provider'
import { GeminiNexaProvider } from './providers/gemini'

interface NexaServiceInput {
  prompt: string
  history: NexaMessage[]
  context: HomeSnapshot
  runtimeContext: NexaRuntimeContext
  requestedModel?: string | null
}

/**
 * Nexa Service: orquestador conversacional de Greenhouse Home.
 *
 * TASK-1091 — provider-agnóstico: construye el system prompt + contexto (lógica
 * compartida), delega el "hablar con el modelo" a un `NexaChatProvider` (Gemini hoy;
 * Claude/router en slices siguientes) y aplica las Answer Rules de knowledge sobre el
 * texto resultante. El tool `search_knowledge` y las Answer Rules (TASK-1085) son
 * provider-agnósticos y NO se tocan.
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

  private static buildPermissionDeniedFallback(context: HomeSnapshot, modelId: NexaModelId): NexaResponse {
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
      toolInvocations: [],
      modelId
    }
  }

  private static buildSystemPrompt(context: HomeSnapshot): string {
    const { user, modules, tasks } = context

    // TASK-1085 — reglas de knowledge SOLO cuando el tool está activo (flag ON);
    // si no, no mencionar un tool que no existe (evita que el modelo lo "alucine").
    const knowledgeRules = isNexaKnowledgeRetrievalEnabled()
      ? [
          '',
          'REGLAS DE BASE DE CONOCIMIENTO (tool search_knowledge):',
          '- Si la pregunta es sobre procesos, políticas, guías, definiciones o "cómo se hace X", usa el tool search_knowledge ANTES de responder.',
          '- Responde SOLO con lo respaldado por los fragmentos recuperados. Usa marcadores inline [n] ligados al fragmento n (ej. "... [1]") y cierra con "Fuentes: [n] = citationLabel".',
          '- Si una fuente viene marcada stale o deprecated, decláralo en la respuesta.',
          '- Si search_knowledge no encuentra documentación (confianza none), di con honestidad que no encontraste una guía publicada y NO inventes la respuesta.',
          '- Distingue guía publicada vs dato operativo en vivo: el conocimiento explica CÓMO funciona algo, no afirma el estado real del usuario. Si te piden su dato real (su ICO, su nómina, su estado), dilo: "No consulté datos actuales ni fuentes fuera de Knowledge. Si necesitas estado productivo, valida en el módulo operativo."',
          '- En temas sensibles (finanzas, nómina, legal, seguridad, compromisos contractuales), responde solo con fuente aprobada, cita siempre con [n] y sugiere validación humana cuando corresponda.'
        ]
      : []

    const financeContext = context.financeStatus
      ? [
          '',
          'SEÑAL FINANCIERA DISPONIBLE:',
          `- Período: ${context.financeStatus.periodLabel}`,
          `- Estado de cierre: ${context.financeStatus.closureStatus || 'provisional'}`,
          `- Readiness: ${context.financeStatus.readinessPct != null ? `${context.financeStatus.readinessPct}%` : 'sin dato'}`,
          `- Margen operativo reciente: ${context.financeStatus.latestMarginPct != null ? `${context.financeStatus.latestMarginPct}% (${context.financeStatus.latestMarginPeriodLabel || 'último período'})` : 'sin dato'}`
        ]
      : []

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
      ...financeContext,
      '',
      'REGLAS DE RESPUESTA:',
      '- Sé conciso, profesional y humano.',
      '- Usa un tono operativo, claro y grounded; no inventes métricas ni estados.',
      '- Si el usuario pregunta por nómina, OTD, correos operativos, capacidad o cuentas por cobrar, usa los tools disponibles antes de responder.',
      '- Si un tool no está disponible por permisos o por falta de datos, dilo con honestidad.',
      '- Si el usuario pregunta por algo que está en sus tareas pendientes, menciónalo directamente.',
      '- Si el usuario pregunta por cierre de período, margen o estado financiero y ya hay señal en contexto, úsala antes de responder con generalidades.',
      '- Mantén las respuestas breves para que quepan bien en el panel de Home.',
      ...knowledgeRules,
      '',
      'Recuerda: Eres parte de Efeonce Group y Greenhouse es la plataforma que materializa la visión de sus proyectos.'
    ].join('\n')
  }

  private static getKnowledgePackets(toolInvocations: NexaToolInvocation[]): KnowledgeRetrievalPacket[] {
    return toolInvocations
      .filter(invocation => invocation.toolName === 'search_knowledge')
      .map(invocation => invocation.result.raw?.packet)
      .filter((packet): packet is KnowledgeRetrievalPacket => {
        if (!packet || typeof packet !== 'object') {
          return false
        }

        const candidate = packet as Partial<KnowledgeRetrievalPacket>

        return candidate.contractVersion === KNOWLEDGE_SEARCH_CONTRACT_VERSION && Array.isArray(candidate.chunks)
      })
  }

  private static buildKnowledgeSourcesBlock(toolInvocations: NexaToolInvocation[]): string | null {
    const citationLabels = this.getKnowledgePackets(toolInvocations)
      .filter(packet => packet.confidence !== 'none' && packet.chunks.length > 0)
      .flatMap(packet => packet.chunks.map(chunk => chunk.citationLabel.trim()))
      .filter(Boolean)

    const uniqueLabels = Array.from(new Set(citationLabels))

    if (uniqueLabels.length === 0) {
      return null
    }

    return ['Fuentes:', ...uniqueLabels.map((label, index) => `[${index + 1}] = ${label}`)].join('\n')
  }

  private static ensureKnowledgeSourcesVisible(text: string, toolInvocations: NexaToolInvocation[]): string {
    if (/\[\d+\]/u.test(text)) {
      return text
    }

    const sourcesBlock = this.buildKnowledgeSourcesBlock(toolInvocations)

    if (!sourcesBlock) {
      return text
    }

    return `${text.trim()}\n\n${sourcesBlock}`
  }

  /**
   * TASK-1091 — selección de provider. Slice 1: siempre Gemini (cero cambio de
   * comportamiento). Slice 3 reemplaza esto por el router interno por intención + failover.
   */
  private static getProvider(): NexaChatProvider {
    return new GeminiNexaProvider()
  }

  static async generateResponse(input: NexaServiceInput): Promise<NexaResponse> {
    const model = resolveNexaModel({
      requestedModel: input.requestedModel,
      fallbackModel: getGreenhouseAgentModel()
    })

    const systemPrompt = this.buildSystemPrompt(input.context)
    const provider = this.getProvider()

    try {
      const turn = await provider.resolveTurn({
        systemPrompt,
        history: input.history,
        prompt: input.prompt,
        runtimeContext: input.runtimeContext,
        context: input.context,
        model
      })

      const content = this.ensureKnowledgeSourcesVisible(turn.text, turn.toolInvocations)

      const suggestions = await provider.generateSuggestions({
        model,
        prompt: input.prompt,
        responseText: content
      })

      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        content,
        timestamp: this.getTimestamp(),
        suggestions,
        toolInvocations: turn.toolInvocations,
        modelId: model
      }
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error)

      console.error('Nexa AI generation failed:', error)

      if (this.isVertexPermissionDenied(errorMessage)) {
        console.warn('Nexa AI permission denied on Vertex AI, serving graceful fallback response.')

        return this.buildPermissionDeniedFallback(input.context, model)
      }

      throw new Error(errorMessage)
    }
  }
}
