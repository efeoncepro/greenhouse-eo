import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { InvitationEmailSender } from './delivery'

type Handler = (params: unknown[], sql: string) => unknown[] | { rows: unknown[] }

const clientQueryMock = vi.fn()

const fakeClient = {
  query: (sql: string, params: unknown[] = []) => clientQueryMock(sql, params)
}

vi.mock('@/lib/db', () => ({
  withTransaction: async (callback: (client: typeof fakeClient) => Promise<unknown>) => callback(fakeClient),
  query: vi.fn()
}))

const publishMock = vi.fn()

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => publishMock(...args)
}))

const {
  acceptExternalInvitation,
  bindExternalOrganization,
  grantExternalCapability,
  issueExternalInvitation,
  resendExternalInvitation,
  revealExternalInvitationToken,
  revokeExternalAccess,
  upsertExternalIdentityEnvironment
} = await import('./commands')

const actor = { actorId: 'user-admin-1' }

const route = (handlers: Array<[RegExp, Handler]>) => {
  clientQueryMock.mockImplementation((sql: string, params: unknown[]) => {
    const match = handlers.find(([pattern]) => pattern.test(sql))

    if (/^SELECT b.environment_id FROM/.test(sql.trim()))
      return Promise.resolve({ rows: [{ environment_id: 'efeonce-auth' }] })
    if (/^SELECT environment_id FROM greenhouse_core.external_organization_bindings/.test(sql.trim()))
      return Promise.resolve({ rows: [{ environment_id: 'efeonce-auth' }] })
    if (/^SELECT status FROM greenhouse_core.external_identity_environments/.test(sql.trim()))
      return Promise.resolve({ rows: [{ status: 'active' }] })
    if (!match && /SELECT binding_id FROM greenhouse_core.external_organization_bindings/.test(sql))
      return Promise.resolve({ rows: [{ binding_id: params[0] }] })
    if (!match && /SELECT enrollment_id FROM greenhouse_core.internal_native_enrollments/.test(sql))
      return Promise.resolve({ rows: [] })
    // TASK-1837 — tope por binding/hora (audit) y admin designado vigente: por defecto sin filas.
    if (!match && /COUNT\(\*\)::text AS n[\s\S]*external_identity_audit_log/.test(sql))
      return Promise.resolve({ rows: [{ n: '0' }] })
    if (!match && /WHERE binding_id = \$1 AND profile_id = \$2 AND status = 'linked'/.test(sql))
      return Promise.resolve({ rows: [] })
    if (!match && /SELECT[\s\S]*external_capability_grants WHERE grant_id=\$1/.test(sql))
      return Promise.resolve({ rows: [grantRow({ grant_id: params[0] })] })

    if (!match && /FROM greenhouse_core\.external_identity_environments/.test(sql))
      return Promise.resolve({ rows: [environmentRow()] })
    if (!match) throw new Error(`unexpected SQL: ${sql.replace(/\s+/g, ' ').slice(0, 120)}`)

    const result = match[1](params, sql)

    return Promise.resolve(Array.isArray(result) ? { rows: result } : result)
  })
}

const calls = (pattern: RegExp) => clientQueryMock.mock.calls.filter(call => pattern.test(String(call[0])))

const environmentRow = (overrides: Record<string, unknown> = {}) => ({
  environment_id: 'efeonce-auth',
  display_name: 'Efeonce Auth',
  provider: 'efeonce_auth',
  provider_environment_ref: null,
  issuer_url: 'https://auth.efeonce.org',
  jwks_uri: 'https://auth.efeonce.org/.well-known/jwks.json',
  audience: 'https://mcp.efeonce.org/mcp',
  issuer_class: 'external',
  subject_type: 'public',
  status: 'active',
  notes: null,
  created_by: 'u',
  updated_by: 'u',
  created_at: '2026-09-04T00:00:00Z',
  updated_at: '2026-09-04T00:00:00Z',
  ...overrides
})

const bindingRow = (overrides: Record<string, unknown> = {}) => ({
  population: 'external',
  binding_id: 'xob-1',
  organization_id: 'org-1',
  organization_name: 'Cliente Uno',
  environment_id: 'efeonce-auth',
  external_organization_ref: 'ext-org-1',
  status: 'active',
  grants_version: 1,
  designated_admin_profile_id: null,
  reason: null,
  bound_by: 'user-admin-1',
  bound_at: '2026-09-04T00:00:00Z',
  revoked_by: null,
  revoked_at: null,
  revoke_reason: null,
  ...overrides
})

const grantRow = (overrides: Record<string, unknown> = {}) => ({
  grant_id: 'xcg-1',
  binding_id: 'xob-1',
  capability: 'globe.producer.fleet.read',
  profile_id: null,
  status: 'active',
  reason: null,
  granted_by: 'user-admin-1',
  granted_at: '2026-09-04T00:00:00Z',
  revoked_by: null,
  revoked_at: null,
  revoke_reason: null,
  ...overrides
})

const invitationRow = (overrides: Record<string, unknown> = {}) => ({
  invitation_id: 'xmi-1',
  binding_id: 'xob-1',
  profile_id: null,
  email: 'ana@cliente.cl',
  designated_admin: false,
  delivery_status: 'not_attempted',
  delivery_attempts: 0,
  last_delivery_at: null,
  last_delivery_error_code: null,
  status: 'issued',
  reason: null,
  issued_by: 'user-admin-1',
  issued_at: '2026-09-04T00:00:00Z',
  expires_at: '2099-01-01T00:00:00Z',
  accepted_at: null,
  linked_at: null,
  link_id: null,
  revoked_by: null,
  revoked_at: null,
  revoke_reason: null,
  ...overrides
})

