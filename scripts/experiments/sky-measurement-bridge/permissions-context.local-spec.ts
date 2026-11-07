import { hashSync } from 'bcryptjs'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { decode, encode, type JWT } from 'next-auth/jwt'
import type { Session } from 'next-auth'

import type * as LocalePreferences from '@/lib/i18n/locale-preferences'

// Orthogonal UI metadata and external transports only. Tenant, JWT/session callbacks,
// app token crypto/store, Insights authorization/resource/readers, and PG are REAL.
vi.mock('@/lib/auth-secrets', () => ({ getNextAuthSecret: () => 'synthetic-local-secret-never-a-production-key',
  getAzureAdClientSecret: () => null, getGoogleClientSecret: () => null,
  hasGoogleAuthProvider: () => false, hasMicrosoftAuthProvider: () => false }))
vi.mock('@/lib/admin/view-access-store', () => ({ resolveAuthorizedViewsForUser: async (input: { fallbackRouteGroups: string[] }) =>
  ({ authorizedViews: [], routeGroups: input.fallbackRouteGroups }) }))
vi.mock('@/lib/i18n/locale-preferences', async importOriginal => ({
  ...await importOriginal<typeof LocalePreferences>(),
  getUserLocalePreferenceSnapshot: async () => ({ effectiveLocale: 'es' })
}))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn(), captureMessageWithDomain: vi.fn() }))
vi.mock('@/lib/auth/attempt-tracker', () => ({ recordAuthAttempt: vi.fn() }))
vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent: vi.fn(() => { throw new Error('No external event authorized') }) }))

import { getAuthOptions } from '@/lib/auth'
import { getTenantAccessRecordByUserId } from '@/lib/tenant/access'
import { closeGreenhousePostgres, runGreenhousePostgresQuery as query } from '@/lib/postgres/client'
import { createFirstPartyAppSession, decodeAppAccessToken, refreshFirstPartyAppSession,
  resolveAppSessionTenant, revokeFirstPartyAppSession } from '@/lib/api-platform/core/app-sessions'
import { listAppInsightReports } from '@/lib/api-platform/resources/app-insights-read'
import type { AppPlatformRequestContext } from '@/lib/api-platform/core/app-auth'
import { SessionAccessRevokedError } from '@/lib/auth/session-access-revoked'
import { LocalAccessDenied, selectLocalSpaceContext, revalidateLocalSpaceContext, readLocalBoundReport } from './space-context-candidate'

const secret = 'synthetic-local-secret-never-a-production-key'
const password = 'synthetic-only-password'
const passwordHash = hashSync(password, 4)

const target = (department: 'design' | 'seo', need: 'read' | 'create' = 'read') =>
  ({ organizationId: 'org-sky', spaceId: `space-${department}`, serviceId: `service-${department}`, need })

const callbacks = () => getAuthOptions().callbacks!

const freshJwt = async (userId: string) => {
  const jwt = callbacks().jwt!

  return jwt({ token: { userId, provider: 'credentials', accessClaimsRefreshedAt: 0,
    supervisorAccess: null, hasActiveContractorEngagement: false, hasWorkforceContractingDocument: false } } as unknown as Parameters<typeof jwt>[0])
}

const refreshJwt = async (token: JWT) => {
  const jwt = callbacks().jwt!

  return jwt({ token: structuredClone(token) } as Parameters<typeof jwt>[0])
}

const cookieRoundTrip = async (token: JWT) => {
  const cookie = await encode({ token, secret })
  const verified = await decode({ token: cookie, secret })

  expect(verified?.userId).toBe(token.userId)

  return verified!
}

const materializeSession = async (token: JWT) => {
  const session = callbacks().session!

  return await session({ session: { user: {}, expires: new Date(Date.now() + 3600_000).toISOString() }, token } as Parameters<typeof session>[0]) as Session
}

const listCurrentReports = async (userId: string, suffix = '') => {
  const tenant = await getTenantAccessRecordByUserId(userId)
  // HTTP envelope/auth transport is outside this test; resource receives a server-derived principal.
  const context = { tenant } as unknown as AppPlatformRequestContext

  return listAppInsightReports({ context, request: new Request(`https://local.invalid/api/platform/app/insights/reports${suffix}`) })
}

const createApp = (userId: string) => createFirstPartyAppSession({ email: `${userId}@example.invalid`, password })

const resolveApp = async (accessToken: string) => {
  const payload = await decodeAppAccessToken(accessToken)

  return resolveAppSessionTenant({ sessionId: payload.sid, userId: payload.sub })
}

