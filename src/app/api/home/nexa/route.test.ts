import { beforeEach, describe, expect, it, vi } from 'vitest'

// TASK-1131 — el endpoint compartido del chat de Nexa debe devolver el contrato de error
// canónico es-CL (sin error.message crudo) y capturar el fallo por dominio (rollup módulo Home).

const mockGetServerAuthSession = vi.fn()
const mockGenerateResponse = vi.fn()
const mockPersist = vi.fn()
const mockCaptureWithDomain = vi.fn()

vi.mock('@/lib/auth', () => ({
  getServerAuthSession: (...args: unknown[]) => mockGetServerAuthSession(...args)
}))

vi.mock('@/lib/nexa/nexa-service', () => ({
  NexaService: { generateResponse: (...args: unknown[]) => mockGenerateResponse(...args) }
}))

vi.mock('@/lib/nexa/store', () => ({
  persistNexaConversation: (...args: unknown[]) => mockPersist(...args)
}))

vi.mock('@/lib/home/build-home-entitlements-context', () => ({
  buildHomeEntitlementsContext: () => ({
    canSeeFinanceStatus: false,
    visibleCapabilityModules: [],
    recommendedShortcuts: [],
    accessContext: {}
  })
}))

vi.mock('@/lib/home/get-home-snapshot', () => ({
  getHomeFinanceStatus: vi.fn()
}))

vi.mock('@/config/nexa-models', () => ({
  resolveNexaModel: () => 'google/gemini-2.5-flash@default',
  // TASK-1134 — sin modelMode/model en el payload del test → auto → null (NexaService decide).
  resolveNexaRequestedModel: () => null
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mockCaptureWithDomain(...args)
}))

import { POST } from '@/app/api/home/nexa/route'

const sessionUser = {
  userId: 'user-1',
  name: 'Julio Reyes',
  role: 'efeonce_admin',
  tenantType: 'efeonce_internal',
  roleCodes: ['efeonce_admin'],
  routeGroups: ['internal'],
  authorizedViews: [],
  businessLines: [],
  serviceModules: [],
  portalHomePath: '/home'
}

const postReq = (body: unknown) =>
  new Request('http://localhost/api/home/nexa', { method: 'POST', body: JSON.stringify(body) })

describe('POST /api/home/nexa — canonical error contract (TASK-1131)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetServerAuthSession.mockResolvedValue({ user: sessionUser })
  })

  it('sin sesión → 401 canónico es-CL (sin prosa inglesa cruda)', async () => {
    mockGetServerAuthSession.mockResolvedValue(null)

    const res = await POST(postReq({ prompt: 'hola' }))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.code).toBe('unauthorized')
    expect(body.error).not.toBe('Unauthorized')
    expect(body.error).toMatch(/sesión/i)
  })

  it('sin prompt → 422 canónico nexa_prompt_required', async () => {
    const res = await POST(postReq({}))
    const body = await res.json()

    expect(res.status).toBe(422)
    expect(body.code).toBe('nexa_prompt_required')
    expect(body.actionable).toBe(true)
  })

  it('fallo de generación → 500 canónico es-CL + captureWithDomain(home), sin filtrar error.message', async () => {
    mockGenerateResponse.mockRejectedValue(new Error('Vertex 500: internal model overload xyz-secret'))

    const res = await POST(postReq({ prompt: '¿Qué es Efeonce?' }))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.code).toBe('nexa_generation_failed')
    expect(body.actionable).toBe(true)
    // NUNCA el detalle técnico crudo al cliente.
    expect(JSON.stringify(body)).not.toContain('Vertex')
    expect(JSON.stringify(body)).not.toContain('secret')
    // El fallo se rolea al módulo Home del reliability dashboard.
    expect(mockCaptureWithDomain).toHaveBeenCalledTimes(1)

    const [, domain, options] = mockCaptureWithDomain.mock.calls[0]

    expect(domain).toBe('home')
    expect(options.tags.source).toBe('nexa_chat_endpoint')
  })

  it('camino feliz → 200 con la respuesta + threadId persistido', async () => {
    mockGenerateResponse.mockResolvedValue({
      id: 'resp-1',
      content: 'Respuesta',
      suggestions: [],
      toolInvocations: [],
      modelId: 'google/gemini-2.5-flash@default'
    })
    mockPersist.mockResolvedValue('thread-1')

    const res = await POST(postReq({ prompt: 'hola' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.threadId).toBe('thread-1')
    expect(body.content).toBe('Respuesta')
    expect(mockCaptureWithDomain).not.toHaveBeenCalled()
  })
})
