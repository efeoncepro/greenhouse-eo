import { beforeEach, describe, expect, it, vi } from 'vitest'

// TASK-1738 Slice 1 — Ruta colección de runs de scoring IA por assessment exacto.
// Cobertura: allow (200 con runs + confirmEnabled), deny (403 sin capability / 401 sin
// tenant), 400 sin assessmentId y lista vacía (assessment sin runs o inexistente).

vi.mock('server-only', () => ({}))

const requireInternalTenantContextMock = vi.fn()
const canMock = vi.fn()
const listAssessmentAiScoringRunsMock = vi.fn()
const confirmEnabledMock = vi.fn()

vi.mock('@/lib/api/canonical-error-response', () => ({
  canonicalErrorResponse: (kind: string, options?: { extra?: Record<string, unknown> }) =>
    Response.json(
      { error: kind, code: kind, actionable: false, ...(options?.extra ?? {}) },
      { status: kind === 'forbidden' ? 403 : 401 },
    ),
}))

vi.mock('@/lib/tenant/authorization', () => ({
  requireInternalTenantContext: (...args: unknown[]) => requireInternalTenantContextMock(...args),
}))

vi.mock('@/lib/entitlements/runtime', () => ({
  can: (...args: unknown[]) => canMock(...args),
}))

vi.mock('@/lib/hiring', () => ({
  toHiringErrorResponse: (_error: unknown, source: string) =>
    Response.json({ error: 'No se pudo completar la operación de Hiring.', code: 'hiring_internal_error', actionable: true, source }, { status: 500 }),
}))

vi.mock('@/lib/hiring/assessment/ai', () => ({
  listAssessmentAiScoringRuns: (...args: unknown[]) => listAssessmentAiScoringRunsMock(...args),
  isHiringAssessmentAiRunConfirmEnabled: (...args: unknown[]) => confirmEnabledMock(...args),
}))

const { GET } = await import('./route')

const buildRequest = (query: string) =>
  new Request(`https://greenhouse.local/api/hiring/assessments/ai/scoring-runs${query}`)

describe('GET /api/hiring/assessments/ai/scoring-runs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireInternalTenantContextMock.mockResolvedValue({
      tenant: { userId: 'user-ops', tenantType: 'efeonce_internal' },
      errorResponse: null,
    })
    canMock.mockReturnValue(true)
    confirmEnabledMock.mockReturnValue(false)
  })

  it('retorna 401 sin tenant interno', async () => {
    requireInternalTenantContextMock.mockResolvedValue({ tenant: null, errorResponse: null })

    const res = await GET(buildRequest('?assessmentId=asm-1'))

    expect(res.status).toBe(401)
    expect(listAssessmentAiScoringRunsMock).not.toHaveBeenCalled()
  })

  it('retorna 403 canónico sin la capability hiring.assessment.score', async () => {
    canMock.mockReturnValue(false)

    const res = await GET(buildRequest('?assessmentId=asm-1'))

    expect(res.status).toBe(403)
    expect(canMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-ops' }),
      'hiring.assessment.score',
      'execute',
      'tenant',
    )
    expect(listAssessmentAiScoringRunsMock).not.toHaveBeenCalled()
  })

  it('retorna 400 si falta assessmentId (nunca listado global sin scope)', async () => {
    const res = await GET(buildRequest(''))

    expect(res.status).toBe(400)

    const body = (await res.json()) as { code: string }

    expect(body.code).toBe('hiring_invalid_input')
    expect(listAssessmentAiScoringRunsMock).not.toHaveBeenCalled()
  })

  it('retorna 200 con runs del assessment exacto + confirmEnabled del runtime', async () => {
    const run = { runId: 'run-1', assessmentId: 'asm-1', status: 'awaiting_review' }

    listAssessmentAiScoringRunsMock.mockResolvedValue([run])
    confirmEnabledMock.mockReturnValue(true)

    const res = await GET(buildRequest('?assessmentId=asm-1'))

    expect(res.status).toBe(200)
    expect(listAssessmentAiScoringRunsMock).toHaveBeenCalledWith('asm-1')

    const body = (await res.json()) as { runs: unknown[]; confirmEnabled: boolean }

    expect(body.runs).toEqual([run])
    expect(body.confirmEnabled).toBe(true)
  })

  it('retorna 200 con lista vacía para un assessment sin runs (o inexistente)', async () => {
    listAssessmentAiScoringRunsMock.mockResolvedValue([])

    const res = await GET(buildRequest('?assessmentId=asm-sin-runs'))

    expect(res.status).toBe(200)

    const body = (await res.json()) as { runs: unknown[]; confirmEnabled: boolean }

    expect(body.runs).toEqual([])
    expect(body.confirmEnabled).toBe(false)
  })

  it('mapea errores del primitive con el error contract canónico de Hiring', async () => {
    listAssessmentAiScoringRunsMock.mockRejectedValue(new Error('boom'))

    const res = await GET(buildRequest('?assessmentId=asm-1'))

    expect(res.status).toBe(500)

    const body = (await res.json()) as { code: string }

    expect(body.code).toBe('hiring_internal_error')
  })
})
