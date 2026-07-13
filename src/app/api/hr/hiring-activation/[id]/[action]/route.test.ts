import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const requireInternalTenantContextMock = vi.fn()
const canMock = vi.fn()
const resolveHiringActivationBlockerMock = vi.fn()

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
  hiringNotFoundResponse: (message: string, code: string) =>
    Response.json({ error: message, code, actionable: false }, { status: 404 }),
}))

vi.mock('@/lib/hr-core/shared', () => ({
  HrCoreValidationError: class HrCoreValidationError extends Error {
    readonly statusCode = 400
    readonly code = 'hr_core_validation_error'
  },
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn(),
}))

vi.mock('@/lib/observability/redact', () => ({
  redactErrorForResponse: () => 'redacted',
}))

vi.mock('@/lib/workforce/hiring-activation', () => ({
  cancelHiringActivation: vi.fn(),
  completeHiringActivation: vi.fn(),
  createMemberForHiringActivation: vi.fn(),
  getHiringActivationBlockerActionContract: (action: unknown) => {
    if (action === 'retry-open-onboarding') {
      return {
        action,
        requiredCapability: 'hr.onboarding_instance',
        requiredCapabilityAction: 'create',
        requiredScope: 'tenant',
      }
    }

    if (action === 'retry-create-member') {
      return {
        action,
        requiredCapability: 'workforce.member.intake.update',
        requiredCapabilityAction: 'update',
        requiredScope: 'tenant',
      }
    }

    return null
  },
  isHiringActivationEnabled: () => true,
  isHiringActivationError: () => false,
  openOnboardingForHiringActivation: vi.fn(),
  resolveHiringActivationBlocker: (...args: unknown[]) => resolveHiringActivationBlockerMock(...args),
  reviewHiringActivation: vi.fn(),
}))

const { POST } = await import('./route')

const buildRequest = (body: unknown) =>
  new Request('https://greenhouse.local/api/hr/hiring-activation/hhof-1/resolve-blocker', {
    method: 'POST',
    body: JSON.stringify(body),
  })

describe('POST /api/hr/hiring-activation/[id]/resolve-blocker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireInternalTenantContextMock.mockResolvedValue({
      tenant: { userId: 'user-hr', tenantType: 'efeonce_internal' },
      errorResponse: null,
    })
    canMock.mockReturnValue(true)
    resolveHiringActivationBlockerMock.mockResolvedValue({
      status: 'resolved',
      resolved: true,
      detail: { request: { state: 'onboarding_open' }, blockers: [] },
    })
  })

  it('gates retry-open-onboarding with hr.onboarding_instance create', async () => {
    canMock.mockReturnValue(false)

    const response = await POST(buildRequest({
      blockerKey: 'activation:onboarding_template_missing',
      action: 'retry-open-onboarding',
    }), {
      params: Promise.resolve({ id: 'hhof-1', action: 'resolve-blocker' }),
    })

    expect(response.status).toBe(403)
    expect(canMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-hr' }),
      'hr.onboarding_instance',
      'create',
      'tenant',
    )
    expect(resolveHiringActivationBlockerMock).not.toHaveBeenCalled()
  })

  it('executes resolve-blocker after the action-specific capability passes', async () => {
    const response = await POST(buildRequest({
      blockerKey: 'activation:onboarding_template_missing',
      action: 'retry-open-onboarding',
      payload: { reason: 'Template listo.' },
    }), {
      params: Promise.resolve({ id: 'hhof-1', action: 'resolve-blocker' }),
    })

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.resolved).toBe(true)
    expect(resolveHiringActivationBlockerMock).toHaveBeenCalledWith({
      hiringHandoffId: 'hhof-1',
      actorUserId: 'user-hr',
      blockerKey: 'activation:onboarding_template_missing',
      action: 'retry-open-onboarding',
      payload: { reason: 'Template listo.' },
    })
  })

  it('rejects resolve-blocker payloads without blockerKey before executing the command', async () => {
    const response = await POST(buildRequest({
      action: 'retry-open-onboarding',
    }), {
      params: Promise.resolve({ id: 'hhof-1', action: 'resolve-blocker' }),
    })

    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.code).toBe('hiring_activation_blocker_payload_invalid')
    expect(resolveHiringActivationBlockerMock).not.toHaveBeenCalled()
  })
})