const activeClientOrganization = {
  organization_type: 'client',
  lifecycle_stage: 'active_client',
  active: true,
  status: 'active'
}

describe('TASK-1631 — upsertExternalIdentityEnvironment', () => {
  beforeEach(() => vi.clearAllMocks())

  it('refuses to change issuerClass on an existing environment (authority is not re-classified in place)', async () => {
    route([
      [/FROM greenhouse_core\.external_identity_environments/, () => [environmentRow({ issuer_class: 'internal' })]]
    ])

    await expect(
      upsertExternalIdentityEnvironment(
        {
          environmentId: 'efeonce-auth',
          displayName: 'Efeonce Auth',
          provider: 'efeonce_auth',
          issuerUrl: 'https://auth.efeonce.org',
          jwksUri: 'https://auth.efeonce.org/.well-known/jwks.json',
          audience: 'https://mcp.efeonce.org/mcp',
          issuerClass: 'external'
        },
        actor
      )
    ).rejects.toMatchObject({ code: 'conflict' })
    expect(publishMock).not.toHaveBeenCalled()
  })

  it('is a no-op (no audit, no outbox) when nothing changed', async () => {
    route([[/FROM greenhouse_core\.external_identity_environments/, () => [environmentRow()]]])

    const result = await upsertExternalIdentityEnvironment(
      {
        environmentId: 'efeonce-auth',
        displayName: 'Efeonce Auth',
        provider: 'efeonce_auth',
        issuerUrl: 'https://auth.efeonce.org',
        jwksUri: 'https://auth.efeonce.org/.well-known/jwks.json',
        audience: 'https://mcp.efeonce.org/mcp',
        issuerClass: 'external',
        status: 'active'
      },
      actor
    )

    expect(result.changed).toBe(false)
    expect(calls(/external_identity_audit_log/)).toHaveLength(0)
    expect(publishMock).not.toHaveBeenCalled()
  })

  it('rotates the issuer with one audited UPDATE and publishes the previous issuer', async () => {
    route([
      [/SELECT[\s\S]*FROM greenhouse_core\.external_identity_environments/, () => [environmentRow()]],
      [
        /INSERT INTO greenhouse_core\.external_identity_environments/,
        () => [environmentRow({ issuer_url: 'https://auth.efeonce.org/v2' })]
      ],
      [/INSERT INTO greenhouse_core\.external_identity_audit_log/, () => []]
    ])

    const result = await upsertExternalIdentityEnvironment(
      {
        environmentId: 'efeonce-auth',
        displayName: 'Efeonce Auth',
        provider: 'efeonce_auth',
        issuerUrl: 'https://auth.efeonce.org/v2',
        jwksUri: 'https://auth.efeonce.org/.well-known/jwks.json',
        audience: 'https://mcp.efeonce.org/mcp',
        issuerClass: 'external',
        status: 'active'
      },
      actor
    )

    expect(result.changed).toBe(true)
    expect(result.environment.issuerUrl).toBe('https://auth.efeonce.org/v2')
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'identity.external_environment.upserted',
        payload: expect.objectContaining({ previousIssuerUrl: 'https://auth.efeonce.org' })
      }),
      fakeClient
    )
  })
})

describe('TASK-1631 — bindExternalOrganization', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects an organization that is not an active client of Account 360', async () => {
    route([
      [/FROM greenhouse_core\.external_identity_environments/, () => [environmentRow()]],
      [
        /FROM greenhouse_core\.organizations\s+WHERE organization_id/,
        () => [{ ...activeClientOrganization, lifecycle_stage: 'churned' }]
      ]
    ])

    await expect(
      bindExternalOrganization(
        { organizationId: 'org-1', environmentId: 'efeonce-auth', externalOrganizationRef: 'ext-org-1' },
        actor
      )
    ).rejects.toMatchObject({ code: 'organization_not_eligible' })
    expect(calls(/INSERT INTO greenhouse_core\.external_organization_bindings/)).toHaveLength(0)
  })

  it('is idempotent for the same organization + environment + external reference', async () => {
    route([
      [/FROM greenhouse_core\.external_identity_environments/, () => [environmentRow()]],
      [/FROM greenhouse_core\.organizations\s+WHERE organization_id/, () => [activeClientOrganization]],
      [/FROM greenhouse_core\.external_organization_bindings b[\s\S]*FOR UPDATE OF b/, () => [bindingRow()]]
    ])

    const result = await bindExternalOrganization(
      { organizationId: 'org-1', environmentId: 'efeonce-auth', externalOrganizationRef: 'ext-org-1' },
      actor
    )

    expect(result.created).toBe(false)
    expect(result.binding.bindingId).toBe('xob-1')
    expect(publishMock).not.toHaveBeenCalled()
  })

  it('conflicts when the organization is already bound with a different external reference', async () => {
    route([
      [/FROM greenhouse_core\.external_identity_environments/, () => [environmentRow()]],
      [/FROM greenhouse_core\.organizations\s+WHERE organization_id/, () => [activeClientOrganization]],
      [/FROM greenhouse_core\.external_organization_bindings b[\s\S]*FOR UPDATE OF b/, () => [bindingRow()]]
    ])

    await expect(
      bindExternalOrganization(
        { organizationId: 'org-1', environmentId: 'efeonce-auth', externalOrganizationRef: 'ext-org-OTHER' },
        actor
      )
    ).rejects.toMatchObject({ code: 'conflict' })
  })

  it('creates the binding with grants_version 1, audit row and outbox event in the same transaction', async () => {
    route([
      [/FROM greenhouse_core\.external_identity_environments/, () => [environmentRow({ status: 'draft' })]],
      [/FROM greenhouse_core\.organizations\s+WHERE organization_id/, () => [activeClientOrganization]],
      [/WHERE b\.environment_id = \$1[\s\S]*FOR UPDATE OF b/, () => []],
      [/INSERT INTO greenhouse_core\.external_organization_bindings/, () => []],
      [
        /WHERE b\.binding_id = \$1 AND b\.population='external'\s+FOR UPDATE OF b/,
        params => [bindingRow({ binding_id: params[0] })]
      ],
      [/INSERT INTO greenhouse_core\.external_identity_audit_log/, () => []]
    ])

    const result = await bindExternalOrganization(
      {
        organizationId: 'org-1',
        environmentId: 'efeonce-auth',
        externalOrganizationRef: 'ext-org-1',
        reason: 'cohorte 1'
      },
      actor
    )

    expect(result.created).toBe(true)
    expect(result.binding.bindingId).toMatch(/^xob-/)
    expect(result.binding.grantsVersion).toBe(1)

    const audit = calls(/external_identity_audit_log/)[0]?.[1] as unknown[]

    expect(audit[1]).toBe('organization_bound')
    expect(audit[8]).toBe('user-admin-1')
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'identity.external_binding.bound',
        aggregateType: 'external_identity_binding'
      }),
      fakeClient
    )
  })
})

