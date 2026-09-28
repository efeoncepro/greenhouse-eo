/** Explicit opt-in against an ephemeral PostgreSQL instance. NEVER uses the shared database. */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as GraderCommands from '@/lib/growth/ai-visibility/commands'

import { closeGreenhousePostgres, query } from '@/lib/db'
import { requestRunBatchInternal, requestGraderRunBatch } from '@/lib/growth/ai-visibility/markets/run-batch'
import { getPreviousComparableScore } from '@/lib/growth/ai-visibility/scoring/store'

const state = { realEnqueue: false, failMarket: '', allowance: 20, included: ['MX'], budget: 100, authorized: true }

vi.mock('@/lib/entitlements/runtime', () => ({ can: () => state.authorized }))
vi.mock('@/lib/growth/ai-visibility/operator/organization-commercial-facts', () => ({
  getOrganizationCommercialFacts: async () => ({ isClient: true })
}))
vi.mock('@/lib/growth/ai-visibility/operator/subject-gradeable', () => ({
  assertSubjectGradeable: () => ({ ok: true })
}))
vi.mock('@/lib/growth/ai-visibility/entitlement', () => ({
  resolveAeoEntitlement: async () => ({
    hasModule: true,
    tier: 'contracted',
    assignmentId: 'assignment-local',
    allowanceCap: state.allowance,
    allowanceRemaining: state.allowance
  })
}))
vi.mock('@/lib/growth/ai-visibility/budget', () => ({
  resolveAeoBudget: async () => ({
    enforced: true,
    wouldBlock: false,
    budgetRemainingUsd: state.budget,
    budgetCapUsd: state.budget
  })
}))
vi.mock('@/lib/growth/ai-visibility/commands', () => ({
  enqueueGraderDiagnostic: async (input: Record<string, any>) => {
    if (state.realEnqueue) {
      const actual = await vi.importActual<typeof GraderCommands>('@/lib/growth/ai-visibility/commands')

      return actual.enqueueGraderDiagnostic(input as never)
    }

    if (input.marketId === state.failMarket) throw new Error('deliberate-second-market-failure')

    const rows = await input.transaction.query(
      `INSERT INTO greenhouse_growth.grader_runs
    (run_id,profile_id,market_id,batch_id,organization_id,status,run_source,cost_ceiling_usd,estimated_cost_usd,created_at)
    VALUES ($1,$2,$3,$4,$5,'pending',$6,0.5,0,now()) RETURNING *`,
      [
        crypto.randomUUID(),
        input.profileId,
        input.marketId,
        input.batchId,
        input.attribution.organizationId,
        input.attribution.runSource
      ]
    )

    return { run: { runId: rows.rows[0].run_id, marketId: input.marketId }, idempotentHit: false }
  }
}))
vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: async (_event: unknown, client: any) => {
    await client.query('INSERT INTO greenhouse_growth.market_test_outbox DEFAULT VALUES')

    return 'local-event'
  }
}))

const enabled = process.env.TASK_1863_LOCAL_PG === 'true'

const env = {
  NODE_ENV: 'test',
  GROWTH_AI_VISIBILITY_GRADER_ENABLED: 'true',
  GROWTH_AI_VISIBILITY_PORTAL_RUN_ENABLED: 'true',
  GROWTH_AI_VISIBILITY_MULTI_MARKET_ENABLED: 'true',
  GROWTH_AI_VISIBILITY_BUDGET_GATE_ENABLED: 'true'
} as NodeJS.ProcessEnv

const input = {
  organizationId: 'org-local',
  markets: 'all_active' as const,
  mode: 'light' as const,
  actor: 'user-local',
  channel: 'portal' as const,
  idempotencyKey: 'request-local',
  env
}

