import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/db', () => ({ query: vi.fn() }))

// The pilot action's preview reads the unread count; stub the service so the resolver is unit-tested
// without Postgres.
const mockGetUnreadCount = vi.fn()

vi.mock('@/lib/notifications/notification-service', () => ({
  NotificationService: {
    getUnreadCount: (...args: unknown[]) => mockGetUnreadCount(...args),
    markAllAsRead: vi.fn()
  }
}))

const {
  resolveNexaActionProposal,
  getNexaActionDefinition,
  canUseNexaActionRuntime,
  buildNexaActionContext,
  listEnabledNexaActionKeys
} = await import('./registry')

const INTERNAL_CONTEXT = {
  userId: 'user-1',
  clientId: null,
  tenantType: 'efeonce_internal' as const,
  roleCodes: ['collaborator'],
  routeGroups: ['internal', 'my']
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUnreadCount.mockResolvedValue(5)
  process.env.NEXA_ACTION_RUNTIME_ENABLED = 'true'
})

afterEach(() => {
  delete process.env.NEXA_ACTION_RUNTIME_ENABLED
})

describe('resolveNexaActionProposal — deterministic, anti-freeform', () => {
  it('returns a governed proposal for a registered, permitted action when the runtime is enabled', async () => {
    const resolution = await resolveNexaActionProposal('mark_notifications_read', INTERNAL_CONTEXT)

    expect(resolution.kind).toBe('proposal')

    if (resolution.kind !== 'proposal') return

    expect(resolution.proposal.contractVersion).toBe('nexa-action-proposal.v1')
    expect(resolution.proposal.actionKey).toBe('mark_notifications_read')
    expect(resolution.proposal.proposalId).toMatch(/^nexa-act-/)
    expect(resolution.proposal.execution.idempotencyKey).toMatch(/^nexa-act-idem-/)
    expect(resolution.proposal.execution.confirmEndpoint).toBe('/api/nexa/actions/mark_notifications_read/confirm')
    expect(resolution.proposal.preview.metrics).toEqual([{ label: 'Sin leer', value: '5' }])
  })

  it('rejects an unregistered key as an honest gap — the LLM cannot invent an action/endpoint', async () => {
    const resolution = await resolveNexaActionProposal('delete_all_invoices', INTERNAL_CONTEXT)

    expect(resolution.kind).toBe('gap')

    if (resolution.kind !== 'gap') return

    expect(resolution.gap.reason).toBe('unknown_action')
    // No endpoint, no execution — only an honest message.
    expect(resolution.gap).not.toHaveProperty('confirmEndpoint')
  })

  it('returns a runtime_disabled gap when the action runtime flag is OFF', async () => {
    process.env.NEXA_ACTION_RUNTIME_ENABLED = 'false'

    const resolution = await resolveNexaActionProposal('mark_notifications_read', INTERNAL_CONTEXT)

    expect(resolution.kind).toBe('gap')

    if (resolution.kind !== 'gap') return

    expect(resolution.gap.reason).toBe('runtime_disabled')
  })

  it('returns a not_permitted gap when the session lacks identity', async () => {
    const resolution = await resolveNexaActionProposal('mark_notifications_read', { ...INTERNAL_CONTEXT, userId: '' })

    expect(resolution.kind).toBe('gap')

    if (resolution.kind !== 'gap') return

    expect(resolution.gap.reason).toBe('not_permitted')
  })
})

describe('registry helpers', () => {
  it('exposes the pilot action and lists it as enabled only when the flag is ON', () => {
    expect(getNexaActionDefinition('mark_notifications_read')?.domain).toBe('notifications')
    expect(getNexaActionDefinition('nope')).toBeNull()
    expect(listEnabledNexaActionKeys()).toEqual(['mark_notifications_read'])

    process.env.NEXA_ACTION_RUNTIME_ENABLED = 'false'
    expect(listEnabledNexaActionKeys()).toEqual([])
  })

  it('canUseNexaActionRuntime gates to internal/admin/EFEONCE_ADMIN (client users excluded)', () => {
    expect(canUseNexaActionRuntime(INTERNAL_CONTEXT)).toBe(true)
    expect(
      canUseNexaActionRuntime({
        userId: 'u',
        clientId: 'c',
        tenantType: 'client',
        roleCodes: ['client_executive'],
        routeGroups: ['client']
      })
    ).toBe(false)
  })

  it('buildNexaActionContext maps identity from the session source (empty clientId → null)', () => {
    const ctx = buildNexaActionContext({
      userId: 'u',
      memberId: 'm',
      clientId: '',
      tenantType: 'efeonce_internal',
      roleCodes: ['collaborator'],
      routeGroups: ['internal']
    })

    expect(ctx).toEqual({
      userId: 'u',
      memberId: 'm',
      clientId: null,
      tenantType: 'efeonce_internal',
      roleCodes: ['collaborator'],
      routeGroups: ['internal']
    })
  })
})
