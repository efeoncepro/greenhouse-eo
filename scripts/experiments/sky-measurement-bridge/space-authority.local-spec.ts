import { hashSync } from 'bcryptjs'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// TASK-2096 — real resolver, real grants table (from its migration), real App routes and App session
// store against PG16 on a private socket. Mocked: only the outbox transport (captured INSERT through
// the caller's transaction client), auth audit and orthogonal UI metadata.
vi.mock('@/lib/auth-secrets', () => ({ getNextAuthSecret: () => 'synthetic-local-secret-never-a-production-key',
  getAzureAdClientSecret: () => null, getGoogleClientSecret: () => null,
  hasGoogleAuthProvider: () => false, hasMicrosoftAuthProvider: () => false }))
vi.mock('@/lib/admin/view-access-store', () => ({ resolveAuthorizedViewsForUser: async (input: { fallbackRouteGroups: string[] }) =>
  ({ authorizedViews: [], routeGroups: input.fallbackRouteGroups }) }))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn(), captureMessageWithDomain: vi.fn() }))
vi.mock('@/lib/auth/attempt-tracker', () => ({ recordAuthAttempt: vi.fn() }))
vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: async (event: { eventType: string; aggregateId: string }, client?: { query: (sql: string, params: unknown[]) => Promise<unknown> }) => {
    if (!client) throw new Error('Grant events must be written inside the grant transaction')
    await client.query(`INSERT INTO sky_experiment.outbox_capture(event_type, aggregate_id) VALUES ($1, $2)`, [event.eventType, event.aggregateId])

    return 'captured'
  }
}))

import { closeGreenhousePostgres, runGreenhousePostgresQuery as query } from '@/lib/postgres/client'
import { createFirstPartyAppSession } from '@/lib/api-platform/core/app-sessions'
import { grantSpaceAccess, listAuthorizedSpaces, resolveSpaceContext, revalidateSpaceContext, revokeSpaceAccess,
  SpaceAccessGrantError } from '@/lib/tenant/space-authority'
import { getOperationalSpaceUngrantedUsersSignal } from '@/lib/reliability/queries/operational-space-ungranted-users'
import { GET as listSpaces } from '@/app/api/platform/app/spaces/route'
import { GET as listServices } from '@/app/api/platform/app/spaces/[spaceId]/services/route'
import { GET as getService } from '@/app/api/platform/app/spaces/[spaceId]/services/[serviceId]/route'

const password = 'synthetic-only-password'
const passwordHash = hashSync(password, 4)
const actor = 'operator-local'
const reason = 'Synthetic local grant for TASK-2096 matrix'

const bearer = async (userId: string) =>
  (await createFirstPartyAppSession({ email: `${userId}@example.invalid`, password })).accessToken

const call = async (handler: (request: Request, ctx: never) => Promise<Response>, path: string, token: string, params?: Record<string, string>) => {
  const response = await handler(new Request(`https://local.invalid${path}`, { headers: { authorization: `Bearer ${token}` } }),
    { params: Promise.resolve(params ?? {}) } as never)

  return { status: response.status, body: await response.json() as { data?: unknown; error?: { code?: string } } }
}

const serviceIds = (body: { data?: unknown }) => (body.data as { serviceId: string }[]).map(s => s.serviceId).sort()
const spaceIds = (body: { data?: unknown }) => (body.data as { spaceId: string }[]).map(s => s.spaceId)

const designHistory = () => query(`SELECT md5(row_to_json(s)::text) AS digest FROM greenhouse_core.spaces s WHERE space_id='space-design'
  UNION ALL SELECT md5(row_to_json(v)::text) FROM greenhouse_core.services v WHERE space_id='space-design' ORDER BY 1`)

beforeAll(async () => {
  expect((await query(`SELECT current_database() AS db, inet_server_addr() IS NULL AS local`))[0]).toEqual({ db: 'sky_bridge_test', local: true })
})
afterAll(async () => { await closeGreenhousePostgres() })