describe.skipIf(!enabled)('TASK-1863 actual PostgreSQL batch atomicity and reservations', () => {
  beforeAll(async () => {
    for (const [name, value] of Object.entries({
      GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME: '',
      GREENHOUSE_POSTGRES_PASSWORD_SECRET_REF: '',
      GREENHOUSE_POSTGRES_HOST: '127.0.0.1',
      GREENHOUSE_POSTGRES_PORT: '55463',
      GREENHOUSE_POSTGRES_DATABASE: 'postgres',
      GREENHOUSE_POSTGRES_USER: process.env.USER ?? '',
      GREENHOUSE_POSTGRES_PASSWORD: 'local-test-only',
      GREENHOUSE_POSTGRES_SSL: 'false'
    }))
      vi.stubEnv(name, value)
    const server = await query<{ path: string }>("SELECT current_setting('data_directory') AS path")

    if (server[0].path !== '/tmp/task-1863-pg') throw new Error('Refusing non-ephemeral PostgreSQL')
    await query(
      `ALTER TABLE greenhouse_growth.grader_runs ALTER COLUMN run_id SET DEFAULT gen_random_uuid()::text, ALTER COLUMN public_id SET DEFAULT gen_random_uuid()::text, ALTER COLUMN poll_token SET DEFAULT gen_random_uuid()::text, ALTER COLUMN created_at SET DEFAULT now(), ALTER COLUMN estimated_cost_usd SET DEFAULT 0`
    )
    await query('CREATE SCHEMA IF NOT EXISTS greenhouse_client_portal')
    await query(
      `CREATE TABLE IF NOT EXISTS greenhouse_client_portal.module_assignments(assignment_id text PRIMARY KEY, metadata_json jsonb, effective_to timestamptz, expires_at timestamptz,status text)`
    )
    await query(
      'CREATE TABLE IF NOT EXISTS greenhouse_growth.market_test_outbox(id bigint GENERATED ALWAYS AS IDENTITY)'
    )
    await query(`CREATE TABLE IF NOT EXISTS greenhouse_growth.grader_scores (
      run_id text PRIMARY KEY REFERENCES greenhouse_growth.grader_runs(run_id),
      score_version text, created_at timestamptz DEFAULT now())`)
  })
  beforeEach(async () => {
    state.realEnqueue = false
    state.failMarket = ''
    state.allowance = 20
    state.included = ['MX']
    state.budget = 100
    state.authorized = true
    await query(`TRUNCATE greenhouse_growth.grader_profiles,greenhouse_growth.grader_runs,
      greenhouse_client_portal.module_assignments,greenhouse_growth.market_test_outbox CASCADE`)
    await query(`INSERT INTO greenhouse_growth.grader_profiles(profile_id,organization_id,brand_name,market,locale,competitors_declared,status,recurring_regrade_enabled,recurring_regrade_cadence,created_at)
      VALUES ('profile-local','org-local','Local fixture','CL','es-CL',ARRAY[]::text[],'active',false,'monthly',now())`)
    await query(`INSERT INTO greenhouse_growth.grader_profile_markets(market_id,profile_id,market_code,locale,is_primary,created_by)
      VALUES ('market-cl','profile-local','CL','es-CL',true,'test'),('market-mx','profile-local','MX','es-MX',false,'test')`)
    await query(`INSERT INTO greenhouse_growth.grader_competitor_sets(market_id,version,status,members_json,created_by,reason)
      VALUES ('market-cl',1,'active','[]','test','fixture'),('market-mx',1,'active','[]','test','fixture')`)
    await query(
      `INSERT INTO greenhouse_client_portal.module_assignments VALUES ('assignment-local','{"aeo_markets_included":["MX"]}',null,null,'active')`
    )
  })
  afterAll(async () => {
    await closeGreenhousePostgres()
    vi.unstubAllEnvs()
  })

  const counts = async () =>
    (
      await query<{ runs: number; batches: number; events: number }>(`SELECT
    (SELECT count(*)::int FROM greenhouse_growth.grader_runs) runs,
    (SELECT count(*)::int FROM greenhouse_growth.grader_run_batches) batches,
    (SELECT count(*)::int FROM greenhouse_growth.market_test_outbox) events`)
    )[0]

  it('reads the previous score with PostgreSQL row comparison and excludes other markets, policies and categories', async () => {
    await query(`INSERT INTO greenhouse_growth.grader_runs
      (run_id,profile_id,market_id,market_code,locale,provider_policy_version,prompt_pack_version,created_at)
      VALUES
      ('previous','profile-local','market-cl','CL','es-CL','policy-v2','pack-v2','2026-09-01'),
      ('other-market','profile-local','market-mx','MX','es-MX','policy-v2','pack-v2','2026-09-02'),
      ('other-policy','profile-local','market-cl','CL','es-CL','policy-v1','pack-v2','2026-09-03'),
      ('current','profile-local','market-cl','CL','es-CL','policy-v2','pack-v2','2026-09-04')`)
    await query(`INSERT INTO greenhouse_growth.grader_runs
      (run_id,profile_id,market_id,market_code,locale,provider_policy_version,prompt_pack_version,created_at,matching_snapshot)
      VALUES ('other-category','profile-local','market-cl','CL','es-CL','policy-v2','pack-v2','2026-09-03',
      '{"brand":{"category":"different category"}}')`)
    await query(`INSERT INTO greenhouse_growth.grader_scores(run_id,score_version)
      VALUES ('previous','score-v1'),('other-market','score-v1'),('other-policy','score-v1'),('other-category','score-v1')`)

    const previous = await getPreviousComparableScore({
      profileId: 'profile-local', scoreVersion: 'score-v1', currentRunId: 'current'
    })

    expect(previous?.score.runId).toBe('previous')
  })

  it.each(['name', 'aliases', 'websiteUrl'])('excludes changed brand matching identity: %s', async field => {
    const brand = { name: 'Example', aliases: [], websiteUrl: 'https://example.com', category: 'same category' }

    const changedBrand = {
      ...brand,
      [field]: field === 'aliases' ? [{ name: 'EX', matchMode: 'word_cs' }] : 'different value'
    }

    for (const [id, date, snapshot] of [
      ['previous', '2026-09-01', brand],
      ['changed', '2026-09-02', changedBrand],
      ['current', '2026-09-03', brand]
    ] as const) {
      await query(`INSERT INTO greenhouse_growth.grader_runs
        (run_id,profile_id,market_id,market_code,locale,provider_policy_version,prompt_pack_version,created_at,matching_snapshot)
        VALUES ($1,'profile-local','market-cl','CL','es-CL','policy-v2','pack-v2',$2,$3::jsonb)`,
      [id, date, JSON.stringify({ brand: snapshot })])
    }

    await query(`INSERT INTO greenhouse_growth.grader_scores(run_id,score_version)
      VALUES ('previous','score-v1'),('changed','score-v1')`)

    const previous = await getPreviousComparableScore({
      profileId: 'profile-local', scoreVersion: 'score-v1', currentRunId: 'current'
    })

    expect(previous?.score.runId).toBe('previous')
  })

  it('rejects a secondary market with the flag OFF even for a single run', async () => {
    await expect(
      requestRunBatchInternal({
        ...input,
        markets: ['market-mx'],
        env: { ...env, GROWTH_AI_VISIBILITY_MULTI_MARKET_ENABLED: 'false' }
      })
    ).rejects.toMatchObject({ code: 'aeo_multi_market_disabled' })
    expect(await counts()).toEqual({ runs: 0, batches: 0, events: 0 })
  })
  it('reserves daily cost before creating any part of a batch', async () => {
    await expect(
      requestRunBatchInternal({ ...input, env: { ...env, GROWTH_AI_VISIBILITY_BATCH_DAILY_BUDGET_USD: '0.5' } })
    ).rejects.toMatchObject({ code: 'cost_blocked' })
    expect(await counts()).toEqual({ runs: 0, batches: 0, events: 0 })
  })
  it('serializes recurring monthly reservations across simultaneous batches', async () => {
    const recurring = {
      ...input,
      channel: 'recurring' as const,
      markets: 'primary' as const,
      env: { ...env, GROWTH_AI_VISIBILITY_REGRADE_MONTHLY_BUDGET_USD: '0.5' }
    }

    const results = await Promise.allSettled([
      requestRunBatchInternal({ ...recurring, idempotencyKey: 'recurring-a' }),
      requestRunBatchInternal({ ...recurring, idempotencyKey: 'recurring-b' })
    ])

    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.find(result => result.status === 'rejected')).toMatchObject({ reason: { code: 'budget_exhausted' } })
    expect((await counts()).runs).toBe(1)
  })
  it('enqueues two markets and their events in one commit; retry does not duplicate', async () => {
    const first = await requestRunBatchInternal(input)

    expect(first.runs).toHaveLength(2)
    const second = await requestRunBatchInternal(input)

    expect(second.idempotentHit).toBe(true)
    expect(second.batchId).toBe(first.batchId)
    expect(await counts()).toEqual({ runs: 2, batches: 1, events: 3 })
  })
  it('executes the real enqueue primitive and persists the exact market snapshot and localized prompts', async () => {
    state.realEnqueue = true
    const result = await requestRunBatchInternal(input)

    expect(result.runs.map(run => run.marketCode).sort()).toEqual(['CL', 'MX'])

    const rows = await query<{
      market_code: string
      locale: string
      matching_snapshot: { market: { code: string } }
      execution_prompts: Array<{ promptText: string }>
    }>(
      `SELECT market_code,locale,matching_snapshot,execution_prompts FROM greenhouse_growth.grader_runs ORDER BY market_code`
    )

    for (const row of rows) {
      expect(row.matching_snapshot.market.code).toBe(row.market_code)
      expect(row.locale).toBe(`es-${row.market_code}`)
      expect(
        row.execution_prompts.some(prompt => prompt.promptText.includes(row.market_code === 'MX' ? 'México' : 'Chile'))
      ).toBe(true)
    }
  })
  it('rolls back the first market and batch when the second enqueue fails', async () => {
    state.failMarket = 'market-mx'
    await expect(requestRunBatchInternal(input)).rejects.toThrow('deliberate-second-market-failure')
    expect(await counts()).toEqual({ runs: 0, batches: 0, events: 0 })
  })
  it('serializes concurrent requests before checking total allowance', async () => {
    state.allowance = 2

    const results = await Promise.allSettled([
      requestRunBatchInternal(input),
      requestRunBatchInternal({ ...input, idempotencyKey: 'concurrent' })
    ])

    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
    expect(results.find(r => r.status === 'rejected')).toMatchObject({ reason: { code: 'quota_exhausted' } })
    expect((await counts()).runs).toBe(2)
  })
  it('rejects the whole batch when the sum exceeds the monetary budget', async () => {
    state.budget = 0.75
    await expect(requestRunBatchInternal(input)).rejects.toMatchObject({ code: 'budget_exhausted' })
    expect((await counts()).runs).toBe(0)
  })
  it('rejects an uncontracted market and expired assignment before creating runs', async () => {
    await query(`UPDATE greenhouse_client_portal.module_assignments SET metadata_json='{}'`)
    await expect(requestRunBatchInternal(input)).rejects.toMatchObject({ code: 'aeo_market_not_included' })
    await query(`UPDATE greenhouse_client_portal.module_assignments SET expires_at=now()-interval '1 second'`)
    await expect(requestRunBatchInternal(input)).rejects.toMatchObject({ code: 'not_entitled' })
    expect((await counts()).runs).toBe(0)
  })
  it('same key with a changed selection conflicts; unknown market never falls back', async () => {
    await requestRunBatchInternal(input)
    await expect(requestRunBatchInternal({ ...input, markets: 'primary' })).rejects.toMatchObject({
      code: 'aeo_idempotency_conflict'
    })
    await expect(
      requestRunBatchInternal({ ...input, markets: ['foreign-market'], idempotencyKey: 'foreign' })
    ).rejects.toMatchObject({ code: 'aeo_market_not_configured' })
  })
  it('operator public command rejects client identity and missing capability', async () => {
    expect(() =>
      requestGraderRunBatch({
        ...input,
        channel: 'operator',
        subject: { tenantType: 'client', userId: 'user-local' } as never
      })
    ).toThrow('forbidden')
    state.authorized = false
    expect(() =>
      requestGraderRunBatch({
        ...input,
        channel: 'operator',
        subject: { tenantType: 'efeonce_internal', userId: 'user-local' } as never
      })
    ).toThrow('forbidden')
    expect((await counts()).batches).toBe(0)
  })
})
