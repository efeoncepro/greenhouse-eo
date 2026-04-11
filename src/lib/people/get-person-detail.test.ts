import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PersonAccess } from '@/types/people'

// ---------------------------------------------------------------------------
// Mock declarations (must start with `mock` for vitest hoisting)
// ---------------------------------------------------------------------------

const mockIsConfigured = vi.fn<() => boolean>()
const mockPgQuery = vi.fn()
const mockBqQuery = vi.fn()
const mockGetColumns = vi.fn()
const mockResolveIdentifier = vi.fn()

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/postgres/client', () => ({
  isGreenhousePostgresConfigured: () => mockIsConfigured(),
  runGreenhousePostgresQuery: (...args: unknown[]) => mockPgQuery(...args)
}))

vi.mock('@/lib/bigquery', () => ({
  getBigQueryProjectId: () => 'test-project'
}))

vi.mock('@/lib/people/shared', () => ({
  PeopleValidationError: class PeopleValidationError extends Error {
    statusCode: number
    details?: unknown
    constructor(message: string, statusCode = 400, details?: unknown) {
      super(message)
      this.name = 'PeopleValidationError'
      this.statusCode = statusCode
      this.details = details
    }
  },
  getPeopleTableColumns: (...args: unknown[]) => mockGetColumns(...args),
  runPeopleQuery: (...args: unknown[]) => mockBqQuery(...args),
  pickMemberEmails: ({ email, emailAliases }: { email: string | null; emailAliases: string[] }) => ({
    publicEmail: email || '',
    internalEmail: emailAliases?.find((e: string) => e?.includes?.('@efeonce')) || null
  }),
  enrichProfile: (fields: Record<string, unknown>) => fields,
  inferRoleCategory: () => 'unknown',
  mapIdentityProvider: (s: string | null) => s || null,
  getIdentityConfidence: () => 'basic' as const,
  roundToTenths: (n: number) => Math.round(n * 10) / 10,
  toNumber: (v: unknown) => Number(v) || 0,
  toNullableNumber: (v: unknown) => (v != null ? Number(v) || 0 : null),
  toStringArray: (v: unknown) => (Array.isArray(v) ? v : []),
  toDateString: (v: unknown) => (typeof v === 'string' ? v : null),
  toContactChannel: (v: unknown) => v || null
}))


vi.mock('@/lib/person-360/resolve-eo-id', () => ({
  resolvePersonIdentifier: (...args: unknown[]) => mockResolveIdentifier(...args)
}))

vi.mock('@/lib/account-360/organization-store', () => ({
  getPersonMemberships: vi.fn(async () => [])
}))

vi.mock('@/lib/person-360/get-person-delivery', () => ({
  getPersonDeliveryContext: vi.fn(async () => null)
}))

vi.mock('@/lib/person-360/get-person-hr', () => ({
  getPersonHrContext: vi.fn(async () => null)
}))

vi.mock('@/lib/payroll/get-payroll-entries', () => ({
  getMemberPayrollHistory: vi.fn(async () => ({ entries: [], compensationHistory: [] }))
}))

vi.mock('@/lib/people/get-person-finance-overview', () => ({
  getPersonFinanceOverview: vi.fn(async () => ({ summary: null }))
}))

vi.mock('@/lib/people/get-person-operational-metrics', () => ({
  getPersonOperationalMetrics: vi.fn(async () => null)
}))

vi.mock('@/lib/people/person-context', () => ({
  buildPersonIdentityContext: vi.fn(() => null),
  buildPersonAccessContext: vi.fn(() => null)
}))

vi.mock('@/lib/person-360/get-person-profile', () => ({
  getPersonProfileByEoId: vi.fn(async () => null),
  getPersonProfileByMemberId: vi.fn(async () => null)
}))

vi.mock('@/lib/member-capacity-economics/store', () => ({
  readLatestMemberCapacityEconomicsSnapshot: vi.fn().mockResolvedValue(null)
}))

vi.mock('@/lib/person-intelligence/store', () => ({
  readPersonIntelligence: vi.fn().mockResolvedValue(null)
}))

import { getPersonDetail } from '@/lib/people/get-person-detail'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const minimalAccess: PersonAccess = {
  visibleTabs: [],
  canViewMemberships: false,
  canViewAssignments: true,
  canViewActivity: false,
  canViewCompensation: false,
  canViewPayroll: false,
  canViewFinance: false,
  canViewHrProfile: false,
  canViewAiTools: false,
  canViewIdentityContext: false,
  canViewAccessContext: false
}