describe('TASK-1631 — grantExternalCapability', () => {
  beforeEach(() => vi.clearAllMocks())

  it('bumps grants_version when a new grant is created', async () => {
    route([
      [/WHERE b\.binding_id = \$1 AND b\.population='external'\s+FOR UPDATE OF b/, () => [bindingRow()]],
      [/FROM greenhouse_core\.external_identity_environments/, () => [environmentRow()]],
      [
        /SELECT[\s\S]*FROM greenhouse_core\.external_capability_grants\s+WHERE binding_id = \$1 AND capability = \$2/,
        () => []
      ],
      [/INSERT INTO greenhouse_core\.external_capability_grants/, () => [grantRow()]],
      [/SET grants_version = grants_version \+ 1/, () => [{ grants_version: 2 }]],
      [/INSERT INTO greenhouse_core\.external_identity_audit_log/, () => []]
    ])

    const result = await grantExternalCapability({ bindingId: 'xob-1', capability: 'globe.producer.fleet.read' }, actor)

    expect(result.created).toBe(true)
    expect(result.grantsVersion).toBe(2)
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'identity.external_grant.granted',
        payload: expect.objectContaining({ grantsVersion: 2, capability: 'globe.producer.fleet.read' })
      }),
      fakeClient
    )
  })

  it('is idempotent and does not bump grants_version for an existing active grant', async () => {
    route([
      [
        /WHERE b\.binding_id = \$1 AND b\.population='external'\s+FOR UPDATE OF b/,
        () => [bindingRow({ grants_version: 5 })]
      ],
      [/FROM greenhouse_core\.external_identity_environments/, () => [environmentRow()]],
      [
        /SELECT[\s\S]*FROM greenhouse_core\.external_capability_grants\s+WHERE binding_id = \$1 AND capability = \$2/,
        () => [grantRow()]
      ]
    ])

    const result = await grantExternalCapability({ bindingId: 'xob-1', capability: 'globe.producer.fleet.read' }, actor)

    expect(result.created).toBe(false)
    expect(result.grantsVersion).toBe(5)
    expect(calls(/grants_version \+ 1/)).toHaveLength(0)
    expect(publishMock).not.toHaveBeenCalled()
  })

  it('rejects a per-person grant for someone who is not a linked member', async () => {
    route([
      [/WHERE b\.binding_id = \$1 AND b\.population='external'\s+FOR UPDATE OF b/, () => [bindingRow()]],
      [/FROM greenhouse_core\.external_identity_environments/, () => [environmentRow()]],
      [/SELECT invitation_id FROM greenhouse_core\.external_member_invitations/, () => []]
    ])

    await expect(
      grantExternalCapability(
        { bindingId: 'xob-1', capability: 'growth.ai_visibility.prompt_set.manage', profileId: 'p-9' },
        actor
      )
    ).rejects.toMatchObject({ code: 'invalid_request' })
  })

  it('rejects a capability that is not a namespaced dotted key', async () => {
    await expect(grantExternalCapability({ bindingId: 'xob-1', capability: 'Admin' }, actor)).rejects.toMatchObject({
      code: 'invalid_request'
    })
    expect(clientQueryMock).not.toHaveBeenCalled()
  })
})

