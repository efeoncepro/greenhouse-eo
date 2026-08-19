import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  withSession: vi.fn(),
  getAssessment: vi.fn(),
  buildView: vi.fn(),
  assessmentPage: vi.fn(),
}))

vi.mock('next/headers', () => ({ cookies: mocks.cookies }))
vi.mock('@/components/greenhouse/hiring/assessment/AssessmentTakingPage', () => ({
  default: mocks.assessmentPage,
}))
vi.mock('@/lib/hiring/assessment/public-session/service', () => ({
  withPublicAssessmentSession: mocks.withSession,
}))
vi.mock('@/lib/hiring/assessment/instances', () => ({ getAssessmentByIdWithClient: mocks.getAssessment }))
vi.mock('@/lib/hiring/assessment/public-taking', () => ({ buildPublicAssessmentViewWithClient: mocks.buildView }))

const { default: PublicAssessmentSessionPage } = await import('./page')

describe('/public/assessment/session', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.cookies.mockResolvedValue({
      get: vi.fn(() => ({ value: 'session-A' })),
    })
    mocks.withSession.mockImplementation(async (
      _raw: string,
      callback: (client: object, session: { assessmentId: string }) => unknown,
    ) => callback({}, { assessmentId: 'asmt-A' }))
    mocks.getAssessment.mockResolvedValue({ assessmentId: 'asmt-A' })
    mocks.buildView.mockResolvedValue({ assessment: { assessmentId: 'asmt-A' } })
  })

  it('B inválido o error de red muestra unavailable sin resolver ni renderizar la cookie A', async () => {
    const element = await PublicAssessmentSessionPage({
      searchParams: Promise.resolve({ unavailable: '1' }),
    })

    expect(element.props.initialAssessment).toBeNull()
    expect(mocks.cookies).not.toHaveBeenCalled()
    expect(mocks.withSession).not.toHaveBeenCalled()
    expect(JSON.stringify(element.props)).not.toContain('asmt-A')
  })

  it('una navegación limpia posterior puede reanudar A porque el fallo no borra su cookie', async () => {
    const element = await PublicAssessmentSessionPage({ searchParams: Promise.resolve({}) })

    expect(mocks.withSession).toHaveBeenCalledWith('session-A', expect.any(Function))
    expect(element.props.initialAssessment).toEqual({ assessment: { assessmentId: 'asmt-A' } })
  })

  it('después de un exchange B válido, un reload limpio refleja B y nunca presenta A', async () => {
    mocks.cookies.mockResolvedValue({ get: vi.fn(() => ({ value: 'session-B' })) })
    mocks.withSession.mockImplementation(async (
      _raw: string,
      callback: (client: object, session: { assessmentId: string }) => unknown,
    ) => callback({}, { assessmentId: 'asmt-B' }))
    mocks.getAssessment.mockResolvedValue({ assessmentId: 'asmt-B' })
    mocks.buildView.mockResolvedValue({ assessment: { assessmentId: 'asmt-B' } })

    const element = await PublicAssessmentSessionPage({ searchParams: Promise.resolve({}) })

    expect(mocks.withSession).toHaveBeenCalledWith('session-B', expect.any(Function))
    expect(element.props.initialAssessment).toEqual({ assessment: { assessmentId: 'asmt-B' } })
    expect(JSON.stringify(element.props)).not.toContain('asmt-A')
  })
})