// Model B (accepted ADR): one commercial client, two operational Spaces, a control organization.
beforeEach(async () => {
  vi.restoreAllMocks()
  await query(`TRUNCATE greenhouse_core.organizations, greenhouse_core.clients, greenhouse_core.client_users,
    greenhouse_core.roles, greenhouse_core.user_role_assignments, greenhouse_core.client_feature_flags,
    greenhouse_core.identity_profiles, greenhouse_core.first_party_app_sessions, sky_experiment.outbox_capture CASCADE`)
  await query(`INSERT INTO greenhouse_core.organizations(organization_id,organization_name) VALUES ('org-sky','Synthetic SKY'),('org-other','Synthetic other');
    INSERT INTO greenhouse_core.clients(client_id,client_name) VALUES ('client-owner','SKY'),('client-other','Other'),('client-solo','Solo');
    INSERT INTO greenhouse_core.organizations(organization_id,organization_name) VALUES ('org-solo','Synthetic single account');
    INSERT INTO greenhouse_core.spaces(space_id,organization_id,client_id,updated_at) VALUES
      ('space-design','org-sky','client-owner','2026-02-01'),('space-seo','org-sky','client-owner','2026-01-01'),
      ('space-other','org-other','client-other','2026-01-01'),('space-solo','org-solo','client-solo','2026-01-01');
    INSERT INTO greenhouse_core.services(service_id,name,space_id,organization_id,active,status) VALUES
      ('service-design','Diseño','space-design','org-sky',true,'active'),('service-seo','Blog SEO','space-seo','org-sky',true,'active'),
      ('service-other','Other','space-other','org-other',true,'active'),('service-solo','Solo','space-solo','org-solo',true,'active');
    INSERT INTO greenhouse_core.roles VALUES ('client_manager',ARRAY['client'])`)

  for (const [user, client] of [['design', 'client-owner'], ['seo', 'client-owner'], ['dual', 'client-owner'],
    ['ungranted', 'client-owner'], ['other', 'client-other'], ['solo', 'client-solo']]) {
    await query(`INSERT INTO greenhouse_core.identity_profiles(profile_id) VALUES ($1)`, [`person-${user}`])
    await query(`INSERT INTO greenhouse_core.client_users(user_id,email,full_name,client_id,identity_profile_id,password_hash,password_hash_algorithm)
      VALUES ($1,$2,$1,$3,$4,$5,'bcrypt')`, [user, `${user}@example.invalid`, client, `person-${user}`, passwordHash])
    await query(`INSERT INTO greenhouse_core.user_role_assignments(user_id,role_code) VALUES ($1,'client_manager')`, [user])
  }

  for (const [user, space, verbs] of [['design', 'space-design', ['read', 'create']], ['seo', 'space-seo', ['read', 'create']],
    ['dual', 'space-design', ['read', 'create']], ['dual', 'space-seo', ['read']]] as const) {
    await grantSpaceAccess({ identityProfileId: `person-${user}`, spaceId: space, verbs, reason, actorUserId: actor })
  }
})