describe('TASK-1631 — issueExternalInvitation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the open invitation without a token when one already exists (idempotent)', async () => {
    route([
      [/WHERE b\.binding_id = \$1 AND b\.population='external'\s+FOR UPDATE OF b/, () => [bindingRow()]],
      [/FROM greenhouse_core\.external_identity_environments/, () => [environmentRow()]],
      [/status IN \('issued', 'accepted'\)\s+FOR UPDATE/, () => [invitationRow()]]
    ])

    const result = await issueExternalInvitation({ bindingId: 'xob-1', email: 'Ana@Cliente.cl' }, actor)

    expect(result.created).toBe(false)
    expect(result.token).toBeNull()
    expect(publishMock).not.toHaveBeenCalled()
  })

  it('issues a new invitation, returns the token once and persists only its sha256 hash', async () => {
    route([
      [/WHERE b\.binding_id = \$1 AND b\.population='external'\s+FOR UPDATE OF b/, () => [bindingRow()]],
      [/FROM greenhouse_core\.external_identity_environments/, () => [environmentRow()]],
      [/status IN \('issued', 'accepted'\)\s+FOR UPDATE/, () => []],
      [
        /INSERT INTO greenhouse_core\.external_member_invitations/,
        params => [invitationRow({ invitation_id: params[0] })]
      ],
      [/INSERT INTO greenhouse_core\.external_identity_audit_log/, () => []]
    ])

    const result = await issueExternalInvitation(
      { bindingId: 'xob-1', email: 'ana@cliente.cl', designatedAdmin: true },
      actor
    )

    expect(result.created).toBe(true)
    expect(result.token).toMatch(/^[A-Za-z0-9_-]{40,}$/)

    const insertParams = calls(/INSERT INTO greenhouse_core\.external_member_invitations/)[0]?.[1] as unknown[]

    expect(insertParams[5]).toMatch(/^[0-9a-f]{64}$/)
    expect(insertParams[5]).not.toBe(result.token)
    expect(insertParams[4]).toBe(true)
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'identity.external_invitation.issued' }),
      fakeClient
    )
    expect(JSON.stringify(publishMock.mock.calls[0]?.[0])).not.toContain(result.token)
  })

  it('reissue revokes the open invitation (audited) before issuing the new one', async () => {
    route([
      [/WHERE b\.binding_id = \$1 AND b\.population='external'\s+FOR UPDATE OF b/, () => [bindingRow()]],
      [/FROM greenhouse_core\.external_identity_environments/, () => [environmentRow()]],
      [/status IN \('issued', 'accepted'\)\s+FOR UPDATE/, () => [invitationRow()]],
      [/SET status = 'revoked'[\s\S]*revoke_reason = 'reissued'/, () => []],
      [
        /INSERT INTO greenhouse_core\.external_member_invitations/,
        params => [invitationRow({ invitation_id: params[0] })]
      ],
      [/INSERT INTO greenhouse_core\.external_identity_audit_log/, () => []]
    ])

    const result = await issueExternalInvitation({ bindingId: 'xob-1', email: 'ana@cliente.cl', reissue: true }, actor)

    expect(result.created).toBe(true)
    expect(result.token).not.toBeNull()

    const auditTypes = calls(/INSERT INTO greenhouse_core\.external_identity_audit_log/).map(call => (call[1] as unknown[])[1])

    expect(auditTypes).toEqual(['invitation_revoked', 'invitation_issued'])
  })

  it('refuses to invite under a revoked binding', async () => {
    route([
      [
        /WHERE b\.binding_id = \$1 AND b\.population='external'\s+FOR UPDATE OF b/,
        () => [bindingRow({ status: 'revoked', revoked_at: '2026-09-04T00:00:00Z' })]
      ]
    ])

    await expect(issueExternalInvitation({ bindingId: 'xob-1', email: 'ana@cliente.cl' }, actor)).rejects.toMatchObject(
      {
        code: 'binding_not_active'
      }
    )
  })
})

