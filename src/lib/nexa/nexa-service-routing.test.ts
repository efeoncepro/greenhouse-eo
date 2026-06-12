import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

// Mock de ambos providers para probar la selección + failover del orquestador sin SDKs.
const geminiResolveTurn = vi.fn<(input: unknown) => unknown>()
const geminiSuggestions = vi.fn<(input: unknown) => Promise<string[]>>(async () => [])
const anthropicResolveTurn = vi.fn<(input: unknown) => unknown>()
const anthropicSuggestions = vi.fn<(input: unknown) => Promise<string[]>>(async () => [])

vi.mock('./providers/gemini', () => ({
  GeminiNexaProvider: class {
    readonly providerKey = 'google' as const
    resolveTurn = (input: unknown) => geminiResolveTurn(input)
    generateSuggestions = (input: unknown) => geminiSuggestions(input)
  }
}))

vi.mock('./providers/anthropic', () => ({
  AnthropicNexaProvider: class {
    readonly providerKey = 'anthropic' as const
    resolveTurn = (input: unknown) => anthropicResolveTurn(input)
    generateSuggestions = (input: unknown) => anthropicSuggestions(input)
  }
}))

const mockGetNexaProviderOverride = vi.fn<() => 'google' | 'anthropic' | null>(() => null)
const mockIsAutoRouter = vi.fn(() => false)
const mockIsKnowledge = vi.fn(() => false)

vi.mock('./flags', () => ({
  getNexaProviderOverride: () => mockGetNexaProviderOverride(),
  isNexaAutoRouterEnabled: () => mockIsAutoRouter(),
  isNexaKnowledgeRetrievalEnabled: () => mockIsKnowledge()
}))

vi.mock('@/lib/ai/google-genai', () => ({
  getGreenhouseAgentModel: () => 'google/gemini-2.5-flash@default'
}))

const { NexaService } = await import('./nexa-service')

const runtimeContext = {
  userId: 'user-1',
  clientId: 'client-1',
  clientName: 'Acme',
  tenantType: 'efeonce_internal' as const,
  role: 'admin',
  roleCodes: ['efeonce_admin'],
  routeGroups: ['internal', 'admin', 'finance', 'hr'],
  timezone: 'America/Santiago'
}

const baseContext = {
  user: { firstName: 'Julio', lastName: null, role: 'admin' },
  greeting: { title: '', subtitle: '' },
  modules: [],
  tasks: [],
  nexaIntro: '',
  computedAt: '2026-06-12T00:00:00.000Z'
}

const runWith = (prompt: string, requestedModel?: string) =>
  NexaService.generateResponse({ prompt, history: [], context: baseContext, runtimeContext, requestedModel })

describe('NexaService provider routing (TASK-1091)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetNexaProviderOverride.mockReturnValue(null)
    mockIsAutoRouter.mockReturnValue(false)
    mockIsKnowledge.mockReturnValue(false)
    geminiResolveTurn.mockResolvedValue({ text: 'respuesta gemini', toolInvocations: [] })
    anthropicResolveTurn.mockResolvedValue({ text: 'respuesta claude', toolInvocations: [] })
  })

  it('default (sin flags) usa Gemini con el modelo del agente', async () => {
    const response = await runWith('Hola Nexa')

    expect(response.content).toBe('respuesta gemini')
    expect(response.modelId).toBe('google/gemini-2.5-flash@default')
    expect(geminiResolveTurn).toHaveBeenCalledTimes(1)
    expect(anthropicResolveTurn).not.toHaveBeenCalled()
  })

  it('NEXA_PROVIDER=anthropic fija Claude sin failover', async () => {
    mockGetNexaProviderOverride.mockReturnValue('anthropic')

    const response = await runWith('Hola Nexa')

    expect(response.content).toBe('respuesta claude')
    expect(response.modelId).toBe('anthropic/claude-sonnet-4-6@default')
    expect(anthropicResolveTurn).toHaveBeenCalledTimes(1)
    expect(geminiResolveTurn).not.toHaveBeenCalled()
  })

  it('modelo pedido explícito (soportado) gana y deriva su provider', async () => {
    // El modelo Anthropic NO está en el picker (NEXA_MODEL_OPTIONS); la activación es por
    // router/pin. Un modelo soportado del picker (Gemini Pro) sí se honra explícito.
    const response = await runWith('Hola Nexa', 'google/gemini-2.5-pro@default')

    expect(response.modelId).toBe('google/gemini-2.5-pro@default')
    expect(geminiResolveTurn).toHaveBeenCalledTimes(1)
    expect(anthropicResolveTurn).not.toHaveBeenCalled()
  })

  it('auto-router: pregunta de conocimiento con retrieval ON va a Claude primero', async () => {
    mockIsAutoRouter.mockReturnValue(true)
    mockIsKnowledge.mockReturnValue(true)

    const response = await runWith('¿Cómo se configura un nuevo cliente?')

    expect(response.modelId).toBe('anthropic/claude-sonnet-4-6@default')
    expect(anthropicResolveTurn).toHaveBeenCalledTimes(1)
    expect(geminiResolveTurn).not.toHaveBeenCalled()
  })

  it('auto-router: si el primario falla, hace failover al otro provider', async () => {
    mockIsAutoRouter.mockReturnValue(true)
    mockIsKnowledge.mockReturnValue(true)
    anthropicResolveTurn.mockRejectedValue(new Error('anthropic 529 overloaded'))

    const response = await runWith('¿Qué es el ICO?')

    expect(anthropicResolveTurn).toHaveBeenCalledTimes(1)
    expect(geminiResolveTurn).toHaveBeenCalledTimes(1)
    expect(response.content).toBe('respuesta gemini')
    expect(response.modelId).toBe('google/gemini-2.5-flash@default')
  })

  it('auto-router: pregunta operativa se queda en Gemini (tiene tool en vivo)', async () => {
    mockIsAutoRouter.mockReturnValue(true)
    mockIsKnowledge.mockReturnValue(true)

    const response = await runWith('¿Cómo va la nómina este mes?')

    expect(response.modelId).toBe('google/gemini-2.5-flash@default')
    expect(geminiResolveTurn).toHaveBeenCalledTimes(1)
    expect(anthropicResolveTurn).not.toHaveBeenCalled()
  })
})