const designDigest = async () => query(`SELECT md5(row_to_json(r)::text) AS digest FROM greenhouse_insights.insight_reports r WHERE report_id='report-design'
  UNION ALL SELECT md5(row_to_json(s)::text) FROM greenhouse_core.spaces s WHERE space_id='space-design'
  UNION ALL SELECT md5(row_to_json(f)::text) FROM greenhouse_finance.client_profiles f WHERE client_profile_id='profile-owner'`)

beforeAll(async () => {
  expect((await query(`SELECT current_database() AS db, inet_server_addr() IS NULL AS local`))[0])
    .toEqual({ db: 'sky_bridge_test', local: true })
})
afterAll(async () => { await closeGreenhousePostgres() })
afterEach(() => vi.restoreAllMocks())

describe.each(['A-prime', 'B'] as const)('permission/context experiment %s', variant => {
  const seoClient = variant === 'A-prime' ? 'client-seo' : 'client-owner'
  let history: Awaited<ReturnType<typeof designDigest>>

  beforeEach(async () => {
    await query(`TRUNCATE greenhouse_core.organizations, greenhouse_core.clients, greenhouse_core.client_users,
      greenhouse_core.roles, greenhouse_core.user_role_assignments, greenhouse_core.client_feature_flags,
      greenhouse_core.service_modules, greenhouse_core.v_client_active_modules,
      greenhouse_core.person_memberships, greenhouse_core.user_project_scopes, greenhouse_core.user_campaign_scopes CASCADE`)
    await query(`INSERT INTO greenhouse_core.organizations(organization_id,organization_name)
      VALUES ('org-sky','Synthetic SKY'),('org-other','Synthetic other');
      INSERT INTO greenhouse_core.clients(client_id,client_name) VALUES ('client-owner','SKY'),('client-seo','SEO'),('client-other','Other');`)
    await query(`INSERT INTO greenhouse_core.spaces(space_id,organization_id,client_id,updated_at)
      VALUES ('space-design','org-sky','client-owner','2026-02-01'),('space-seo','org-sky',$1,'2026-01-01'),
      ('space-other','org-other','client-other','2026-01-01')`, [seoClient])
    await query(`INSERT INTO greenhouse_core.roles VALUES ('client_manager',ARRAY['client']),('client_specialist',ARRAY['client']);
      INSERT INTO greenhouse_core.services(service_id,space_id,organization_id,active,status) VALUES
      ('service-design','space-design','org-sky',true,'active'),('service-seo','space-seo','org-sky',true,'active'),
      ('service-other','space-other','org-other',true,'active');
      INSERT INTO greenhouse_finance.client_profiles(client_profile_id,client_id,organization_id)
      VALUES ('profile-owner','client-owner','org-sky');
      INSERT INTO greenhouse_client_portal.module_assignments(organization_id,module_key,status)
      VALUES ('org-sky','insights_v1','active'),('org-other','insights_v1','active');
      INSERT INTO greenhouse_insights.insight_reports(report_id,report_code,organization_id,title,purpose)
      VALUES ('report-design','DESIGN','org-sky','Historical design fixture','design'),
      ('report-seo','SEO','org-sky','Blog fixture','seo'),('report-other','OTHER','org-other','Other fixture','control');
      INSERT INTO sky_experiment.report_bindings VALUES ('report-design','space-design','service-design'),('report-seo','space-seo','service-seo');`)

    for (const [user, client] of [['design', 'client-owner'], ['seo', seoClient], ['dual', 'client-owner'], ['ungranted', 'client-owner'], ['other', 'client-other']]) {
      await query(`INSERT INTO greenhouse_core.client_users(user_id,email,full_name,client_id,identity_profile_id,password_hash,password_hash_algorithm)
        VALUES ($1,$2,$1,$3,$4,$5,'bcrypt');`, [user, `${user}@example.invalid`, client, `person-${user}`, passwordHash])
      await query(`INSERT INTO greenhouse_core.user_role_assignments(user_id,role_code) VALUES ($1,'client_manager')`, [user])
    }

    for (const [user, dep, needs] of [['design', 'design', ['read','create']], ['seo', 'seo', ['read','create']],
      ['dual', 'design', ['read','create']], ['dual', 'seo', ['read']], ['other', 'other', ['read']]] as const) {
      const org = user === 'other' ? 'org-other' : 'org-sky'

      await query(`INSERT INTO greenhouse_core.person_memberships(membership_id,profile_id,organization_id,space_id,is_primary)
        VALUES ($1,$2,$3,$4,true)`, [`membership-${user}-${dep}`, `person-${user}`, org, `space-${dep}`])
      await query(`INSERT INTO sky_experiment.space_grants(grant_id,profile_id,organization_id,space_id,needs)
        VALUES ($1,$2,$3,$4,$5)`, [`grant-${user}-${dep}`, `person-${user}`, org, `space-${dep}`, needs])
    }

    history = await designDigest()
  })
  afterEach(async () => { expect(await designDigest()).toEqual(history) })

  // TASK-2096 (H1): session_360 comes from the current migration. A client with two active Spaces
  // (B) gets NO implicit Space and an explicit selection flag; a single-Space client keeps its Space.
  it.each(['design', 'seo', 'dual'])('cookie: %s user never gets a Space chosen by row order', async user => {
    const token = await cookieRoundTrip(await freshJwt(user))
    const session = await materializeSession(token)

    expect(session.user.spaceId).toBe(variant === 'B' ? undefined : user === 'seo' ? 'space-seo' : 'space-design')
    expect(session.user.spaceSelectionRequired).toBe(variant === 'B')
    expect(session.user.organizationId).toBe('org-sky')
    expect(session.user.userId).toBe(user)
  })

  it('cookie refresh of dual user never follows Space metadata (H1 closed)', async () => {
    const token = await freshJwt('dual')

    await query(`UPDATE greenhouse_core.spaces SET updated_at='2026-03-01' WHERE space_id='space-seo'`)
    const now = token.accessClaimsRefreshedAt as number

    vi.spyOn(Date, 'now').mockReturnValue(now + 300_001)
    const refreshed = await refreshJwt(token)

    expect(refreshed.spaceId).toBe(token.spaceId)
    expect(token.spaceId).toBe(variant === 'B' ? undefined : 'space-design')
    expect(refreshed.spaceSelectionRequired).toBe(variant === 'B')
  })

  it('CURRENT GAP: membership revocation does not revoke cookie context after refresh', async () => {
    const token = await freshJwt('seo')

    await query(`UPDATE greenhouse_core.person_memberships SET active=false WHERE profile_id='person-seo'`)
    vi.spyOn(Date, 'now').mockReturnValue((token.accessClaimsRefreshedAt as number) + 300_001)
    const session = await materializeSession(await refreshJwt(token))

    expect(session.user.organizationId).toBe('org-sky')
    expect(session.user.roleCodes).toContain('client_manager')
  })

  it('real role revocation takes effect after strictly more than five minutes, not at the boundary', async () => {
    const token = await freshJwt('seo')
    const clock = vi.spyOn(Date, 'now')
    const t0 = token.accessClaimsRefreshedAt as number

    await query(`UPDATE greenhouse_core.user_role_assignments SET active=false WHERE user_id='seo'`)
    clock.mockReturnValue(t0 + 299_999)
    expect((await refreshJwt(token)).roleCodes).toContain('client_manager')
    clock.mockReturnValue(t0 + 300_000)
    expect((await refreshJwt(token)).roleCodes).toContain('client_manager')
    clock.mockReturnValue(t0 + 300_001)
    expect((await refreshJwt(token)).roleCodes).toEqual([])
  })

  it('disabled identity loses its cookie: the refresh throws so NextAuth drops the session (H2 closed)', async () => {
    const token = await freshJwt('seo')

    await query(`UPDATE greenhouse_core.client_users SET active=false,status='disabled' WHERE user_id='seo'`)
    vi.spyOn(Date, 'now').mockReturnValue((token.accessClaimsRefreshedAt as number) + 300_001)

    await expect(refreshJwt(token)).rejects.toBeInstanceOf(SessionAccessRevokedError)
    await expect(selectLocalSpaceContext('seo', target('seo'))).rejects.toBeInstanceOf(LocalAccessDenied)
  })

  it('concurrent refreshes of a disabled identity all fail; none keeps the old claims', async () => {
    const token = await freshJwt('dual')

    await query(`UPDATE greenhouse_core.client_users SET active=false,status='disabled' WHERE user_id='dual'`)
    vi.spyOn(Date, 'now').mockReturnValue((token.accessClaimsRefreshedAt as number) + 300_001)
    const outcomes = await Promise.allSettled([refreshJwt(token), refreshJwt(token), refreshJwt(token)])

    expect(outcomes.map(o => o.status)).toEqual(['rejected', 'rejected', 'rejected'])
    expect(outcomes.every(o => o.status === 'rejected' && o.reason instanceof SessionAccessRevokedError)).toBe(true)
  })

  it.each(['design', 'seo', 'dual'])('CURRENT GAP: real Insights App resource lists both departments for %s despite space query', async user => {
    const result = await listCurrentReports(user, '?spaceId=space-seo')

    expect(result.data.map(r => r.reportId).sort()).toEqual(['report-design', 'report-seo'])
  })

  it('real Insights gate denies another organization', async () => {
    await expect(listCurrentReports('design', '?organizationId=org-other')).rejects.toMatchObject({ statusCode: 404 })
  })

  it('real Insights module revocation immediately blocks the resource', async () => {
    await query(`UPDATE greenhouse_client_portal.module_assignments SET status='revoked' WHERE organization_id='org-sky'`)
    await expect(listCurrentReports('seo')).rejects.toMatchObject({ statusCode: 404 })
    await expect(selectLocalSpaceContext('seo', target('seo'))).rejects.toThrow()
  })

  it('App refresh rotates token, rejects sequential reuse and preserves the same user', async () => {
    const original = await createApp('dual')
    const refreshed = await refreshFirstPartyAppSession(original.refreshToken)

    expect(refreshed.refreshToken).not.toBe(original.refreshToken)
    expect(refreshed.appSessionId).toBe(original.appSessionId)
    expect((await resolveApp(refreshed.accessToken)).userId).toBe('dual')
    await expect(refreshFirstPartyAppSession(original.refreshToken)).rejects.toMatchObject({ statusCode: 401 })
    // Existing access token remains valid under the same active durable session (not a claimed bug).
    expect((await resolveApp(original.accessToken)).userId).toBe('dual')
  })

  it('real App session revocation denies existing access and refresh tokens', async () => {
    const pair = await createApp('seo')

    await revokeFirstPartyAppSession({ sessionId: pair.appSessionId, userId: 'seo' })
    await expect(resolveApp(pair.accessToken)).rejects.toMatchObject({ statusCode: 401, errorCode: 'session_revoked' })
    await expect(refreshFirstPartyAppSession(pair.refreshToken)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('App revocation with another user does not revoke the legitimate session', async () => {
    const pair = await createApp('seo')

    await revokeFirstPartyAppSession({ sessionId: pair.appSessionId, userId: 'design' })
    expect((await resolveApp(pair.accessToken)).userId).toBe('seo')
  })

  it('real App resolver and refresh deny disabled identity immediately', async () => {
    const pair = await createApp('seo')

    await query(`UPDATE greenhouse_core.client_users SET active=false,status='disabled' WHERE user_id='seo'`)
    await expect(resolveApp(pair.accessToken)).rejects.toMatchObject({ statusCode: 401 })
    await expect(refreshFirstPartyAppSession(pair.refreshToken)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('real App resolver denies expired durable session and marks it expired', async () => {
    const pair = await createApp('seo')

    await query(`UPDATE greenhouse_core.first_party_app_sessions SET expires_at=now()-interval '1 second' WHERE app_session_id=$1`, [pair.appSessionId])
    await expect(resolveApp(pair.accessToken)).rejects.toMatchObject({ statusCode: 401 })
    expect((await query(`SELECT session_status FROM greenhouse_core.first_party_app_sessions WHERE app_session_id=$1`, [pair.appSessionId]))[0]?.session_status).toBe('expired')
  })

  it('CURRENT GAP: App membership revocation still permits resolve and renewal', async () => {
    const pair = await createApp('seo')

    await query(`UPDATE greenhouse_core.person_memberships SET active=false WHERE profile_id='person-seo'`)
    expect((await resolveApp(pair.accessToken)).userId).toBe('seo')
    expect((await refreshFirstPartyAppSession(pair.refreshToken)).tenant.userId).toBe('seo')
  })

  it.each(['design', 'seo'] as const)('candidate: %s-only principal denied the other department', async dep => {
    const context = await selectLocalSpaceContext(dep, target(dep))

    expect((await readLocalBoundReport(dep, context, `report-${dep}`)).reportId).toBe(`report-${dep}`)
    await expect(selectLocalSpaceContext(dep, target(dep === 'seo' ? 'design' : 'seo'))).rejects.toBeInstanceOf(LocalAccessDenied)
  })

  it('candidate: dual principal selects both contexts independently without mutating identity or cookie', async () => {
    const token = await cookieRoundTrip(await freshJwt('dual'))

    const [design, seo] = await Promise.all([selectLocalSpaceContext(token.userId as string, target('design')),
      selectLocalSpaceContext(token.userId as string, target('seo'))])

    expect(design.spaceId).toBe('space-design')
    expect(seo.spaceId).toBe('space-seo')
    expect(seo.bridgeClientId).toBe(seoClient)
    expect(token.spaceId).toBe(variant === 'B' ? undefined : 'space-design')
    expect((await readLocalBoundReport('dual', seo, 'report-seo')).reportId).toBe('report-seo')
    await expect(readLocalBoundReport('dual', seo, 'report-design')).rejects.toBeInstanceOf(LocalAccessDenied)
  })

  it('candidate: revoked SEO grant rejects previously selected context, keeps dual user Design access', async () => {
    const selected = await selectLocalSpaceContext('dual', target('seo'))

    await query(`UPDATE sky_experiment.space_grants SET active=false,version=version+1 WHERE grant_id='grant-dual-seo'`)
    await expect(revalidateLocalSpaceContext('dual', selected)).rejects.toBeInstanceOf(LocalAccessDenied)
    await expect(selectLocalSpaceContext('dual', target('seo'))).rejects.toBeInstanceOf(LocalAccessDenied)
    expect((await selectLocalSpaceContext('dual', target('design'))).spaceId).toBe('space-design')
  })

  it('candidate: revoke/regrant cannot resurrect a previously selected grant version', async () => {
    const selected = await selectLocalSpaceContext('dual', target('seo'))

    await query(`UPDATE sky_experiment.space_grants SET version=version+2 WHERE grant_id='grant-dual-seo'`)
    await expect(revalidateLocalSpaceContext('dual', selected)).rejects.toBeInstanceOf(LocalAccessDenied)
    expect((await selectLocalSpaceContext('dual', target('seo'))).grantVersion).toBe(3)
  })

  it.each(['expired', 'future'] as const)('candidate: %s grant cannot confer access', async state => {
    await query(state === 'expired'
      ? `UPDATE sky_experiment.space_grants SET valid_to=now()-interval '1 second' WHERE grant_id='grant-seo-seo'`
      : `UPDATE sky_experiment.space_grants SET valid_from=now()+interval '1 day' WHERE grant_id='grant-seo-seo'`)
    await expect(selectLocalSpaceContext('seo', target('seo'))).rejects.toBeInstanceOf(LocalAccessDenied)
  })

  it('candidate: one department read grant cannot confer create, even to a global manager', async () => {
    expect((await selectLocalSpaceContext('dual', target('design', 'create'))).need).toBe('create')
    await expect(selectLocalSpaceContext('dual', target('seo', 'create'))).rejects.toBeInstanceOf(LocalAccessDenied)
  })

  it('candidate: departmental create grant does not override a revoked global manager role', async () => {
    await query(`UPDATE greenhouse_core.user_role_assignments SET active=false WHERE user_id='seo'`)
    await expect(selectLocalSpaceContext('seo', target('seo', 'create'))).rejects.toThrow()
  })

  it('candidate: membership alone does not create a grant', async () => {
    await query(`INSERT INTO greenhouse_core.person_memberships(membership_id,profile_id,space_id,organization_id)
      VALUES ('description-only','person-ungranted','space-seo','org-sky')`)
    await expect(selectLocalSpaceContext('ungranted', target('seo'))).rejects.toBeInstanceOf(LocalAccessDenied)
  })

  it('candidate: organization, Space and Service must form one verified tuple', async () => {
    await expect(selectLocalSpaceContext('seo', { ...target('seo'), serviceId: 'service-design' })).rejects.toBeInstanceOf(LocalAccessDenied)
    await expect(selectLocalSpaceContext('seo', { ...target('seo'), organizationId: 'org-other' })).rejects.toBeInstanceOf(LocalAccessDenied)
    await expect(selectLocalSpaceContext('other', target('seo'))).rejects.toBeInstanceOf(LocalAccessDenied)
  })

  it('candidate: inactive SEO Space denies only that selected account', async () => {
    await query(`UPDATE greenhouse_core.spaces SET active=false WHERE space_id='space-seo'`)
    await expect(selectLocalSpaceContext('dual', target('seo'))).rejects.toBeInstanceOf(LocalAccessDenied)
    expect((await selectLocalSpaceContext('dual', target('design'))).spaceId).toBe('space-design')
  })

  it('App renewal rereads context; persisted session Space does not pin the selected department', async () => {
    const original = await createApp('dual')

    await query(`UPDATE greenhouse_core.spaces SET updated_at='2026-03-01' WHERE space_id='space-seo'`)
    const refreshed = await refreshFirstPartyAppSession(original.refreshToken)

    // H1 closed: renewal never switches to SEO by metadata; in B there is no implicit Space at all.
    expect(refreshed.tenant.spaceId).toBe(variant === 'B' ? null : 'space-design')
    expect(refreshed.tenant.spaceSelectionRequired).toBe(variant === 'B')
    expect((await query(`SELECT space_id FROM greenhouse_core.first_party_app_sessions WHERE app_session_id=$1`, [original.appSessionId]))[0]?.space_id).toBe(variant === 'B' ? null : 'space-design')
  })

  it('App crypto rejects tampered tokens and durable resolver rejects mismatched user', async () => {
    const pair = await createApp('seo')
    const parts = pair.accessToken.split('.')

    parts[1] = Buffer.from(JSON.stringify({ sub: 'design' })).toString('base64url')
    await expect(resolveApp(parts.join('.'))).rejects.toMatchObject({ statusCode: 401 })
    await expect(resolveAppSessionTenant({ sessionId: pair.appSessionId, userId: 'design' })).rejects.toMatchObject({ statusCode: 401 })
  })

  it('candidate: active App session cannot restore a revoked SEO grant after token renewal', async () => {
    const original = await createApp('dual')

    await query(`UPDATE sky_experiment.space_grants SET active=false,version=version+1 WHERE grant_id='grant-dual-seo'`)
    const renewed = await refreshFirstPartyAppSession(original.refreshToken)
    const principal = await resolveApp(renewed.accessToken)

    await expect(selectLocalSpaceContext(principal.userId, target('seo'))).rejects.toBeInstanceOf(LocalAccessDenied)
    expect((await selectLocalSpaceContext(principal.userId, target('design'))).spaceId).toBe('space-design')
  })

  it('candidate: a selected context cannot act as a bearer credential for a different authenticated user', async () => {
    const selected = await selectLocalSpaceContext('dual', target('seo'))

    await expect(revalidateLocalSpaceContext('seo', selected)).rejects.toBeInstanceOf(LocalAccessDenied)
    await expect(readLocalBoundReport('design', selected, 'report-seo')).rejects.toBeInstanceOf(LocalAccessDenied)
  })

  it('candidate: missing identity is denied without BigQuery fallback', async () => {
    await expect(selectLocalSpaceContext('nonexistent', target('seo'))).rejects.toBeInstanceOf(LocalAccessDenied)
  })

  it('candidate: identity and permission fields in an untrusted target cannot impersonate another user', async () => {
    const forged = { ...target('seo'), userId: 'dual', profileId: 'person-dual', grantVersion: 999, bridgeClientId: 'client-owner' }
    const own = await selectLocalSpaceContext('seo', forged)

    expect(own.userId).toBe('seo')
    expect(own.profileId).toBe('person-seo')
    expect(own.grantVersion).toBe(1)
    await expect(selectLocalSpaceContext('design', forged)).rejects.toBeInstanceOf(LocalAccessDenied)
  })

  it('candidate: inactive Service cannot be selected under an active Space', async () => {
    await query(`UPDATE greenhouse_core.services SET active=false WHERE service_id='service-seo'`)
    await expect(selectLocalSpaceContext('dual', target('seo'))).rejects.toBeInstanceOf(LocalAccessDenied)
    expect((await selectLocalSpaceContext('dual', target('design'))).spaceId).toBe('space-design')
  })

  it('candidate: grant bound to the wrong organization cannot authorize a Space', async () => {
    await query(`UPDATE sky_experiment.space_grants SET organization_id='org-other' WHERE grant_id='grant-seo-seo'`)
    await expect(selectLocalSpaceContext('seo', target('seo'))).rejects.toBeInstanceOf(LocalAccessDenied)
  })

  it('candidate: metadata changes cannot switch the explicit target', async () => {
    const selected = await selectLocalSpaceContext('dual', target('seo'))

    await query(`UPDATE greenhouse_core.spaces SET updated_at='2026-04-01' WHERE space_id='space-seo'`)
    expect(await revalidateLocalSpaceContext('dual', selected)).toEqual(selected)
  })
})