describe('TASK-1837 — issueExternalInvitation delivery', () => {
  beforeEach(() => vi.clearAllMocks())

  const issueRoute = () =>
    route([
      [/WHERE b\.binding_id = \$1 AND b\.population='external'\s+FOR UPDATE OF b/, () => [bindingRow()]],
      [/FROM greenhouse_core\.external_identity_environments/, () => [environmentRow()]],
      [/status IN \('issued', 'accepted'\)\s+FOR UPDATE/, () => []],
      [
        /INSERT INTO greenhouse_core\.external_member_invitations/,
        params => [invitationRow({ invitation_id: params[0] })]
      ],
      [/INSERT INTO greenhouse_core\.external_identity_audit_log/, () => []],
      [
        /UPDATE greenhouse_core\.external_member_invitations i\s+SET delivery_status = \$2/,
        params => [
          {
            ...invitationRow({
              invitation_id: params[0],
              delivery_status: params[1],
              delivery_attempts: params[2],
              last_delivery_error_code: params[3]
            }),
            environment_id: 'efeonce-auth',
            organization_id: 'org-1'
          }
        ]
      ]
    ])

  it('with system delivery sends the email AFTER the transaction and reports delivery instead of the secret', async () => {
    issueRoute()

    const sender = vi.fn<InvitationEmailSender>(async () => ({ status: 'sent' as const, deliveryId: 'del-1' }))

    const result = await issueExternalInvitation(
      { bindingId: 'xob-1', email: 'ana@cliente.cl', delivery: 'system' },
      actor,
      { sender }
    )

    expect(sender).toHaveBeenCalledTimes(1)
    expect(sender.mock.calls[0]?.[0]).toMatchObject({
      environment: expect.objectContaining({ issuerUrl: 'https://auth.efeonce.org' }),
      organizationName: 'Cliente Uno'
    })
    expect(sender.mock.calls[0]?.[0].token).toBe(result.token)
    expect(result.delivery).toEqual({
      mode: 'system',
      status: 'sent',
      attempts: 1,
      recipientMasked: 'a***@cliente.cl',
      errorCode: null
    })
    expect(JSON.stringify(result.delivery)).not.toContain(result.token)
    expect(publishMock.mock.calls.map(call => (call[0] as { eventType: string }).eventType)).toEqual([
      'identity.external_invitation.issued'
    ])
  })

  it('never puts the token in the outbox payload, not even with system delivery', async () => {
    issueRoute()

    const result = await issueExternalInvitation(
      { bindingId: 'xob-1', email: 'ana@cliente.cl', delivery: 'system' },
      actor,
      { sender: async () => ({ status: 'sent', deliveryId: null }) }
    )

    for (const call of publishMock.mock.calls) {
      const serialized = JSON.stringify(call[0])

      expect(serialized).not.toContain(result.token)
      expect(serialized).not.toContain('token')
    }
  })

  it('a failed send leaves the invitation issued with delivery_status=failed, says so, and publishes delivery_failed', async () => {
    issueRoute()

    const result = await issueExternalInvitation(
      { bindingId: 'xob-1', email: 'ana@cliente.cl', delivery: 'system' },
      actor,
      { sender: async () => ({ status: 'failed', errorCode: 'provider_rejected' }) }
    )

    expect(result.created).toBe(true)
    expect(result.delivery.status).toBe('failed')
    expect(result.delivery.errorCode).toBe('provider_rejected')

    const auditTypes = calls(/INSERT INTO greenhouse_core\.external_identity_audit_log/).map(
      call => (call[1] as unknown[])[1]
    )

    expect(auditTypes).toEqual(['invitation_issued', 'invitation_delivery_failed'])
    expect(publishMock.mock.calls.map(call => (call[0] as { eventType: string }).eventType)).toEqual([
      'identity.external_invitation.issued',
      'identity.external_invitation.delivery_failed'
    ])
    expect(JSON.stringify(publishMock.mock.calls[1]?.[0])).not.toContain('ana@cliente.cl')
  })

  it('manual delivery keeps the previous contract: token returned, no email sent', async () => {
    issueRoute()

    const sender = vi.fn()

    const result = await issueExternalInvitation(
      { bindingId: 'xob-1', email: 'ana@cliente.cl', delivery: 'manual' },
      actor,
      { sender }
    )

    expect(sender).not.toHaveBeenCalled()
    expect(result.token).toMatch(/^[A-Za-z0-9_-]{40,}$/)
    expect(result.delivery).toMatchObject({ mode: 'manual', status: 'not_attempted', attempts: 0 })
  })

  it('refuses to issue when the binding hit its hourly issue cap (rate_limited)', async () => {
    route([
      [/WHERE b\.binding_id = \$1 AND b\.population='external'\s+FOR UPDATE OF b/, () => [bindingRow()]],
      [/FROM greenhouse_core\.external_identity_environments/, () => [environmentRow()]],
      [/status IN \('issued', 'accepted'\)\s+FOR UPDATE/, () => []],
      [/COUNT\(\*\)::text AS n[\s\S]*external_identity_audit_log/, () => [{ n: '20' }]]
    ])

    await expect(
      issueExternalInvitation({ bindingId: 'xob-1', email: 'ana@cliente.cl', delivery: 'manual' }, actor)
    ).rejects.toMatchObject({ code: 'rate_limited', statusCode: 429 })
  })

  it('refuses a designatedAdmin invitation while another designated admin is still linked (conflict)', async () => {
    route([
      [
        /WHERE b\.binding_id = \$1 AND b\.population='external'\s+FOR UPDATE OF b/,
        () => [bindingRow({ designated_admin_profile_id: 'profile-admin-1' })]
      ],
      [/FROM greenhouse_core\.external_identity_environments/, () => [environmentRow()]],
      [/status IN \('issued', 'accepted'\)\s+FOR UPDATE/, () => []],
      [/WHERE binding_id = \$1 AND profile_id = \$2 AND status = 'linked'/, () => [{ invitation_id: 'xmi-admin' }]]
    ])

    await expect(
      issueExternalInvitation(
        { bindingId: 'xob-1', email: 'otro@cliente.cl', designatedAdmin: true, delivery: 'manual' },
        actor
      )
    ).rejects.toMatchObject({ code: 'conflict' })
  })
})

