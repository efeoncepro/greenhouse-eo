import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  can: vi.fn(),
  read: vi.fn(),
  propose: vi.fn(),
  confirm: vi.fn()
}))

vi.mock('@/lib/entitlements/runtime', () => ({ can: mocks.can }))
vi.mock('@/lib/hiring', () => ({
  isHiringError: (e: unknown) => Boolean(e && typeof e === 'object' && 'code' in (e as object)),
  readHiringApplicationOutcome: mocks.read,
  proposeHiringApplicationDecision: mocks.propose,
  confirmHiringApplicationDecision: mocks.confirm
}))

import {
  confirmAppHiringApplicationDecision,
  getAppHiringApplicationOutcome,
  proposeAppHiringApplicationDecision
} from './app-hiring-application-decision'

const context = (overrides: Record<string, unknown> = {}) =>
  ({
    tenant: { tenantType: 'efeonce_internal', userId: 'user-1' },
    authSource: 'cookie_session',
    requestId: 'req-1',
    oauthCorrelationId: null,
    ...overrides
  }) as never

const request = () => new Request('https://x.test', { headers: { 'idempotency-key': 'idem-1' } })

describe('TASK-1773 — el lane app del eje de desenlace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.can.mockReturnValue(true)
    mocks.read.mockResolvedValue({ applicationId: 'app-1', closed: false })
    mocks.propose.mockResolvedValue({ effectDigest: 'hdp-x' })
    mocks.confirm.mockResolvedValue({ idempotentReplay: false })
  })

  it('falla cerrado para un tenant cliente', async () => {
    await expect(
      getAppHiringApplicationOutcome({ context: context({ tenant: { tenantType: 'client', userId: 'u' } }), applicationId: 'app-1' })
    ).rejects.toMatchObject({ errorCode: 'forbidden' })
  })

  it('falla cerrado sin la capability, aunque el tenant sea interno', async () => {
    mocks.can.mockReturnValue(false)

    await expect(getAppHiringApplicationOutcome({ context: context(), applicationId: 'app-1' })).rejects.toMatchObject({
      errorCode: 'forbidden'
    })
  })

  it('🔴 un agente delegado puede LEER y PROPONER, pero NO confirmar', async () => {
    const delegated = context({ authSource: 'sister_platform_oauth' })

    // Leer y proponer: permitidos.
    await expect(getAppHiringApplicationOutcome({ context: delegated, applicationId: 'app-1' })).resolves.toBeTruthy()
    await expect(proposeAppHiringApplicationDecision({ context: delegated, applicationId: 'app-1', body: {} })).resolves.toBeTruthy()

    // Confirmar: fail-closed. `efeonce.mcp.hiring.write` no existe y está bloqueado hasta TASK-1631.
    await expect(
      confirmAppHiringApplicationDecision({ context: delegated, request: request(), applicationId: 'app-1', body: {} })
    ).rejects.toMatchObject({ errorCode: 'forbidden' })

    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  it('propone sin mutar y propaga el par desenlace/causa', async () => {
    await proposeAppHiringApplicationDecision({
      context: context(),
      applicationId: 'app-1',
      body: { decision: 'not_selected', cause: 'capacity_filled' }
    })

    expect(mocks.propose).toHaveBeenCalledWith({ applicationId: 'app-1', decision: 'not_selected', cause: 'capacity_filled' })
    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  it('confirma con la huella, el actor de la sesión y la idempotencia del header', async () => {
    await confirmAppHiringApplicationDecision({
      context: context(),
      request: request(),
      applicationId: 'app-1',
      body: { decision: 'rejected', reasonSummary: 'no avanza', effectDigest: 'hdp-x' }
    })

    expect(mocks.confirm).toHaveBeenCalledWith({
      applicationId: 'app-1',
      effectDigest: 'hdp-x',
      input: expect.objectContaining({ decision: 'rejected', idempotencyKey: 'idem-1' }),
      actorUserId: 'user-1'
    })
  })

  it('una propuesta caducada llega como 409 propio, no aplanada a bad_request', async () => {
    mocks.confirm.mockRejectedValue({ code: 'hiring_decision_proposal_stale', statusCode: 409, message: 'cambió' })

    await expect(
      confirmAppHiringApplicationDecision({ context: context(), request: request(), applicationId: 'app-1', body: {} })
    ).rejects.toMatchObject({ errorCode: 'hiring_decision_proposal_stale' })
  })
})