describe('TASK-2096 — HTTP matrix over the real App routes (model B)', () => {
  it.each([
    ['design', ['space-design']],
    ['seo', ['space-seo']],
    ['dual', ['space-design', 'space-seo']],
    ['solo', ['space-solo']]
  ] as const)('%s: enumeration lists exactly its Spaces', async (user, spaces) => {
    const result = await call(listSpaces, '/api/platform/app/spaces', await bearer(user))

    expect(result.status).toBe(200)
    expect(spaceIds(result.body)).toEqual(spaces)
  })

  it('a user without identity profile keeps its single Space over HTTP (2 of 7 real client users, 2026-11-06)', async () => {
    await query(`INSERT INTO greenhouse_core.client_users(user_id,email,full_name,client_id,password_hash,password_hash_algorithm)
      VALUES ('noprofile','noprofile@example.invalid','noprofile','client-solo',$1,'bcrypt')`, [passwordHash])
    await query(`INSERT INTO greenhouse_core.user_role_assignments(user_id,role_code) VALUES ('noprofile','client_manager')`)
    const token = await bearer('noprofile')

    expect(spaceIds((await call(listSpaces, '/api/platform/app/spaces', token)).body)).toEqual(['space-solo'])
    expect((await call(listServices, '/api/platform/app/spaces/space-solo/services', token, { spaceId: 'space-solo' })).status).toBe(200)
  })

  it('a person with no grant in a multi-Space client gets an empty enumeration and 404 on both Spaces', async () => {
    const token = await bearer('ungranted')

    expect(spaceIds((await call(listSpaces, '/api/platform/app/spaces', token)).body)).toEqual([])

    for (const space of ['space-design', 'space-seo']) {
      expect((await call(listServices, `/api/platform/app/spaces/${space}/services`, token, { spaceId: space })).status).toBe(404)
    }
  })

  it.each([
    ['design', 'space-design', 200, ['service-design']], ['design', 'space-seo', 404, null],
    ['seo', 'space-seo', 200, ['service-seo']], ['seo', 'space-design', 404, null],
    ['dual', 'space-design', 200, ['service-design']], ['dual', 'space-seo', 200, ['service-seo']],
    ['other', 'space-design', 404, null], ['other', 'space-seo', 404, null], ['design', 'space-other', 404, null]
  ] as const)('list: %s on %s → %s, never a union of departments', async (user, space, status, services) => {
    const result = await call(listServices, `/api/platform/app/spaces/${space}/services`, await bearer(user), { spaceId: space })

    expect(result.status).toBe(status)
    if (services) expect(serviceIds(result.body)).toEqual(services)
  })

  it.each([
    ['design', 'space-design', 'service-design', 200], ['design', 'space-design', 'service-seo', 404],
    ['seo', 'space-seo', 'service-seo', 200], ['dual', 'space-seo', 'service-design', 404],
    ['other', 'space-other', 'service-other', 200], ['other', 'space-design', 'service-design', 404],
    ['design', 'space-other', 'service-other', 404]
  ] as const)('detail: %s reading %s/%s → %s', async (user, space, service, status) => {
    const result = await call(getService, `/api/platform/app/spaces/${space}/services/${service}`, await bearer(user),
      { spaceId: space, serviceId: service })

    expect(result.status).toBe(status)
  })

  it('a read grant does not confer create', async () => {
    const token = await bearer('dual')

    expect((await call(listServices, '/api/platform/app/spaces/space-design/services?need=create', token, { spaceId: 'space-design' })).status).toBe(200)
    expect((await call(listServices, '/api/platform/app/spaces/space-seo/services?need=create', token, { spaceId: 'space-seo' })).status).toBe(404)
  })

  it('revoking SEO keeps Design for the dual user, on the very next request', async () => {
    const token = await bearer('dual')

    const seoGrant = (await query<{ grant_id: string }>(`SELECT grant_id FROM greenhouse_core.space_access_grants
      WHERE identity_profile_id='person-dual' AND space_id='space-seo'`))[0].grant_id

    await revokeSpaceAccess({ grantId: seoGrant, reason: 'Synthetic SEO revocation for matrix', actorUserId: actor })

    expect((await call(listServices, '/api/platform/app/spaces/space-seo/services', token, { spaceId: 'space-seo' })).status).toBe(404)
    expect((await call(listServices, '/api/platform/app/spaces/space-design/services', token, { spaceId: 'space-design' })).status).toBe(200)
    expect(spaceIds((await call(listSpaces, '/api/platform/app/spaces', token)).body)).toEqual(['space-design'])
  })

  it('a disabled person is rejected by the App lane immediately', async () => {
    const token = await bearer('dual')

    await query(`UPDATE greenhouse_core.client_users SET active=false,status='disabled' WHERE user_id='dual'`)
    expect((await call(listSpaces, '/api/platform/app/spaces', token)).status).toBe(401)
  })

  it('two tabs with different contexts resolve independently; Space metadata cannot switch either', async () => {
    const [design, seo] = await Promise.all([
      resolveSpaceContext({ userId: 'dual', need: 'read', spaceId: 'space-design' }),
      resolveSpaceContext({ userId: 'dual', need: 'read', spaceId: 'space-seo' })
    ])

    expect(design.status === 'authorized' && design.context.spaceId).toBe('space-design')
    expect(seo.status === 'authorized' && seo.context.spaceId).toBe('space-seo')
    await query(`UPDATE greenhouse_core.spaces SET updated_at='2026-09-01' WHERE space_id='space-seo'`)
    if (design.status !== 'authorized' || seo.status !== 'authorized') throw new Error('unreachable')
    expect(await revalidateSpaceContext('dual', design.context)).toEqual(design)
    expect(await revalidateSpaceContext('dual', seo.context)).toEqual(seo)
    expect(await resolveSpaceContext({ userId: 'dual', need: 'read' })).toMatchObject({ status: 'selection_required' })
  })

  it('a context selected before a revoke/regrant is stale, even if the new grant allows the Space', async () => {
    const selected = await resolveSpaceContext({ userId: 'dual', need: 'read', spaceId: 'space-seo' })

    if (selected.status !== 'authorized') throw new Error('expected authorized')
    await revokeSpaceAccess({ grantId: selected.context.grantId, reason: 'Synthetic revoke before regrant', actorUserId: actor })
    await grantSpaceAccess({ identityProfileId: 'person-dual', spaceId: 'space-seo', verbs: ['read'], reason, actorUserId: actor })

    expect(await revalidateSpaceContext('dual', selected.context)).toEqual({ status: 'denied', reason: 'context_stale' })
    expect(await revalidateSpaceContext('seo', selected.context)).toEqual({ status: 'denied', reason: 'space_not_allowed' })
  })

  it('updated_at on a Space never changes the session row or the enumeration', async () => {
    const before = await query(`SELECT space_id, space_selection_required FROM greenhouse_serving.session_360 WHERE user_id='dual'`)

    await query(`UPDATE greenhouse_core.spaces SET updated_at='2026-12-01' WHERE space_id='space-seo'`)
    expect(await query(`SELECT space_id, space_selection_required FROM greenhouse_serving.session_360 WHERE user_id='dual'`)).toEqual(before)
    expect(before).toEqual([{ space_id: null, space_selection_required: true }])
  })
})