describe('TASK-1837 — resendExternalInvitation (reenviar = rotar)', () => {
  beforeEach(() => vi.clearAllMocks())

  const resendRoute = (previous: Record<string, unknown> = {}) =>
    route([
      [/FROM greenhouse_core\.external_member_invitations\s+WHERE invitation_id = \$1\s+FOR UPDATE/, () => [invitationRow({ delivery_status: 'failed', delivery_attempts: 1, ...previous })]],
      [/WHERE b\.binding_id = \$1 AND b\.population='external'\s+FOR UPDATE OF b/, () => [bindingRow()]],
      [/FROM greenhouse_core\.external_identity_environments/, () => [environmentRow()]],
      [/SET status = 'revoked'[\s\S]*revoke_reason = 'resent'/, () => []],
      [
        /INSERT INTO greenhouse_core\.external_member_invitations/,
        params => [invitationRow({ invitation_id: params[0], delivery_attempts: params[9] })]
      ],
      [/INSERT INTO greenhouse_core\.external_identity_audit_log/, () => []]
    ])

  it('revokes the open invitation (resent), issues a NEW token and inherits the attempt count', async () => {
    resendRoute()

    const result = await resendExternalInvitation({ invitationId: 'xmi-1', delivery: 'manual' }, actor)

    expect(result.created).toBe(true)
    expect(result.token).toMatch(/^[A-Za-z0-9_-]{40,}$/)
    expect(calls(/revoke_reason = 'resent'/)).toHaveLength(1)

    const insertParams = calls(/INSERT INTO greenhouse_core\.external_member_invitations/)[0]?.[1] as unknown[]

    expect(insertParams[0]).not.toBe('xmi-1')
    expect(insertParams[9]).toBe(1)

    const auditTypes = calls(/INSERT INTO greenhouse_core\.external_identity_audit_log/).map(
      call => (call[1] as unknown[])[1]
    )

    expect(auditTypes).toEqual(['invitation_resent'])
    expect(JSON.stringify(publishMock.mock.calls[0]?.[0])).not.toContain(result.token)
  })

  it('refuses to resend an invitation that is not open', async () => {
    resendRoute({ status: 'linked', linked_at: '2026-09-04T00:00:00Z', profile_id: 'p', link_id: 'l' })

    await expect(resendExternalInvitation({ invitationId: 'xmi-1', delivery: 'manual' }, actor)).rejects.toMatchObject({
      code: 'invitation_not_open'
    })
  })

  it('refuses to resend past the per-chain limit (3)', async () => {
    resendRoute({ delivery_attempts: 3 })

    await expect(resendExternalInvitation({ invitationId: 'xmi-1', delivery: 'manual' }, actor)).rejects.toMatchObject({
      code: 'rate_limited',
      statusCode: 429
    })
  })

  it('responds not_found when the route binding does not match the invitation (anti-oracle)', async () => {
    resendRoute()

    await expect(
      resendExternalInvitation({ invitationId: 'xmi-1', bindingId: 'xob-other', delivery: 'manual' }, actor)
    ).rejects.toMatchObject({ code: 'not_found' })
  })
})

describe('TASK-1837 — revealExternalInvitationToken (excepción gobernada)', () => {
  beforeEach(() => vi.clearAllMocks())

  const revealRoute = () =>
    route([
      [/FROM greenhouse_core\.external_member_invitations\s+WHERE invitation_id = \$1\s+FOR UPDATE/, () => [invitationRow()]],
      [/WHERE b\.binding_id = \$1 AND b\.population='external'\s+FOR UPDATE OF b/, () => [bindingRow()]],
      [/FROM greenhouse_core\.external_identity_environments/, () => [environmentRow()]],
      [/SET status = 'revoked'[\s\S]*revoke_reason = 'revealed'/, () => []],
      [
        /INSERT INTO greenhouse_core\.external_member_invitations/,
        params => [invitationRow({ invitation_id: params[0], expires_at: '2026-09-05T01:00:00Z' })]
      ],
      [/INSERT INTO greenhouse_core\.external_identity_audit_log/, () => []]
    ])

  it('requires a reason of at least 10 characters', async () => {
    await expect(
      revealExternalInvitationToken({ invitationId: 'xmi-1', reason: 'corto' }, actor)
    ).rejects.toMatchObject({ code: 'invalid_request', details: { field: 'reason' } })
  })

  it('rotates to a 1-hour link, audits actor + reason WITHOUT the token, and sends no email', async () => {
    revealRoute()

    const result = await revealExternalInvitationToken(
      { invitationId: 'xmi-1', reason: 'Persona sin correo operativo; entrega por Teams verificada' },
      actor
    )

    expect(result.token).toMatch(/^[A-Za-z0-9_-]{40,}$/)
    expect(result.acceptanceUrl).toBe(`https://auth.efeonce.org/i/${encodeURIComponent(result.token)}`)

    const insertParams = calls(/INSERT INTO greenhouse_core\.external_member_invitations/)[0]?.[1] as unknown[]

    expect(insertParams[8]).toBe(1)

    const auditCalls = calls(/INSERT INTO greenhouse_core\.external_identity_audit_log/)
    const auditParams = auditCalls[0]?.[1] as unknown[]

    expect(auditParams[1]).toBe('invitation_token_revealed')
    expect(auditParams[8]).toBe('user-admin-1')
    expect(auditParams[9]).toContain('Persona sin correo')
    expect(JSON.stringify(auditParams)).not.toContain(result.token)
    expect(JSON.stringify(publishMock.mock.calls[0]?.[0])).not.toContain(result.token)
    expect(calls(/UPDATE greenhouse_core\.external_member_invitations i\s+SET delivery_status/)).toHaveLength(0)
  })
})

