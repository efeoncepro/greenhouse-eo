import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const membershipSyncMock = vi.fn().mockResolvedValue({ action: 'created', membershipId: 'pm-1' })
const publishOutboxEventMock = vi.fn()

vi.mock('@/lib/account-360/operating-entity-membership', () => ({
  syncOperatingEntityMembershipForMember: (...args: unknown[]) => membershipSyncMock(...args),
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => publishOutboxEventMock(...args),
}))

const { resolveOrCreateMemberForIdentityProfile } = await import('./member-core')

const memberRow = (overrides: Record<string, unknown> = {}) => ({
  member_id: 'mbr-1',
  identity_profile_id: 'profile-1',
  azure_oid: null,
  active: true,
  workforce_intake_status: 'pending_intake',
  primary_email: 'ana@example.com',
  ...overrides,
})

const buildClient = (routes: {
  byProfile?: Record<string, unknown>[]
  byEmail?: Record<string, unknown>[]
}) => {
  const writes: Array<{ sql: string; values: unknown[] }> = []

  const query = vi.fn(async (sql: string, values: unknown[] = []) => {
    if (/WHERE identity_profile_id = \$1/.test(sql) && /SELECT/.test(sql)) {
      return { rows: routes.byProfile ?? [] }
    }

    if (/lower\(primary_email\)/.test(sql) && /SELECT/.test(sql)) {
      return { rows: routes.byEmail ?? [] }
    }

    if (/INSERT INTO greenhouse_core\.members/.test(sql) || /UPDATE greenhouse_core\.members/.test(sql)) {
      writes.push({ sql, values })

      return { rows: [] }
    }

    throw new Error(`SQL inesperada: ${sql.slice(0, 80)}`)
  })

  return { query, writes }
}

const input = {
  identityProfileId: 'profile-1',
  displayName: 'Ana Prueba',
  primaryEmail: 'ana@example.com',
  hireDate: '2026-08-01',
  roleTitle: null,
}

describe('resolveOrCreateMemberForIdentityProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('crea member nuevo espejo SCIM: active=TRUE + pending_intake + membership + member.created', async () => {
    const client = buildClient({ byProfile: [], byEmail: [] })

    const result = await resolveOrCreateMemberForIdentityProfile(client as never, input)

    expect(result.outcome).toBe('created_new')

    const insert = client.writes.find((w) => /INSERT INTO greenhouse_core\.members/.test(w.sql))

    expect(insert).toBeDefined()

    // El member nace operacionalmente NO activado: pending_intake (gate payroll/capacity).
    expect(insert!.sql).toContain(`'pending_intake'`)
    expect(insert!.sql).toContain('TRUE, TRUE')
    expect(membershipSyncMock).toHaveBeenCalledWith(result.memberId, expect.objectContaining({ client }))
    expect(publishOutboxEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'member.created',
        payload: expect.objectContaining({ provisionedBy: 'hiring_activation', workforceIntakeStatus: 'pending_intake' }),
      }),
      client,
    )
  })

  it('enlaza member existente pending_intake sobre la misma persona (idempotencia/SCIM primero)', async () => {
    const client = buildClient({ byProfile: [memberRow()] })

    const result = await resolveOrCreateMemberForIdentityProfile(client as never, input)

    expect(result).toEqual({ memberId: 'mbr-1', outcome: 'linked_existing' })
    expect(client.writes).toHaveLength(0)
    expect(publishOutboxEventMock).not.toHaveBeenCalled()
  })

  it('bloquea si la persona YA es colaborador activo con intake completado (member_already_active)', async () => {
    const client = buildClient({ byProfile: [memberRow({ workforce_intake_status: 'completed' })] })

    await expect(resolveOrCreateMemberForIdentityProfile(client as never, input)).rejects.toMatchObject({
      kind: 'member_already_active',
      code: 'hiring_activation_member_already_active',
    })
  })

  it('reactiva un ex-colaborador (active=FALSE) → pending_intake de nuevo (re-pasa intake)', async () => {
    const client = buildClient({ byProfile: [memberRow({ active: false, workforce_intake_status: 'completed' })] })

    const result = await resolveOrCreateMemberForIdentityProfile(client as never, input)

    expect(result.outcome).toBe('reactivated')

    const update = client.writes.find((w) => /UPDATE greenhouse_core\.members/.test(w.sql))

    expect(update!.sql).toContain(`workforce_intake_status = 'pending_intake'`)
    expect(update!.sql).toContain('active = TRUE')
    expect(membershipSyncMock).toHaveBeenCalled()
  })

  it('identidad ambigua (2 members sobre la misma persona) → block, nunca elegir uno', async () => {
    const client = buildClient({ byProfile: [memberRow(), memberRow({ member_id: 'mbr-2' })] })

    await expect(resolveOrCreateMemberForIdentityProfile(client as never, input)).rejects.toMatchObject({
      kind: 'ambiguous_identity',
    })
  })

  it('email de OTRA persona canónica → member_conflict (espejo drift SCIM, nunca merge)', async () => {
    const client = buildClient({
      byProfile: [],
      byEmail: [memberRow({ identity_profile_id: 'profile-OTRA' })],
    })

    await expect(resolveOrCreateMemberForIdentityProfile(client as never, input)).rejects.toMatchObject({
      kind: 'member_conflict',
    })
  })

  it('member legacy con mismo email sin profile → backfill del anchor + link (cascade #3)', async () => {
    const client = buildClient({
      byProfile: [],
      byEmail: [memberRow({ identity_profile_id: null })],
    })

    const result = await resolveOrCreateMemberForIdentityProfile(client as never, input)

    expect(result).toEqual({ memberId: 'mbr-1', outcome: 'linked_existing' })

    const update = client.writes.find((w) => /SET identity_profile_id = \$2/.test(w.sql))

    expect(update).toBeDefined()
  })
})
