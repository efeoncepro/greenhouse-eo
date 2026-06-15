import 'server-only'

import {
  DEFAULT_NEXA_ANTHROPIC_MODEL,
  isSupportedNexaModel,
  resolveNexaModel,
  resolveNexaProviderKey,
  type NexaModelId,
  type NexaProviderKey
} from '@/config/nexa-models'
import { getGreenhouseAgentModel } from '@/lib/ai/google-genai'
import type { NexaMessage, HomeSnapshot } from '@/types/home'

import { getNexaProviderOverride, isNexaAutoRouterEnabled, isNexaKnowledgeRetrievalEnabled } from './flags'
import { buildNexaSystemPrompt, type NexaSystemPromptResult } from './nexa-system-prompt'
import { classifyNexaIntent, nexaProviderFailoverChain, routeNexaProviderKey } from './nexa-model-router'
import type { NexaResponse, NexaRuntimeContext } from './nexa-contract'
import type { NexaChatProvider } from './nexa-provider'
import { AnthropicNexaProvider } from './providers/anthropic'
import { GeminiNexaProvider } from './providers/gemini'

interface NexaServiceInput {
  prompt: string
  history: NexaMessage[]
  context: HomeSnapshot
  runtimeContext: NexaRuntimeContext
  requestedModel?: string | null
}

interface NexaProviderStep {
  providerKey: NexaProviderKey
  model: NexaModelId
}

const createNexaProvider = (providerKey: NexaProviderKey): NexaChatProvider =>
  providerKey === 'anthropic' ? new AnthropicNexaProvider() : new GeminiNexaProvider()

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

  // TASK-1124 — el system prompt vive como artefacto versionado en `nexa-system-prompt.ts`
  // (V1 byte-equivalente + V2 modular detrás de flag). Devuelve metadata de governance.
  private static buildSystemPrompt(context: HomeSnapshot): NexaSystemPromptResult {
    return buildNexaSystemPrompt(context)
  }

  // TASK-1124 — el post-procesador que anexaba "Fuentes: [n] = …" cuando el modelo no citaba
  // inline se removió: la interfaz es dueña de la evidencia (panel de procedencia, packet-driven),
  // así que un volcado textual de fuentes es redundante y contradice la política de citas inline.

  /** Modelo por defecto de cada provider. Gemini preserva la resolución actual (agente). */
  private static defaultModelForProvider(providerKey: NexaProviderKey, input: NexaServiceInput): NexaModelId {
    if (providerKey === 'anthropic') {
      return DEFAULT_NEXA_ANTHROPIC_MODEL
    }

    return resolveNexaModel({
      requestedModel: input.requestedModel,
      fallbackModel: getGreenhouseAgentModel()
    })
  }

  /**
   * TASK-1091 — plan de providers (primario + failover). Orden de decisión:
   *   1. modelo pedido explícito (gana, deriva su provider) — single, sin failover.
   *   2. pin `NEXA_PROVIDER` — single, sin failover (intención del operador).
   *   3. router `NEXA_AUTO_ROUTER_ENABLED` — primario por intención + failover al otro.
   *   4. default — Gemini, comportamiento idéntico al previo a TASK-1091 (single).
   */
  private static buildProviderPlan(input: NexaServiceInput): NexaProviderStep[] {
    if (isSupportedNexaModel(input.requestedModel)) {
      return [{ providerKey: resolveNexaProviderKey(input.requestedModel), model: input.requestedModel }]
    }

    const override = getNexaProviderOverride()

    if (override) {
      return [{ providerKey: override, model: this.defaultModelForProvider(override, input) }]
    }

    if (isNexaAutoRouterEnabled()) {
      const intent = classifyNexaIntent(input.prompt)
      const primary = routeNexaProviderKey({ intent, knowledgeRetrievalEnabled: isNexaKnowledgeRetrievalEnabled() })

      return nexaProviderFailoverChain(primary).map(providerKey => ({
        providerKey,
        model: this.defaultModelForProvider(providerKey, input)
      }))
    }

    return [{ providerKey: 'google', model: this.defaultModelForProvider('google', input) }]
  }

  static async generateResponse(input: NexaServiceInput): Promise<NexaResponse> {
    const plan = this.buildProviderPlan(input)
    const systemPromptResult = this.buildSystemPrompt(input.context)

    let lastError: unknown

    for (let index = 0; index < plan.length; index += 1) {
      const step = plan[index]
      const isLastStep = index === plan.length - 1
      const provider = createNexaProvider(step.providerKey)

      try {
        const turn = await provider.resolveTurn({
          systemPrompt: systemPromptResult.text,
          history: input.history,
          prompt: input.prompt,
          runtimeContext: input.runtimeContext,
          context: input.context,
          model: step.model
        })

        const content = turn.text

        const suggestions = await provider.generateSuggestions({
          model: step.model,
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
          modelId: step.model
        }
      } catch (error) {
        lastError = error

        const errorMessage = this.extractErrorMessage(error)

        console.error(`Nexa AI generation failed (provider=${step.providerKey}):`, error)

        if (!isLastStep) {
          console.warn(`Nexa AI failing over from ${step.providerKey} to ${plan[index + 1].providerKey}.`)

          continue
        }

        if (this.isVertexPermissionDenied(errorMessage)) {
          console.warn('Nexa AI permission denied on Vertex AI, serving graceful fallback response.')

          return this.buildPermissionDeniedFallback(input.context, step.model)
        }

        throw new Error(errorMessage)
      }
    }

    // Inalcanzable: el plan siempre tiene ≥1 paso y el último relanza o degrada.
    throw new Error(this.extractErrorMessage(lastError))
  }
}