const makePgMemberRow = (overrides: Record<string, unknown> = {}) => ({
  member_id: 'member-1',
  display_name: 'Test Person',
  primary_email: 'test@efeonce.com',
  email_aliases: [] as string[],
  role_title: 'Developer',
  role_category: 'development',
  avatar_url: null,
  active: true,
  contact_channel: null,
  contact_handle: null,
  identity_profile_id: null,
  notion_user_id: null,
  azure_oid: null,
  hubspot_owner_id: null,
  first_name: 'Test',
  last_name: 'Person',
  preferred_name: null,
  legal_name: null,
  org_role_id: null,
  profession_id: null,
  seniority_level: null,
  employment_type: 'full_time',
  birth_date: null,
  phone: null,
  teams_user_id: null,
  slack_user_id: null,
  location_city: null,
  location_country: 'CL',
  time_zone: 'America/Santiago',
  years_experience: null,
  efeonce_start_date: null,
  biography: null,
  languages: [] as string[],
  ...overrides
})

const makeBqMemberRow = (overrides: Record<string, unknown> = {}) => ({
  member_id: 'member-1',
  display_name: 'Test Person',
  email: 'test@efeonce.com',
  email_aliases: [] as string[],
  role_title: 'Developer',
  role_category: 'development',
  avatar_url: null,
  active: true,
  contact_channel: null,
  contact_handle: null,
  identity_profile_id: null,
  notion_user_id: null,
  azure_oid: null,
  hubspot_owner_id: null,
  first_name: 'Test',
  last_name: 'Person',
  preferred_name: null,
  legal_name: null,
  org_role_id: null,
  org_role_name: null,
  profession_id: null,
  profession_name: null,
  seniority_level: null,
  employment_type: 'full_time',
  birth_date: null,
  phone: null,
  teams_user_id: null,
  slack_user_id: null,
  location_city: null,
  location_country: 'CL',
  time_zone: 'America/Santiago',
  years_experience: null,
  efeonce_start_date: null,
  biography: null,
  languages: [] as string[],
  ...overrides
})

const setupResolvedIdentity = () => {
  mockResolveIdentifier.mockResolvedValue({
    memberId: 'member-1',
    eoId: 'EO-ID0001',
    userId: 'user-1'
  })
}

const setupBqMemberFallback = (memberRow = makeBqMemberRow()) => {
  // getPeopleTableColumns is called multiple times for column introspection
  mockGetColumns.mockResolvedValue(
    new Set([
      'email_aliases', 'identity_profile_id', 'first_name', 'last_name',
      'preferred_name', 'legal_name', 'org_role_id', 'profession_id',
      'seniority_level', 'employment_type', 'birth_date', 'phone',
      'teams_user_id', 'slack_user_id', 'location_city', 'location_country',
      'time_zone', 'years_experience', 'efeonce_start_date', 'biography', 'languages'
    ])
  )
  mockBqQuery.mockResolvedValue(memberRow ? [memberRow] : [])
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getPersonDetail — Postgres-first member lookup', () => {
  it('returns member data from Postgres when configured', async () => {
    mockIsConfigured.mockReturnValue(true)
    setupResolvedIdentity()

    // 1st PG call: member lookup, 2nd: assignments (identity links skipped — null profile)
    mockPgQuery
      .mockResolvedValueOnce([makePgMemberRow()])
      .mockResolvedValueOnce([])

    const result = await getPersonDetail({ memberId: 'member-1', access: minimalAccess })

    expect(result.member.memberId).toBe('member-1')
    expect(result.member.displayName).toBe('Test Person')
    expect(result.member.publicEmail).toBe('test@efeonce.com')
    expect(result.member.roleCategory).toBe('development')
    expect(result.member.eoId).toBe('EO-ID0001')
    expect(mockBqQuery).not.toHaveBeenCalled()
  })

  it('falls back to BigQuery on Postgres ECONNREFUSED for member lookup', async () => {
    mockIsConfigured.mockReturnValue(true)
    setupResolvedIdentity()

    // Member lookup fails with transient error
    mockPgQuery
      .mockRejectedValueOnce(new Error('connect ECONNREFUSED 10.0.0.1:5432'))

      // Assignments also try Postgres first — also fail
      .mockRejectedValueOnce(new Error('connect ECONNREFUSED 10.0.0.1:5432'))

    setupBqMemberFallback()

    // BQ: 1st call → member, 2nd call → assignments
    mockBqQuery
      .mockResolvedValueOnce([makeBqMemberRow()])
      .mockResolvedValueOnce([])

    const result = await getPersonDetail({ memberId: 'member-1', access: minimalAccess })

    expect(result.member.memberId).toBe('member-1')
    expect(mockBqQuery).toHaveBeenCalled()
  })

  it('falls back to BigQuery on Postgres timeout for member lookup', async () => {
    mockIsConfigured.mockReturnValue(true)
    setupResolvedIdentity()

    mockPgQuery
      .mockRejectedValueOnce(new Error('Query read timeout'))
      .mockRejectedValueOnce(new Error('Query read timeout'))

    setupBqMemberFallback()
    mockBqQuery
      .mockResolvedValueOnce([makeBqMemberRow()])
      .mockResolvedValueOnce([])

    const result = await getPersonDetail({ memberId: 'member-1', access: minimalAccess })

    expect(result.member.memberId).toBe('member-1')
  })

  it('propagates non-transient Postgres errors', async () => {
    mockIsConfigured.mockReturnValue(true)
    setupResolvedIdentity()

    mockPgQuery.mockRejectedValueOnce(new Error('permission denied for schema greenhouse_core'))

    await expect(
      getPersonDetail({ memberId: 'member-1', access: minimalAccess })
    ).rejects.toThrow('permission denied')
  })

  it('throws 404 when member is not found in any source', async () => {
    mockIsConfigured.mockReturnValue(true)
    setupResolvedIdentity()

    // Postgres returns empty
    mockPgQuery.mockResolvedValueOnce([])

    await expect(
      getPersonDetail({ memberId: 'member-1', access: minimalAccess })
    ).rejects.toThrow('Person not found')
  })
})