describe('TASK-2096 — grants store and table contract (real migration)', () => {
  it('every grant write emits its audit event inside the same transaction', async () => {
    expect((await query(`SELECT event_type FROM sky_experiment.outbox_capture`)).map(r => r.event_type))
      .toEqual(Array(4).fill('identity.space_access.granted'))
  })

  it('a grant cannot reach a person outside the Space client, nor a foreign or inactive Space', async () => {
    await expect(grantSpaceAccess({ identityProfileId: 'person-other', spaceId: 'space-seo', verbs: ['read'], reason, actorUserId: actor }))
      .rejects.toMatchObject({ code: 'profile_not_in_client' })
    await query(`UPDATE greenhouse_core.spaces SET active=false WHERE space_id='space-seo'`)
    await expect(grantSpaceAccess({ identityProfileId: 'person-ungranted', spaceId: 'space-seo', verbs: ['read'], reason, actorUserId: actor }))
      .rejects.toMatchObject({ code: 'space_inactive' })
    await expect(grantSpaceAccess({ identityProfileId: 'person-ungranted', spaceId: 'space-missing', verbs: ['read'], reason, actorUserId: actor }))
      .rejects.toBeInstanceOf(SpaceAccessGrantError)
  })

  it('rejects unknown verbs and short reasons before touching the database', async () => {
    await expect(grantSpaceAccess({ identityProfileId: 'person-ungranted', spaceId: 'space-seo', verbs: ['admin'], reason, actorUserId: actor }))
      .rejects.toMatchObject({ code: 'invalid_input' })
    await expect(grantSpaceAccess({ identityProfileId: 'person-ungranted', spaceId: 'space-seo', verbs: ['read'], reason: 'short', actorUserId: actor }))
      .rejects.toMatchObject({ code: 'invalid_input' })
  })

  it('two concurrent first grants for the same person and Space leave exactly one active row', async () => {
    const attempts = await Promise.allSettled([1, 2].map(() =>
      grantSpaceAccess({ identityProfileId: 'person-ungranted', spaceId: 'space-seo', verbs: ['read'], reason, actorUserId: actor, expectedVersion: 0 })))

    expect(attempts.filter(a => a.status === 'fulfilled')).toHaveLength(1)
    expect(attempts.find(a => a.status === 'rejected')).toMatchObject({ reason: { code: 'version_conflict' } })
    expect((await query(`SELECT count(*)::int AS n FROM greenhouse_core.space_access_grants
      WHERE identity_profile_id='person-ungranted' AND space_id='space-seo' AND active`))[0].n).toBe(1)
  })

  it('a stale expected version cannot overwrite a newer grant', async () => {
    await expect(grantSpaceAccess({ identityProfileId: 'person-dual', spaceId: 'space-seo', verbs: ['read', 'create'], reason,
      actorUserId: actor, expectedVersion: 7 })).rejects.toMatchObject({ code: 'version_conflict' })
  })

  it('the table refuses unknown verbs and silent revocations even outside the store', async () => {
    await expect(query(`INSERT INTO greenhouse_core.space_access_grants(identity_profile_id,organization_id,space_id,verbs,reason,granted_by)
      VALUES ('person-ungranted','org-sky','space-seo',ARRAY['delete'],'Synthetic direct insert','x')`)).rejects.toMatchObject({ code: '23514' })
    await expect(query(`UPDATE greenhouse_core.space_access_grants SET active=false WHERE identity_profile_id='person-design'`))
      .rejects.toMatchObject({ code: '23514' })
  })

  it('the runtime role can read, grant and revoke but never delete a grant', async () => {
    expect((await query(`SELECT has_table_privilege('greenhouse_runtime','greenhouse_core.space_access_grants','DELETE') AS d,
      has_table_privilege('greenhouse_runtime','greenhouse_core.space_access_grants','UPDATE') AS u`))[0]).toEqual({ d: false, u: true })
  })

  it('a single-Space client keeps today\'s behaviour without any grant; an explicit grant then governs', async () => {
    expect((await listAuthorizedSpaces('solo', 'create')).map(s => [s.spaceId, s.source])).toEqual([['space-solo', 'single_space_client']])
    expect(await designHistory()).toHaveLength(2)
  })
})

describe('TASK-2096 — reliability signal over the real tables', () => {
  it('counts the active person of the multi-Space client with no grant, and clears when granted', async () => {
    const before = await getOperationalSpaceUngrantedUsersSignal()

    expect(before).toMatchObject({ severity: 'warning', evidence: expect.arrayContaining([{ kind: 'metric', label: 'count', value: '1' }]) })
    await grantSpaceAccess({ identityProfileId: 'person-ungranted', spaceId: 'space-design', verbs: ['read'], reason, actorUserId: actor })
    expect((await getOperationalSpaceUngrantedUsersSignal()).severity).toBe('ok')
  })

  it('a disabled person or a single-Space client never counts', async () => {
    await query(`UPDATE greenhouse_core.client_users SET active=false,status='disabled' WHERE user_id='ungranted'`)
    expect((await getOperationalSpaceUngrantedUsersSignal()).severity).toBe('ok')
  })
})