describe('TASK-1631 — acceptExternalInvitation', () => {
  beforeEach(() => vi.clearAllMocks())

  const authServer = { actorId: 'auth-server' }

  it('expires an overdue invitation instead of linking it', async () => {
    route([
      [/WHERE token_hash = \$1\s+FOR UPDATE/, () => [invitationRow({ expires_at: '2020-01-01T00:00:00Z' })]],
      [/SET status = 'expired'/, () => []]
    ])

    await expect(
      acceptExternalInvitation({ token: 'tok', environmentId: 'efeonce-auth', subject: 'sub-1' }, authServer)
    ).rejects.toMatchObject({ code: 'invitation_expired' })
    expect(calls(/SET status = 'expired'/)).toHaveLength(1)
  })

  it('rejects a verified email that differs from the invited email (no email-based guessing)', async () => {
    route([[/WHERE token_hash = \$1\s+FOR UPDATE/, () => [invitationRow()]]])

    await expect(
      acceptExternalInvitation(
        { token: 'tok', environmentId: 'efeonce-auth', subject: 'sub-1', verifiedEmail: 'otra@cliente.cl' },
        authServer
      )
    ).rejects.toMatchObject({ code: 'invalid_request' })
  })

  it('fails closed with identity_collision when the invited email matches more than one active profile', async () => {
    route([
      [/WHERE token_hash = \$1\s+FOR UPDATE/, () => [invitationRow()]],
      [/WHERE b\.binding_id = \$1 AND b\.population='external'\s+FOR UPDATE OF b/, () => [bindingRow()]],
      [/FROM greenhouse_core\.external_identity_environments/, () => [environmentRow()]],
      [/SELECT profile_id FROM greenhouse_core\.identity_profile_source_links/, () => []],
      [/lower\(canonical_email\) = \$1/, () => [{ profile_id: 'p-1' }, { profile_id: 'p-2' }]]
    ])

    await expect(
      acceptExternalInvitation({ token: 'tok', environmentId: 'efeonce-auth', subject: 'sub-1' }, authServer)
    ).rejects.toMatchObject({ code: 'identity_collision' })
    expect(calls(/INSERT INTO greenhouse_core\.identity_profile_source_links/)).toHaveLength(0)
  })

  it('fails closed when the subject is already linked to a different profile than the invited one', async () => {
    route([
      [/WHERE token_hash = \$1\s+FOR UPDATE/, () => [invitationRow({ profile_id: 'p-invited' })]],
      [/WHERE b\.binding_id = \$1 AND b\.population='external'\s+FOR UPDATE OF b/, () => [bindingRow()]],
      [/FROM greenhouse_core\.external_identity_environments/, () => [environmentRow()]],
      [/SELECT profile_id FROM greenhouse_core\.identity_profile_source_links/, () => [{ profile_id: 'p-other' }]]
    ])

    await expect(
      acceptExternalInvitation({ token: 'tok', environmentId: 'efeonce-auth', subject: 'sub-1' }, authServer)
    ).rejects.toMatchObject({ code: 'identity_collision' })
  })

  it('desactiva los subjects ANTERIORES de la misma persona y los devuelve (recuperación, TASK-1830)', async () => {
    route([
      [/WHERE token_hash = \$1\s+FOR UPDATE/, () => [invitationRow({ profile_id: 'p-1' })]],
      [/WHERE b\.binding_id = \$1 AND b\.population='external'\s+FOR UPDATE OF b/, () => [bindingRow()]],
      [/FROM greenhouse_core\.external_identity_environments/, () => [environmentRow()]],
      [/SELECT profile_id FROM greenhouse_core\.identity_profile_source_links/, () => []],
      [
        /SELECT active, status, merged_into_profile_id/,
        () => [{ active: true, status: 'active', merged_into_profile_id: null }]
      ],
      [/INSERT INTO greenhouse_core\.identity_profile_source_links/, () => []],
      [/UPDATE greenhouse_core\.identity_profile_source_links/, () => [{ source_object_id: 'sub-viejo' }]],
      [/revoke_reason = 'superseded_by_reinvitation'/, () => []],
      [
        /SET status = 'linked'/,
        params => [
          invitationRow({
            status: 'linked',
            profile_id: params[1],
            link_id: params[2],
            linked_at: '2026-09-04T00:00:00Z',
            accepted_at: '2026-09-04T00:00:00Z'
          })
        ]
      ],
      [/INSERT INTO greenhouse_core\.external_identity_audit_log/, () => []]
    ])

    const result = await acceptExternalInvitation(
      { token: 'tok', environmentId: 'efeonce-auth', subject: 'sub-nuevo' },
      authServer
    )

    // El emisor usa esta lista para matar sesión, passkeys y TOTP del subject viejo. Sin ella, quien
    // tuviera el passkey anterior conservaría el acceso que la re-invitación pretende quitarle.
    expect(result.supersededSubjects).toEqual(['sub-viejo'])

    const params = calls(/UPDATE greenhouse_core\.identity_profile_source_links/)[0]?.[1] as unknown[]

    // Sólo los OTROS subjects del mismo perfil y environment; el recién ligado no se toca.
    expect(params[0]).toBe('p-1')
    expect(params[1]).toBe('external_idp:efeonce-auth')
    expect(params[3]).toBe('sub-nuevo')
  })

  it('creates a new external_contact profile when nobody matches, links (environment, subject) and marks linked', async () => {
    route([
      [/WHERE token_hash = \$1\s+FOR UPDATE/, () => [invitationRow({ designated_admin: true })]],
      [/WHERE b\.binding_id = \$1 AND b\.population='external'\s+FOR UPDATE OF b/, () => [bindingRow()]],
      [/FROM greenhouse_core\.external_identity_environments/, () => [environmentRow()]],
      [/SELECT profile_id FROM greenhouse_core\.identity_profile_source_links/, () => []],
      [/lower\(canonical_email\) = \$1/, () => []],
      [/INSERT INTO greenhouse_core\.identity_profiles/, () => []],
      [/INSERT INTO greenhouse_core\.identity_profile_source_links/, () => []],
      [/UPDATE greenhouse_core\.identity_profile_source_links/, () => []],
      [/revoke_reason = 'superseded_by_reinvitation'/, () => []],
      [
        /SET status = 'linked'/,
        params => [
          invitationRow({
            status: 'linked',
            profile_id: params[1],
            link_id: params[2],
            linked_at: '2026-09-04T00:00:00Z',
            accepted_at: '2026-09-04T00:00:00Z'
          })
        ]
      ],
      [/SET designated_admin_profile_id = \$2/, () => []],
      [/INSERT INTO greenhouse_core\.external_identity_audit_log/, () => []]
    ])

    const result = await acceptExternalInvitation(
      {
        token: 'tok',
        environmentId: 'efeonce-auth',
        subject: 'sub-1',
        verifiedEmail: 'ANA@cliente.cl',
        displayName: 'Ana'
      },
      authServer
    )

    expect(result.profileCreated).toBe(true)
    expect(result.profileId).toMatch(/^identity-external-idp-efeonce-auth-subject-sub-1$/)
    expect(result.invitation.status).toBe('linked')

    const linkParams = calls(/INSERT INTO greenhouse_core\.identity_profile_source_links/)[0]?.[1] as unknown[]

    expect(linkParams[2]).toBe('external_idp:efeonce-auth')
    expect(linkParams[3]).toBe('subject')
    expect(linkParams[4]).toBe('sub-1')
    expect(calls(/SET designated_admin_profile_id/)).toHaveLength(1)
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'identity.external_invitation.linked' }),
      fakeClient
    )
  })
})

