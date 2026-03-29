import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockGenerateContent = vi.fn()
const mockGetGoogleGenAIClient = vi.fn()
const mockGetGreenhouseAgentModel = vi.fn(() => 'google/gemini-2.5-flash@default')

vi.mock('@/lib/ai/google-genai', () => ({
  getGoogleGenAIClient: () => mockGetGoogleGenAIClient(),
  getGreenhouseAgentModel: () => mockGetGreenhouseAgentModel()
}))

const mockExecuteNexaTool = vi.fn()
const mockGetNexaToolDeclarations = vi.fn(() => [])

vi.mock('./nexa-tools', () => ({
  executeNexaTool: (...args: unknown[]) => mockExecuteNexaTool(...args),
  getNexaToolDeclarations: () => mockGetNexaToolDeclarations()
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

describe('NexaService', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockGetGoogleGenAIClient.mockResolvedValue({
      models: {
        generateContent: mockGenerateContent
      }
    })
  })

  it('returns the model response when Vertex succeeds', async () => {
    mockGenerateContent.mockResolvedValue({ text: 'Hola, Julio. Todo en orden.' })

    const response = await NexaService.generateResponse({
      prompt: 'Hola',
      history: [],
      context: {
        user: { firstName: 'Julio', lastName: null, role: 'admin' },
        greeting: { title: '', subtitle: '' },
        modules: [],
        tasks: [],
        nexaIntro: '',
        computedAt: '2026-03-28T00:00:00.000Z'
      },
      runtimeContext
    })

    expect(response.role).toBe('assistant')
    expect(response.content).toBe('Hola, Julio. Todo en orden.')
    expect(mockGenerateContent).toHaveBeenCalledWith(expect.objectContaining({
      model: 'google/gemini-2.5-flash@default',
      config: expect.objectContaining({
        systemInstruction: expect.stringContaining('Eres Nexa, el asistente inteligente de Greenhouse.')
      })
    }))
  })

  it('falls back gracefully when Vertex denies predict permission', async () => {
    mockGenerateContent.mockRejectedValue(
      new Error("Permission 'aiplatform.endpoints.predict' denied on resource '//aiplatform.googleapis.com/projects/efeonce-group/locations/global/publishers/google/models/google/gemini-2.5-flash@default'")
    )

    const response = await NexaService.generateResponse({
      prompt: 'Hola',
      history: [],
      context: {
        user: { firstName: 'Julio', lastName: null, role: 'admin' },
        greeting: { title: '', subtitle: '' },
        modules: [
          { id: 'agency', title: 'Agencia', subtitle: 'Command Center', icon: 'tabler-building', route: '/agency', color: 'primary' },
          { id: 'finance', title: 'Finanzas', subtitle: 'Resumen', icon: 'tabler-report-money', route: '/finance', color: 'info' }
        ],
        tasks: [],
        nexaIntro: '',
        computedAt: '2026-03-28T00:00:00.000Z'
      },
      runtimeContext
    })

    expect(response.role).toBe('assistant')
    expect(response.content).toContain('no pude conectarme al motor de IA')
    expect(response.content).toContain('Agencia')
    expect(response.content).toContain('Finanzas')
  })

  it('rethrows non-permission Vertex errors with the original message', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Model overloaded'))

    await expect(
      NexaService.generateResponse({
        prompt: 'Hola',
        history: [],
        context: {
          user: { firstName: 'Julio', lastName: null, role: 'admin' },
          greeting: { title: '', subtitle: '' },
          modules: [],
          tasks: [],
          nexaIntro: '',
          computedAt: '2026-03-28T00:00:00.000Z'
        },
        runtimeContext
      })
    ).rejects.toThrow('Model overloaded')
  })

  it('executes Nexa tools and returns structured tool invocations when Gemini asks for them', async () => {
    mockGenerateContent
      .mockResolvedValueOnce({
        text: '',
        functionCalls: [
          {
            id: 'tool-1',
            name: 'check_payroll',
            args: {}
          }
        ]
      })
      .mockResolvedValueOnce({
        text: 'La nómina 03/2026 ya está exportada con 14 registros.'
      })

    mockExecuteNexaTool.mockResolvedValue({
      toolCallId: 'tool-1',
      toolName: 'check_payroll',
      args: {},
      result: {
        available: true,
        summary: 'La nómina 03/2026 está exportada.',
        source: 'postgres',
        scopeLabel: 'Payroll',
        generatedAt: '2026-03-28T12:00:00.000Z',
        metrics: [{ label: 'Estado', value: 'exported', tone: 'success' }]
      }
    })

    const response = await NexaService.generateResponse({
      prompt: '¿Cómo va la nómina?',
      history: [],
      context: {
        user: { firstName: 'Julio', lastName: null, role: 'admin' },
        greeting: { title: '', subtitle: '' },
        modules: [],
        tasks: [],
        nexaIntro: '',
        computedAt: '2026-03-28T00:00:00.000Z'
      },
      runtimeContext
    })

    expect(mockGetNexaToolDeclarations).toHaveBeenCalled()
    expect(mockExecuteNexaTool).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: 'tool-1',
      toolName: 'check_payroll',
      context: runtimeContext
    }))
    expect(mockGenerateContent).toHaveBeenCalledTimes(2)
    expect(response.content).toContain('nómina')
    expect(response.toolInvocations).toHaveLength(1)
    expect(response.toolInvocations?.[0]?.toolName).toBe('check_payroll')
  })
})
