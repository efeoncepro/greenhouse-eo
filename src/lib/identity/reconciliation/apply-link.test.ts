import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const bigQueryQueryMock = vi.fn()
const runGreenhousePostgresQueryMock = vi.fn()
const publishOutboxEventMock = vi.fn()

vi.mock('@/lib/bigquery', () => ({
  getBigQueryClient: () => ({ query: bigQueryQueryMock }),
  getBigQueryProjectId: () => 'greenhouse-test'
}))

vi.mock('@/lib/postgres/client', () => ({
  isGreenhousePostgresConfigured: () => true,
  runGreenhousePostgresQuery: (...args: unknown[]) => runGreenhousePostgresQueryMock(...args)
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => publishOutboxEventMock(...args)
}))

const { applyIdentityLink } = await import('./apply-link')

const proposal = {
  proposalId: 'proposal-1',
  sourceSystem: 'notion' as const,
  sourceObjectType: 'user',
  sourceObjectId: 'notion-user-1',
  sourceDisplayName: 'Felipe Zurita',
  sourceEmail: 'fzurita@example.com',
  discoveredIn: 'notion_users',
  occurrenceCount: 1,
  candidateMemberId: 'member-1',
  candidateProfileId: 'profile-1',
  candidateDisplayName: 'Felipe Zurita',
  matchConfidence: 0.94,
  matchSignals: [],
  status: 'pending' as const,
  resolvedBy: null,
  resolvedAt: null,
  resolutionNote: null,
  syncRunId: null,
  createdAt: '2026-05-14T00:00:00.000Z'
}

describe('applyIdentityLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    runGreenhousePostgresQueryMock.mockResolvedValue([])
    bigQueryQueryMock.mockResolvedValue([[], {}])
    publishOutboxEventMock.mockResolvedValue(undefined)
  })

  it('persists non-login source-link flags explicitly in canonical stores', async () => {
    await applyIdentityLink(proposal, { requireCanonicalPostgres: true })

    const postgresInsert = runGreenhousePostgresQueryMock.mock.calls.find(([sql]) =>
      String(sql).includes('INSERT INTO greenhouse_core.identity_profile_source_links')
    )

    expect(postgresInsert?.[0]).toContain('is_primary')
    expect(postgresInsert?.[0]).toContain('is_login_identity')
    expect(postgresInsert?.[0]).toContain('FALSE, FALSE, TRUE')

    const bigQueryMerge = bigQueryQueryMock.mock.calls.find(([input]) =>
      String(input.query).includes('MERGE `greenhouse-test.greenhouse.identity_profile_source_links`')
    )?.[0]

    expect(bigQueryMerge.query).toContain('is_primary')
    expect(bigQueryMerge.query).toContain('is_login_identity')
    expect(bigQueryMerge.params).toMatchObject({
      isPrimary: false,
      isLoginIdentity: false
    })
  })
})