describe('TASK-1631 — revokeExternalAccess', () => {
  beforeEach(() => vi.clearAllMocks())

  it('binding scope revokes grants + members, deactivates orphan links and bumps grants_version', async () => {
    route([
      [/WHERE b\.binding_id = \$1 AND b\.population='external'\s+FOR UPDATE OF b/, () => [bindingRow()]],
      [/UPDATE greenhouse_core\.external_capability_grants[\s\S]*RETURNING grant_id/, () => [{ grant_id: 'xcg-1' }]],
      [
        /UPDATE greenhouse_core\.external_member_invitations[\s\S]*RETURNING invitation_id, profile_id/,
        () => [
          { invitation_id: 'xmi-1', profile_id: 'p-1' },
          { invitation_id: 'xmi-2', profile_id: null }
        ]
      ],
      [/UPDATE greenhouse_core\.external_organization_bindings\s+SET status = 'revoked'/, () => []],
      [/UPDATE greenhouse_core\.identity_profile_source_links l/, () => []],
      [/SET grants_version = grants_version \+ 1/, () => [{ grants_version: 2 }]],
      [/INSERT INTO greenhouse_core\.external_identity_audit_log/, () => []]
    ])

    const result = await revokeExternalAccess(
      { scope: 'binding', bindingId: 'xob-1', reason: 'cliente terminó' },
      actor
    )

    expect(result).toMatchObject({
      scope: 'binding',
      changed: true,
      grantsVersion: 2,
      revokedGrantIds: ['xcg-1'],
      revokedProfileIds: ['p-1'],
      revokedInvitationIds: ['xmi-1', 'xmi-2']
    })
    expect(calls(/UPDATE greenhouse_core\.identity_profile_source_links l/)).toHaveLength(1)
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'identity.external_access.revoked',
        payload: expect.objectContaining({ scope: 'binding', grantsVersion: 2 })
      }),
      fakeClient
    )
  })

  it('is idempotent on an already revoked binding (no bump, no audit, no outbox)', async () => {
    route([
      [
        /WHERE b\.binding_id = \$1 AND b\.population='external'\s+FOR UPDATE OF b/,
        () => [bindingRow({ status: 'revoked', revoked_at: '2026-09-04T00:00:00Z', grants_version: 7 })]
      ]
    ])

    const result = await revokeExternalAccess({ scope: 'binding', bindingId: 'xob-1', reason: 'again' }, actor)

    expect(result.changed).toBe(false)
    expect(result.grantsVersion).toBe(7)
    expect(calls(/grants_version \+ 1/)).toHaveLength(0)
    expect(publishMock).not.toHaveBeenCalled()
  })

  it('member scope revokes only that person and bumps grants_version', async () => {
    route([
      [/WHERE b\.binding_id = \$1 AND b\.population='external'\s+FOR UPDATE OF b/, () => [bindingRow()]],
      [
        /UPDATE greenhouse_core\.external_member_invitations[\s\S]*RETURNING invitation_id, profile_id/,
        params => {
          expect(params[3]).toBe('p-1')

          return [{ invitation_id: 'xmi-1', profile_id: 'p-1' }]
        }
      ],
      [
        /UPDATE greenhouse_core\.external_capability_grants[\s\S]*RETURNING grant_id/,
        params => {
          expect(params[3]).toBe('p-1')

          return []
        }
      ],
      [/UPDATE greenhouse_core\.identity_profile_source_links l/, () => []],
      [/SET grants_version = grants_version \+ 1/, () => [{ grants_version: 3 }]],
      [/INSERT INTO greenhouse_core\.external_identity_audit_log/, () => []]
    ])

    const result = await revokeExternalAccess(
      { scope: 'member', bindingId: 'xob-1', profileId: 'p-1', reason: 'baja' },
      actor
    )

    expect(result).toMatchObject({ scope: 'member', changed: true, grantsVersion: 3, revokedProfileIds: ['p-1'] })
  })

  it('requires a reason', async () => {
    await expect(revokeExternalAccess({ scope: 'grant', grantId: 'xcg-1', reason: '' }, actor)).rejects.toMatchObject({
      code: 'invalid_request'
    })
    expect(clientQueryMock).not.toHaveBeenCalled()
  })
})
