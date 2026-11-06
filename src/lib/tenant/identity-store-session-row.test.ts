import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ query: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/postgres/client', () => ({
  isGreenhousePostgresConfigured: () => true,
  runGreenhousePostgresQuery: mocks.query
}))

import {
  getSessionFromPostgresByEmail,
  getSessionFromPostgresByGoogleSub,
  getSessionFromPostgresByMicrosoftOid,
  getSessionFromPostgresByUserId,
  IdentitySessionAmbiguousError
} from './identity-store'

const sessionRow = (overrides: Record<string, unknown> = {}) => ({
  user_id: 'client-user', email: 'persona@cliente.test', full_name: 'Persona', tenant_type: 'client', status: 'active',
  active: true, client_id: 'client-owner', role_codes: ['client_manager'], route_groups: ['client'], feature_flags: [],
  space_id: null, space_public_id: null, active_space_count: 2, space_selection_required: true,
  organization_id: 'org-sky', ...overrides
})

let sessionRows: Record<string, unknown>[] = []

beforeEach(() => {
  mocks.query.mockReset()
  mocks.query.mockImplementation(async (sql: string) => {
    if (sql.includes('information_schema.columns')) return [{ column_name: 'microsoft_oid' }]
    if (sql.includes('information_schema.tables')) return [{ '?column?': 1 }]
    if (sql.includes('session_360')) return sessionRows

    return []
  })
})

const lookups = [
  ['user_id', () => getSessionFromPostgresByUserId('client-user')],
  ['microsoft_oid', () => getSessionFromPostgresByMicrosoftOid('oid-1')],
  ['google_sub', () => getSessionFromPostgresByGoogleSub('sub-1')],
  ['email', () => getSessionFromPostgresByEmail('Persona@Cliente.test')]
] as const

describe('TASK-2096 H1 — a session lookup resolves one principal or fails, never by row order', () => {
  it.each(lookups)('%s: two rows raise IdentitySessionAmbiguousError instead of picking one', async (lookup, run) => {
    sessionRows = [sessionRow({ space_id: 'space-design' }), sessionRow({ space_id: 'space-seo' })]

    await expect(run()).rejects.toBeInstanceOf(IdentitySessionAmbiguousError)
    await expect(run()).rejects.toMatchObject({ lookup })
  })

  // Textual guard, pointing at the real verifiers: the behaviour is the "two rows raise" case above,
  // and one-row-per-user is enforced by the DO block of the TASK-2096 session_360 migration and
  // exercised against PG16 by scripts/experiments/sky-measurement-bridge (run-local.mjs). `LIMIT 1`
  // here would silently hide a second row from both.
  it.each(lookups)('%s: asks the database for two rows so ambiguity is observable', async (_lookup, run) => {
    sessionRows = [sessionRow()]
    await run()

    const sessionSql = mocks.query.mock.calls.map(([sql]) => String(sql)).find(sql => sql.includes('session_360'))

    expect(sessionSql).toMatch(/LIMIT 2/)
  })

  it('a client with several active Spaces gets no implicit Space and an explicit selection flag', async () => {
    sessionRows = [sessionRow()]

    const row = await getSessionFromPostgresByUserId('client-user')

    expect(row?.space_id).toBeNull()
    expect(row?.space_selection_required).toBe(true)
    expect(row?.organization_id).toBe('org-sky')
  })

  it('a single-Space client keeps its Space and no selection flag', async () => {
    sessionRows = [sessionRow({ space_id: 'space-design', active_space_count: 1, space_selection_required: false })]

    const row = await getSessionFromPostgresByUserId('client-user')

    expect(row?.space_id).toBe('space-design')
    expect(row?.space_selection_required).toBe(false)
  })
})
