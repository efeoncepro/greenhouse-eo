import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockQuery = vi.fn()
const mockPgQuery = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  withTransaction: async (fn: (client: { query: typeof mockPgQuery }) => Promise<unknown>) => fn({ query: mockPgQuery })
}))

const { GLOBE_PRODUCER_CAPABILITY_SCOPES, buildGlobeOAuthGrantContract, updateGlobeOAuthGrantContract } = await import(
  './globe-oauth-grants'
)

const SHELL_CONTRACT = buildGlobeOAuthGrantContract('shell-only')
const PRODUCER_CONTRACT = buildGlobeOAuthGrantContract('producer')

const REDIRECT_URIS = [
  'https://globe-studio-internal-818083690953.southamerica-west1.run.app/auth/callback',
  'https://globe.efeoncepro.com/auth/callback'
]

const clientRow = (contract = PRODUCER_CONTRACT) => ({
  oauth_client_id: 'spoauth-client-globe',
  consumer_id: 'spc-globe',
  sister_platform_key: 'globe',
  consumer_name: 'Efeonce Globe Internal Studio',
  consumer_status: 'active',
  consumer_expires_at: null,
  client_id: 'globe',
  client_name: 'Efeonce Globe Internal Studio',
  client_status: 'active',
  redirect_uris: REDIRECT_URIS,
  allowed_scopes: contract.allowedScopes,
  code_ttl_seconds: 300,
  access_token_ttl_seconds: 300,
  require_pkce: true,
  issue_identity_inline: true,
  policy_json: contract.policy,
  metadata_json: { preserved: true }
})

const primeTransaction = (contract: typeof SHELL_CONTRACT) => {
  mockPgQuery.mockReset()
  mockPgQuery.mockResolvedValueOnce({
    rows: [
      {
        oauth_client_id: 'spoauth-client-globe',
        allowed_scopes: contract.allowedScopes,
        policy_json: contract.policy
      }
    ]
  })
}

const updateStatement = () =>
  mockPgQuery.mock.calls.find(call => String(call[0]).includes('UPDATE greenhouse_core.sister_platform_oauth_clients'))

beforeEach(() => {
  mockQuery.mockReset()
  mockPgQuery.mockReset()
  mockQuery.mockResolvedValue([clientRow()])
})

describe('Globe OAuth grant contract', () => {
  it('defines the complete non-operator Producer surface without destructive or admin grants', () => {
    expect(GLOBE_PRODUCER_CAPABILITY_SCOPES).toEqual([
      'globe.studio.access',
      'globe.producer.catalog.read',
      'globe.lab.experiment.run',
      'globe.producer.assets.operate',
      'globe.producer.library.read',
      'globe.producer.library.manage',
      'globe.producer.library.export',
      'globe.producer.review.read',
      'globe.producer.review.decide',
      'globe.producer.comment.manage',
      'globe.producer.share.manage',
      'globe.voice.preset.manage',
      'globe.lab.recipe.author',
      'globe.credits.read',
      'globe.credits.estimate'
    ])
    expect(PRODUCER_CONTRACT.policy.requiredScopes).toEqual(['openid', ...GLOBE_PRODUCER_CAPABILITY_SCOPES])

    for (const forbidden of [
      'globe.producer.route.reveal_house',
      'globe.lab.evaluation.run',
      'globe.producer.library.delete',
      'globe.credits.allocate',
      'globe.credits.reserve',
      'globe.credits.settle',
      'globe.credits.adjust',
      'globe.credits.pool.manage',
      'globe.credits.grant.issue',
      'globe.credits.policy.manage',
      'globe.credits.budget.manage',
      'globe.model-readiness.promote',
      'globe.mcp.access'
    ]) {
      expect(PRODUCER_CONTRACT.allowedScopes).not.toContain(forbidden)
    }
  })

  it('promotes only allowed_scopes and policy_json, preserving every other client field', async () => {
    primeTransaction(SHELL_CONTRACT)

    const result = await updateGlobeOAuthGrantContract('producer')
    const update = updateStatement()
    const statement = String(update?.[0])

    expect(result.previousAllowedScopes).toEqual(SHELL_CONTRACT.allowedScopes)
    expect(result.allowedScopes).toEqual(PRODUCER_CONTRACT.allowedScopes)
    expect(result.changed).toBe(true)
    expect(update?.[1]).toEqual([
      'spoauth-client-globe',
      PRODUCER_CONTRACT.allowedScopes,
      JSON.stringify(PRODUCER_CONTRACT.policy)
    ])

    expect(statement).toContain('allowed_scopes')
    expect(statement).toContain('policy_json')

    for (const untouched of [
      'redirect_uris',
      'code_ttl_seconds',
      'access_token_ttl_seconds',
      'client_status',
      'metadata_json',
      'consumer_id',
      'token_hash'
    ]) {
      expect(statement).not.toContain(untouched)
    }

    expect(result.client.redirectUris).toEqual(REDIRECT_URIS)
  })

  it('is idempotent when the Producer contract is already active', async () => {
    primeTransaction(PRODUCER_CONTRACT)

    const result = await updateGlobeOAuthGrantContract('producer')

    expect(result.changed).toBe(false)
    expect(updateStatement()).toBeUndefined()
  })

  it('rolls back to shell-only through the same focal primitive', async () => {
    primeTransaction(PRODUCER_CONTRACT)
    mockQuery.mockResolvedValue([clientRow(SHELL_CONTRACT)])

    const result = await updateGlobeOAuthGrantContract('shell-only')

    expect(result.previousAllowedScopes).toEqual(PRODUCER_CONTRACT.allowedScopes)
    expect(result.allowedScopes).toEqual(SHELL_CONTRACT.allowedScopes)
    expect(result.client.redirectUris).toEqual(REDIRECT_URIS)
  })

  it('does not create an unknown OAuth client', async () => {
    mockPgQuery.mockResolvedValueOnce({ rows: [] })

    await expect(updateGlobeOAuthGrantContract('producer')).rejects.toMatchObject({
      statusCode: 404,
      errorCode: 'invalid_client'
    })
    expect(updateStatement()).toBeUndefined()
  })
})