describe('getPersonDetail — Postgres-first assignments', () => {
  it('fetches assignments from Postgres', async () => {
    mockIsConfigured.mockReturnValue(true)
    setupResolvedIdentity()

    const sampleAssignment = {
      assignment_id: 'assign-1',
      client_id: 'client-1',
      client_name: 'Acme Corp',
      fte_allocation: 0.5,
      hours_per_month: 80,
      role_title_override: null,
      start_date: '2026-01-01',
      end_date: null,
      active: true
    }

    // 1st: member, 2nd: assignments
    mockPgQuery
      .mockResolvedValueOnce([makePgMemberRow()])
      .mockResolvedValueOnce([sampleAssignment])

    const result = await getPersonDetail({ memberId: 'member-1', access: minimalAccess })

    expect(result.assignments).toHaveLength(1)
    expect(result.assignments![0]).toMatchObject({
      assignmentId: 'assign-1',
      clientName: 'Acme Corp',
      fteAllocation: 0.5,
      active: true
    })
  })
})

describe('getPersonDetail — Postgres-first identity links', () => {
  it('fetches identity links from Postgres when identity_profile_id is present', async () => {
    mockIsConfigured.mockReturnValue(true)
    setupResolvedIdentity()

    // 1st: member (with identity_profile_id), 2nd: identity links, 3rd: assignments
    mockPgQuery
      .mockResolvedValueOnce([makePgMemberRow({ identity_profile_id: 'ip_123' })])
      .mockResolvedValueOnce([{
        source_system: 'microsoft',
        source_object_id: 'oid-1',
        source_user_id: null,
        source_email: 'test@efeonce.com',
        source_display_name: 'Test Person'
      }])
      .mockResolvedValueOnce([])

    const result = await getPersonDetail({ memberId: 'member-1', access: minimalAccess })

    expect(result.integrations.linkedProviders).toContain('microsoft')
  })

  it('skips identity links query when identity_profile_id is null', async () => {
    mockIsConfigured.mockReturnValue(true)
    setupResolvedIdentity()

    // 1st: member (no profile_id), 2nd: assignments only
    mockPgQuery
      .mockResolvedValueOnce([makePgMemberRow({ identity_profile_id: null })])
      .mockResolvedValueOnce([])

    const result = await getPersonDetail({ memberId: 'member-1', access: minimalAccess })

    // Only 2 PG calls: member + assignments (no identity links)
    expect(mockPgQuery).toHaveBeenCalledTimes(2)
    expect(result.integrations.linkedProviders).toEqual([])
  })
})

describe('getPersonDetail — BigQuery-only path', () => {
  it('uses BigQuery when Postgres is not configured', async () => {
    mockIsConfigured.mockReturnValue(false)
    setupResolvedIdentity()
    setupBqMemberFallback()

    // BQ: 1st call → member, 2nd call → assignments
    mockBqQuery
      .mockResolvedValueOnce([makeBqMemberRow()])
      .mockResolvedValueOnce([])

    const result = await getPersonDetail({ memberId: 'member-1', access: minimalAccess })

    expect(mockPgQuery).not.toHaveBeenCalled()
    expect(result.member.memberId).toBe('member-1')
  })
})
