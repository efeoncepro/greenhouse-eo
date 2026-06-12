import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockMessagesCreate = vi.fn()
const mockGetAnthropicClient = vi.fn()

vi.mock('@/lib/ai/anthropic', () => ({
  getAnthropicClient: () => mockGetAnthropicClient()
}))

const mockExecuteNexaTool = vi.fn()
const mockGetNexaToolDeclarations = vi.fn(() => [])

vi.mock('../nexa-tools', () => ({
  executeNexaTool: (...args: unknown[]) => mockExecuteNexaTool(...args),
  getNexaToolDeclarations: () => mockGetNexaToolDeclarations()
}))

const { AnthropicNexaProvider } = await import('./anthropic')

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

const baseTurnInput = {
  systemPrompt: 'Eres Nexa.',
  history: [],
  prompt: '¿Cómo va la nómina?',
  runtimeContext,
  context: {
    user: { firstName: 'Julio', lastName: null, role: 'admin' },
    greeting: { title: '', subtitle: '' },
    modules: [],
    tasks: [],
    nexaIntro: '',
    computedAt: '2026-06-12T00:00:00.000Z'
  },
  model: 'anthropic/claude-sonnet-4-6@default'
}

describe('AnthropicNexaProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAnthropicClient.mockResolvedValue({ messages: { create: mockMessagesCreate } })
    mockGetNexaToolDeclarations.mockReturnValue([])
  })

  it('mapea el NexaModelId al sdk model limpio de Claude', async () => {
    mockMessagesCreate.mockResolvedValue({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Todo en orden.' }]
    })

    const provider = new AnthropicNexaProvider()
    const result = await provider.resolveTurn(baseTurnInput)

    expect(result.text).toBe('Todo en orden.')
    expect(result.toolInvocations).toEqual([])
    expect(mockMessagesCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-sonnet-4-6', system: 'Eres Nexa.' })
    )
  })

  it('devuelve texto del primer pase cuando no hay tool_use', async () => {
    mockMessagesCreate.mockResolvedValue({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Respuesta directa.' }]
    })

    const result = await new AnthropicNexaProvider().resolveTurn(baseTurnInput)

    expect(result.text).toBe('Respuesta directa.')
    expect(mockExecuteNexaTool).not.toHaveBeenCalled()
    expect(mockMessagesCreate).toHaveBeenCalledTimes(1)
  })

  it('ejecuta el tool y sintetiza la respuesta en el segundo pase (tool_use_id presente)', async () => {
    mockMessagesCreate
      .mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [
          { type: 'text', text: 'Déjame revisar.' },
          { type: 'tool_use', id: 'toolu_123', name: 'check_payroll', input: {} }
        ]
      })
      .mockResolvedValueOnce({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'La nómina de junio está exportada [1].' }]
      })

    mockExecuteNexaTool.mockResolvedValue({
      toolCallId: 'toolu_123',
      toolName: 'check_payroll',
      args: {},
      result: { available: true, summary: 'Nómina exportada', source: 'postgres', metrics: [], raw: {} }
    })

    const result = await new AnthropicNexaProvider().resolveTurn(baseTurnInput)

    expect(result.text).toBe('La nómina de junio está exportada [1].')
    expect(result.toolInvocations).toHaveLength(1)
    expect(mockExecuteNexaTool).toHaveBeenCalledWith(
      expect.objectContaining({ toolCallId: 'toolu_123', toolName: 'check_payroll', context: runtimeContext })
    )

    const followUpCall = mockMessagesCreate.mock.calls[1][0]
    const toolResultMessage = followUpCall.messages.at(-1)

    expect(toolResultMessage.role).toBe('user')
    expect(toolResultMessage.content[0]).toMatchObject({ type: 'tool_result', tool_use_id: 'toolu_123' })
  })

  it('usa el fallback honesto cuando el follow-up no sintetiza pero hubo señal de tools', async () => {
    mockMessagesCreate
      .mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [{ type: 'tool_use', id: 'toolu_9', name: 'get_otd', input: {} }]
      })
      .mockResolvedValueOnce({ stop_reason: 'end_turn', content: [] })

    mockExecuteNexaTool.mockResolvedValue({
      toolCallId: 'toolu_9',
      toolName: 'get_otd',
      args: {},
      result: { available: true, summary: 'OTD 92%', source: 'postgres', metrics: [], raw: {} }
    })

    const result = await new AnthropicNexaProvider().resolveTurn(baseTurnInput)

    expect(result.text).toContain('OTD 92%')
    expect(result.toolInvocations).toHaveLength(1)
  })

  it('parsea sugerencias JSON aunque Claude prefije prosa', async () => {
    mockMessagesCreate.mockResolvedValue({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Claro:\n{"suggestions":["¿Y el bruto?","¿Headcount?","¿Cuándo se paga?"]}' }]
    })

    const suggestions = await new AnthropicNexaProvider().generateSuggestions({
      model: 'anthropic/claude-sonnet-4-6@default',
      prompt: 'p',
      responseText: 'r'
    })

    expect(suggestions).toEqual(['¿Y el bruto?', '¿Headcount?', '¿Cuándo se paga?'])
  })

  it('degrada a [] cuando las sugerencias fallan', async () => {
    mockMessagesCreate.mockRejectedValue(new Error('rate limit'))

    const suggestions = await new AnthropicNexaProvider().generateSuggestions({
      model: 'anthropic/claude-sonnet-4-6@default',
      prompt: 'p',
      responseText: 'r'
    })

    expect(suggestions).toEqual([])
  })
})
