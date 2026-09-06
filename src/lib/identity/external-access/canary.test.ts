import { beforeEach, describe, expect, it, vi } from 'vitest'

type Handler = (params: unknown[], sql: string) => unknown[] | { rows: unknown[] }

const clientQueryMock = vi.fn()
const dbQueryMock = vi.fn()
const appendAuditMock = vi.fn()
const insertAuthorityBindingMock = vi.fn()
const publishMock = vi.fn()

const fakeClient = {
  query: (sql: string, params: unknown[] = []) => clientQueryMock(sql, params)
}

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => dbQueryMock(...args),
  withTransaction: async (callback: (client: typeof fakeClient) => Promise<unknown>) => callback(fakeClient)
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => publishMock(...args)
}))

vi.mock('./authority-transactions', () => ({
  appendAudit: (...args: unknown[]) => appendAuditMock(...args),
  insertAuthorityBinding: (...args: unknown[]) => insertAuthorityBindingMock(...args)
}))

vi.mock('./commands', () => ({
  revokeExternalAccess: vi.fn()
}))

const {
  bindExternalCanaryOrganization,
  cleanupExternalCanaryFixture,
  createExternalCanaryFixture,
  inspectExternalCanaryCleanup,
  planExternalCanaryFixture
} = await import('./canary')

const actor = { actorId: 'operator-task-1832' }
const registrationId = 'xcr-00000000-0000-4000-8000-000000000001'
const organizationId = 'org-00000000-0000-4000-8000-000000000001'
const organizationPublicId = 'EO-CANARY-00000000-0000-4000-8000-000000000001'
const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

const registrationRow = (overrides: Record<string, unknown> = {}) => ({
  canary_registration_id: registrationId,
  run_id: 'task-1832-local-001',
  organization_id: organizationId,
  public_id: organizationPublicId,
  organization_name: 'Efeonce MCP Canary — task-1832-local-001',
  environment_id: 'efeonce-auth',
  external_organization_ref: 'task-1832-local-001',
  capability: 'growth.seo.observation.read',
  status: 'active',
  reason: 'TASK-1832 local canary certification fixture',
  registered_by: actor.actorId,
  registered_at: '2026-09-06T18:00:00.000Z',
  expires_at: expiresAt,
  revoked_by: null,
  revoked_at: null,
  revoke_reason: null,
  ...overrides
})

const bindingRow = (overrides: Record<string, unknown> = {}) => ({
  binding_id: 'xob-00000000-0000-4000-8000-000000000001',
  organization_id: organizationId,
  organization_name: 'Efeonce MCP Canary — task-1832-local-001',
  environment_id: 'efeonce-auth',
  external_organization_ref: 'task-1832-local-001',
  population: 'external',
  binding_purpose: 'canary',
  canary_registration_id: registrationId,
  expires_at: expiresAt,
  status: 'active',
  grants_version: 1,
  designated_admin_profile_id: null,
  reason: 'TASK-1832 canary binding',
  bound_by: actor.actorId,
  bound_at: '2026-09-06T18:05:00.000Z',
  revoked_by: null,
  revoked_at: null,
  revoke_reason: null,
  ...overrides
})

const route = (handlers: Array<[RegExp, Handler]>) => {
  clientQueryMock.mockImplementation((sql: string, params: unknown[] = []) => {
    const match = handlers.find(([pattern]) => pattern.test(sql))

    if (!match) throw new Error(`unexpected SQL: ${sql.replace(/\s+/g, ' ').slice(0, 160)}`)

    const result = match[1](params, sql)

    return Promise.resolve(Array.isArray(result) ? { rows: result } : result)
  })
}

const cleanupRegistration = () =>
  registrationRow({
    status: 'revoked',
    revoked_by: actor.actorId,
    revoked_at: '2026-09-06T19:00:00.000Z',
    revoke_reason: 'TASK-1832 certification finished',
    organization_type: 'other',
    lifecycle_stage: 'disqualified',
    organization_active: false,
    organization_status: 'inactive',
    tax_id: null,
    hubspot_company_id: null
  })

