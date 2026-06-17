import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/db', () => ({ query: vi.fn() }))
vi.mock('@/lib/notifications/notification-service', () => ({
  NotificationService: { getUnreadCount: vi.fn(), markAllAsRead: vi.fn().mockResolvedValue(3) }
}))

const mockExecute = vi.fn()

vi.mock('@/lib/api-platform/core/commands', () => ({
  executeApiPlatformCommand: (...args: unknown[]) => mockExecute(...args)
}))

const { confirmNexaAction } = await import('./confirm')
const { ApiPlatformError } = await import('@/lib/api-platform/core/errors')

const CONTEXT = {
  userId: 'user-1',
  clientId: null,
  tenantType: 'efeonce_internal' as const,
  roleCodes: ['collaborator'],
  routeGroups: ['internal']
}

const buildRequest = () =>
  new Request('https://example.com/api/nexa/actions/mark_notifications_read/confirm', { method: 'POST' })

const confirm = (actionKey: string) =>
  confirmNexaAction({ actionKey, context: CONTEXT, idempotencyKey: 'nexa-act-idem-k1', request: buildRequest() })

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXA_ACTION_RUNTIME_ENABLED = 'true'
})

afterEach(() => {
  delete process.env.NEXA_ACTION_RUNTIME_ENABLED
})

describe('confirmNexaAction — the only execution path', () => {
  it('returns an unknown_action gap and never touches the command foundation for an unregistered key', async () => {
    const outcome = await confirm('delete_everything')

    expect(outcome).toEqual({ kind: 'gap', reason: 'unknown_action' })
    expect(mockExecute).not.toHaveBeenCalled()
  })

  it('returns a runtime_disabled gap (and does not execute) when the flag is OFF', async () => {
    process.env.NEXA_ACTION_RUNTIME_ENABLED = 'false'

    const outcome = await confirm('mark_notifications_read')

    expect(outcome).toEqual({ kind: 'gap', reason: 'runtime_disabled' })
    expect(mockExecute).not.toHaveBeenCalled()
  })

  it('executes through the idempotency foundation with the app_user principal + override key', async () => {
    mockExecute.mockResolvedValue({ data: { ok: true, summary: 'Listo', metrics: [] }, status: 200, headers: {} })

    const outcome = await confirm('mark_notifications_read')

    expect(outcome).toEqual({ kind: 'executed', result: { ok: true, summary: 'Listo', metrics: [] }, replayed: false })

    const call = mockExecute.mock.calls[0][0]

    expect(call.principal).toEqual({ lane: 'app', principalKind: 'app_user', principalId: 'user-1', userId: 'user-1' })
    expect(call.routeKey).toBe('nexa.action.mark_notifications_read')
    expect(call.idempotencyKeyOverride).toBe('nexa-act-idem-k1')
  })

  it('flags replayed when the idempotency foundation returns the replay header', async () => {
    mockExecute.mockResolvedValue({
      data: { ok: true, summary: 'Listo', metrics: [] },
      status: 200,
      headers: { 'idempotency-replayed': 'true' }
    })

    const outcome = await confirm('mark_notifications_read')

    expect(outcome.kind === 'executed' && outcome.replayed).toBe(true)
  })

  it('maps a 409 from the idempotency foundation to a conflict outcome', async () => {
    mockExecute.mockRejectedValue(new ApiPlatformError('in progress', { statusCode: 409, errorCode: 'idempotency_in_progress' }))

    const outcome = await confirm('mark_notifications_read')

    expect(outcome).toEqual({ kind: 'conflict' })
  })

  it('rethrows a non-409 failure so the endpoint records `failed` and returns a canonical 500', async () => {
    mockExecute.mockRejectedValue(new Error('command exploded'))

    await expect(confirm('mark_notifications_read')).rejects.toThrow('command exploded')
  })
})
