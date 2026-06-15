import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

  afterEach(() => {
    vi.unstubAllEnvs()
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
      .mockResolvedValueOnce({
        text: '{"suggestions":["¿Qué sigue en payroll?","¿Hubo errores?","¿Qué cambió vs el mes pasado?"]}'
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
    expect(mockGenerateContent).toHaveBeenCalledTimes(3)
    expect(response.content).toContain('nómina')
    expect(response.suggestions).toHaveLength(3)
    expect(response.toolInvocations).toHaveLength(1)
    expect(response.toolInvocations?.[0]?.toolName).toBe('check_payroll')
  })

  it('no anexa un bloque textual de "Fuentes:" cuando el modelo omite citas inline (la UI es dueña de la evidencia, TASK-1124)', async () => {
    vi.stubEnv('NEXA_KNOWLEDGE_RETRIEVAL_ENABLED', 'true')

    mockGenerateContent
      .mockResolvedValueOnce({
        text: '',
        functionCalls: [
          {
            id: 'tool-knowledge-1',
            name: 'search_knowledge',
            args: { query: '¿Cómo reviso mis métricas ICO?' }
          }
        ]
      })
      .mockResolvedValueOnce({
        text: 'Para revisar tus métricas ICO, entra a Mi Desempeño y revisa los indicadores por objetivo.'
      })
      .mockResolvedValueOnce({
        text: '{"suggestions":["¿Qué significa OTD?","¿Qué significa RpA?","¿Dónde veo mis objetivos?"]}'
      })

    mockExecuteNexaTool.mockResolvedValue({
      toolCallId: 'tool-knowledge-1',
      toolName: 'search_knowledge',
      args: { query: '¿Cómo reviso mis métricas ICO?' },
      result: {
        available: true,
        summary: 'Recuperé 2 fragmentos de Knowledge.',
        source: 'postgres',
        scopeLabel: 'Knowledge',
        generatedAt: '2026-06-12T12:00:00.000Z',
        metrics: [],
        raw: {
          packet: {
            contractVersion: 'knowledge-search.v1',
            query: '¿Cómo reviso mis métricas ICO?',
            generatedAt: '2026-06-12T12:00:00.000Z',
            mode: 'agentic',
            accessScope: {
              tenantType: 'efeonce_internal',
              tenantId: null,
              userId: 'user-1',
              roleCodes: ['efeonce_admin'],
              routeGroups: ['internal'],
              capabilities: ['knowledge.agentic.retrieve']
            },
            confidence: 'high',
            freshness: 'current',
            chunks: [
              {
                chunkId: 'chunk-1',
                documentId: 'doc-1',
                documentVersionId: 'version-1',
                title: 'Manual: Cómo usar Mi Desempeño',
                headingPath: ['Introducción', 'Propósito'],
                text: 'Mi Desempeño permite revisar objetivos e indicadores.',
                sourceUrl: null,
                humanUrl: '/knowledge/mi-desempeno',
                citationLabel: 'Manual: Cómo usar Mi Desempeño',
                score: 0.93,
                updatedAt: '2026-06-01T00:00:00.000Z',
                freshness: 'current',
                sensitivity: 'internal'
              },
              {
                chunkId: 'chunk-2',
                documentId: 'doc-2',
                documentVersionId: 'version-2',
                title: 'Glosario: Métricas ICO personales',
                headingPath: ['Impacto'],
                text: 'Impacto mide contribución a objetivos clave.',
                sourceUrl: null,
                humanUrl: '/knowledge/glosario-ico',
                citationLabel: 'Glosario: Métricas ICO personales',
                score: 0.87,
                updatedAt: '2026-06-01T00:00:00.000Z',
                freshness: 'current',
                sensitivity: 'internal'
              }
            ],
            deniedOrFilteredCount: 0,
            notes: []
          }
        }
      }
    })

    const response = await NexaService.generateResponse({
      prompt: '¿Cómo reviso mis métricas ICO?',
      history: [],
      context: {
        user: { firstName: 'Julio', lastName: null, role: 'admin' },
        greeting: { title: '', subtitle: '' },
        modules: [],
        tasks: [],
        nexaIntro: '',
        computedAt: '2026-06-12T00:00:00.000Z'
      },
      runtimeContext
    })

    // TASK-1124 — la respuesta NO se modifica: el modelo respondió sin [n], y ya NO se anexa un
    // bloque textual de "Fuentes:" (la interfaz muestra las fuentes vía el packet de evidencia).
    expect(response.content).toBe(
      'Para revisar tus métricas ICO, entra a Mi Desempeño y revisa los indicadores por objetivo.'
    )
    expect(response.content).not.toContain('Fuentes:')
  })

  it('does not fabricate a sources block when Knowledge confidence is none', async () => {
    vi.stubEnv('NEXA_KNOWLEDGE_RETRIEVAL_ENABLED', 'true')

    mockGenerateContent
      .mockResolvedValueOnce({
        text: '',
        functionCalls: [
          {
            id: 'tool-knowledge-empty',
            name: 'search_knowledge',
            args: { query: 'zxqv procedimiento inexistente' }
          }
        ]
      })
      .mockResolvedValueOnce({
        text: 'No encontré una guía publicada para esa consulta en Knowledge.'
      })
      .mockResolvedValueOnce({
        text: '{"suggestions":["Probar otra búsqueda","Revisar manuales","Reportar falta"]}'
      })

    mockExecuteNexaTool.mockResolvedValue({
      toolCallId: 'tool-knowledge-empty',
      toolName: 'search_knowledge',
      args: { query: 'zxqv procedimiento inexistente' },
      result: {
        available: true,
        summary: 'No hay una guía publicada para esa consulta.',
        source: 'postgres',
        scopeLabel: 'Knowledge',
        generatedAt: '2026-06-12T12:00:00.000Z',
        metrics: [],
        raw: {
          packet: {
            contractVersion: 'knowledge-search.v1',
            query: 'zxqv procedimiento inexistente',
            generatedAt: '2026-06-12T12:00:00.000Z',
            mode: 'agentic',
            accessScope: {
              tenantType: 'efeonce_internal',
              tenantId: null,
              userId: 'user-1',
              roleCodes: ['efeonce_admin'],
              routeGroups: ['internal'],
              capabilities: ['knowledge.agentic.retrieve']
            },
            confidence: 'none',
            freshness: 'unknown',
            chunks: [],
            deniedOrFilteredCount: 0,
            notes: []
          }
        }
      }
    })

    const response = await NexaService.generateResponse({
      prompt: 'zxqv procedimiento inexistente',
      history: [],
      context: {
        user: { firstName: 'Julio', lastName: null, role: 'admin' },
        greeting: { title: '', subtitle: '' },
        modules: [],
        tasks: [],
        nexaIntro: '',
        computedAt: '2026-06-12T00:00:00.000Z'
      },
      runtimeContext
    })

    expect(response.content).not.toContain('Fuentes:')
    expect(response.content).not.toContain('[1]')
  })

  it('adds inline citation and human-validation rules to the system prompt when Knowledge is enabled', async () => {
    vi.stubEnv('NEXA_KNOWLEDGE_RETRIEVAL_ENABLED', 'true')
    mockGenerateContent.mockResolvedValue({ text: 'Listo.' })

    await NexaService.generateResponse({
      prompt: '¿Cómo funciona una guía de nómina?',
      history: [],
      context: {
        user: { firstName: 'Julio', lastName: null, role: 'admin' },
        greeting: { title: '', subtitle: '' },
        modules: [],
        tasks: [],
        nexaIntro: '',
        computedAt: '2026-06-12T00:00:00.000Z'
      },
      runtimeContext
    })

    const systemInstruction = mockGenerateContent.mock.calls[0]?.[0]?.config?.systemInstruction

    expect(systemInstruction).toContain('Usa marcadores inline [n]')
    expect(systemInstruction).toContain('cita siempre con [n]')
    expect(systemInstruction).toContain('validación humana')
  })
})