describe('TASK-1832 — external canary lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('plans every durable identifier before the first database write', () => {
    const plan = planExternalCanaryFixture('task-1832-local-001')

    expect(plan).toMatchObject({ runId: 'task-1832-local-001' })
    expect(plan.canaryRegistrationId).toMatch(/^xcr-[0-9a-f-]{36}$/)
    expect(plan.organizationId).toMatch(/^org-[0-9a-f-]{36}$/)
    expect(plan.organizationPublicId).toMatch(/^EO-CANARY-[0-9a-f-]{36}$/)
    expect(clientQueryMock).not.toHaveBeenCalled()
  })

  it('creates only an inactive, disqualified, non-client organization from preplanned IDs', async () => {
    route([
      [/WHERE r\.run_id=\$1 OR r\.canary_registration_id=\$2/, () => []],
      [
        /SELECT issuer_class,status FROM greenhouse_core\.external_identity_environments/,
        () => [{ issuer_class: 'external', status: 'active' }]
      ],
      [/INSERT INTO greenhouse_core\.organizations/, () => []],
      [
        /INSERT INTO greenhouse_core\.external_canary_registrations/,
        params => [
          registrationRow({
            canary_registration_id: params[0],
            run_id: params[1],
            organization_id: params[2],
            environment_id: params[3],
            external_organization_ref: params[4],
            capability: params[5],
            reason: params[6],
            registered_by: params[7],
            expires_at: params[8],
            public_id: params[9],
            organization_name: params[10]
          })
        ]
      ]
    ])

    const result = await createExternalCanaryFixture(
      {
        runId: 'task-1832-local-001',
        canaryRegistrationId: registrationId,
        organizationId,
        organizationPublicId,
        environmentId: 'efeonce-auth',
        externalOrganizationRef: 'task-1832-local-001',
        expiresAt,
        reason: 'TASK-1832 local canary certification fixture'
      },
      actor
    )

    expect(result.created).toBe(true)

    const organizationInsert = clientQueryMock.mock.calls.find(call =>
      /INSERT INTO greenhouse_core\.organizations/.test(String(call[0]))
    )

    expect(String(organizationInsert?.[0])).toContain("'other','inactive',FALSE,FALSE,'disqualified'")
    expect(organizationInsert?.[1]).toEqual(
      expect.arrayContaining([organizationId, organizationPublicId, actor.actorId])
    )
    expect(appendAuditMock).toHaveBeenCalledWith(
      fakeClient,
      expect.objectContaining({ eventType: 'canary_registered' })
    )
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'identity.external_canary.registered' }),
      fakeClient
    )
  })

  it('binds only the exact active registration with purpose canary and the same expiry', async () => {
    route([
      [
        /WHERE r\.canary_registration_id=\$1 FOR UPDATE OF r,o/,
        () => [
          registrationRow({
            organization_type: 'other',
            lifecycle_stage: 'disqualified',
            organization_active: false,
            organization_status: 'inactive',
            tax_id: null,
            hubspot_company_id: null
          })
        ]
      ],
      [/organization_lifecycle_history/, () => [{ lifecycle: '0', spaces: '0', memberships: '0' }]],
      [/WHERE b\.canary_registration_id=\$1 OR/, () => []],
      [/WHERE b\.binding_id=\$1/, () => [bindingRow()]]
    ])

    const result = await bindExternalCanaryOrganization(
      { canaryRegistrationId: registrationId, reason: 'TASK-1832 bind isolated canary fixture' },
      actor
    )

    expect(result.created).toBe(true)
    expect(insertAuthorityBindingMock).toHaveBeenCalledWith(
      fakeClient,
      expect.objectContaining({
        organizationId,
        environmentId: 'efeonce-auth',
        population: 'external',
        bindingPurpose: 'canary',
        canaryRegistrationId: registrationId,
        expiresAt: new Date(expiresAt),
        designatedAdminProfileId: null
      })
    )
  })

  it('reports an unknown foreign-key reference and refuses to declare deletion ready', async () => {
    route([
      [/FROM greenhouse_core\.external_canary_registrations r/, () => [cleanupRegistration()]],
      [/SELECT binding_id,status FROM greenhouse_core\.external_organization_bindings/, () => []],
      [/canary_registration_id IS DISTINCT FROM \$2/, () => [{ total: '0' }]],
      [
        /FROM pg_constraint fk/,
        params =>
          params[0] === 'greenhouse_core.organizations'
            ? [
                {
                  source_schema: 'greenhouse_core',
                  source_table: 'organization_lifecycle_history',
                  source_column: 'organization_id',
                  columns: 1
                }
              ]
            : []
      ],
      [/FROM "greenhouse_core"\."organization_lifecycle_history"/, () => [{ total: '1' }]]
    ])

    const plan = await inspectExternalCanaryCleanup(registrationId)

    expect(plan.unexpectedRefs).toBe(1)
    expect(plan.deletionReady).toBe(false)
    expect(plan.foreignKeyReferences).toContainEqual(
      expect.objectContaining({
        sourceTable: 'organization_lifecycle_history',
        count: 1,
        expected: false
      })
    )
  })

  it('requires the migrator database role before any destructive cleanup statement', async () => {
    route([
      [/FROM greenhouse_core\.external_canary_registrations r/, () => [cleanupRegistration()]],
      [/SELECT binding_id,status FROM greenhouse_core\.external_organization_bindings/, () => []],
      [/canary_registration_id IS DISTINCT FROM \$2/, () => [{ total: '0' }]],
      [/FROM pg_constraint fk/, () => []],
      [
        /pg_has_role\(current_user,'greenhouse_migrator','member'\)/,
        () => [{ current_user: 'greenhouse_runtime', migrator: false }]
      ]
    ])

    await expect(
      cleanupExternalCanaryFixture(
        { canaryRegistrationId: registrationId, apply: true, reason: 'TASK-1832 approved cleanup after revocation' },
        actor
      )
    ).rejects.toMatchObject({ code: 'forbidden' })
    expect(clientQueryMock.mock.calls.some(call => /^\s*DELETE FROM/.test(String(call[0])))).toBe(false)
    expect(appendAuditMock).not.toHaveBeenCalled()
  })

  it('removes the owned graph in dependency order and proves a zero-row readback', async () => {
    const expectedCatalog = (target: unknown) => {
      switch (target) {
        case 'greenhouse_core.organizations':
          return [
            {
              source_schema: 'greenhouse_core',
              source_table: 'external_canary_registrations',
              source_column: 'organization_id',
              columns: 1
            },
            {
              source_schema: 'greenhouse_core',
              source_table: 'external_organization_bindings',
              source_column: 'organization_id',
              columns: 1
            }
          ]
        case 'greenhouse_core.external_organization_bindings':
          return [
            {
              source_schema: 'greenhouse_core',
              source_table: 'external_capability_grants',
              source_column: 'binding_id',
              columns: 1
            },
            {
              source_schema: 'greenhouse_core',
              source_table: 'external_member_invitations',
              source_column: 'binding_id',
              columns: 1
            }
          ]
        case 'greenhouse_core.identity_profiles':
          return [
            {
              source_schema: 'greenhouse_core',
              source_table: 'external_capability_grants',
              source_column: 'profile_id',
              columns: 1
            },
            {
              source_schema: 'greenhouse_core',
              source_table: 'external_member_invitations',
              source_column: 'profile_id',
              columns: 1
            },
            {
              source_schema: 'greenhouse_core',
              source_table: 'identity_profile_source_links',
              source_column: 'profile_id',
              columns: 1
            }
          ]
        case 'greenhouse_core.identity_profile_source_links':
          return [
            {
              source_schema: 'greenhouse_core',
              source_table: 'external_member_invitations',
              source_column: 'link_id',
              columns: 1
            }
          ]
        case 'greenhouse_core.external_canary_registrations':
          return [
            {
              source_schema: 'greenhouse_core',
              source_table: 'external_organization_bindings',
              source_column: 'canary_registration_id',
              columns: 1
            }
          ]
        default:
          return []
      }
    }

    route([
      [/FROM greenhouse_core\.external_canary_registrations r/, () => [cleanupRegistration()]],
      [
        /SELECT binding_id,status FROM greenhouse_core\.external_organization_bindings/,
        () => [{ binding_id: 'xob-canary', status: 'revoked' }]
      ],
      [/SELECT DISTINCT owned\.profile_id/, () => [{ profile_id: 'profile-canary' }]],
      [/SELECT DISTINCT link_id FROM greenhouse_core\.external_member_invitations/, () => [{ link_id: 'link-canary' }]],
      [
        /SELECT l\.link_id,l\.source_system/,
        () => [
          {
            link_id: 'link-canary',
            source_system: 'external_idp:efeonce-auth',
            source_object_type: 'subject',
            data_origin: 'smoke_test'
          }
        ]
      ],
      [/SELECT \([\s\S]*external_organization_bindings WHERE binding_id=ANY/, () => [{ total: '0' }]],
      [/canary_registration_id IS DISTINCT FROM \$2/, () => [{ total: '0' }]],
      [/FROM pg_constraint fk/, params => expectedCatalog(params[0])],
      [/SELECT count\(\*\)::text AS total FROM/, () => [{ total: '1' }]],
      [
        /pg_has_role\(current_user,'greenhouse_migrator','member'\)/,
        () => [{ current_user: 'greenhouse_migrator_user', migrator: true }]
      ],
      [/^\s*DELETE FROM/, () => []],
      [
        /AS organizations,[\s\S]*AS source_links/,
        () => [
          {
            organizations: '0',
            registrations: '0',
            bindings: '0',
            grants: '0',
            invitations: '0',
            profiles: '0',
            source_links: '0'
          }
        ]
      ]
    ])

    const result = await cleanupExternalCanaryFixture(
      { canaryRegistrationId: registrationId, apply: true, reason: 'TASK-1832 approved cleanup after certification' },
      actor
    )

    expect(result).toMatchObject({
      applied: true,
      readback: {
        organizations: 0,
        registrations: 0,
        bindings: 0,
        grants: 0,
        invitations: 0,
        profiles: 0,
        source_links: 0
      }
    })

    const deleteTargets = clientQueryMock.mock.calls
      .map(call => String(call[0]).match(/^\s*DELETE FROM\s+([^\s]+)/)?.[1])
      .filter(Boolean)

    expect(deleteTargets).toEqual([
      'greenhouse_core.external_capability_grants',
      'greenhouse_core.external_member_invitations',
      'greenhouse_core.identity_profile_source_links',
      'greenhouse_core.identity_profiles',
      'greenhouse_core.external_organization_bindings',
      'greenhouse_core.external_canary_registrations',
      'greenhouse_core.organizations'
    ])
    expect(appendAuditMock).toHaveBeenCalledWith(
      fakeClient,
      expect.objectContaining({ eventType: 'canary_cleanup_completed' })
    )
  })
})
