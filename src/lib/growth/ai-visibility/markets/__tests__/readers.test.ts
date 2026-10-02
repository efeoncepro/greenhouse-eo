import { beforeEach, describe, expect, it, vi } from 'vitest'

import { readGraderMarketMatrix } from '../readers'

const state = vi.hoisted(() => ({ allowed: true, hasMexicoReport: true }))

vi.mock('@/lib/entitlements/runtime', () => ({ can: () => state.allowed }))
vi.mock('../../store', () => ({ getGraderProfileForOrganization: async () => ({ profileId: 'profile-a' }) }))
vi.mock('../../report/command', () => ({
  readGraderReport: async ({ runId }: { runId: string }) => ({
    publicReport: {
      overall: runId === 'run-cl' ? 60 : 30,
      provenance: { scoreVersion: 'v2', promptPackVersion: `pack-${runId}` }
    }
  })
}))
vi.mock('../store', () => ({
  listProfileMarkets: async () => [
    { marketId: 'cl', marketCode: 'CL', locale: 'es-CL', isPrimary: true, status: 'active' },
    { marketId: 'mx', marketCode: 'MX', locale: 'es-MX', isPrimary: false, status: 'active' }
  ],
  marketQueries: () => async (sql: string, values: string[]) => {
    if (sql.includes('SELECT brand_aliases')) return [{ brand_aliases: [] }]
    if (sql.includes('SELECT s.*')) return []

    if (sql.includes('SELECT run_id')) {
      if (values[0] === 'mx' && !state.hasMexicoReport) return []

return [
        { run_id: `run-${values[0]}`, provider_policy_version: 'policy.v2', competitor_set_id: `set-${values[0]}` }
      ]
    }

    if (sql.includes('SELECT 1')) return [{}]
    throw new Error('unexpected query')
  }
}))
const subject = { tenantType: 'efeonce_internal' } as never

beforeEach(() => {
  state.allowed = true
  state.hasMexicoReport = true
})
describe('market matrix contract', () => {
  it('keeps market measurements and methods separate, with no blended overall', async () => {
    const result = await readGraderMarketMatrix({ subject, organizationId: 'org-a' })

    expect(result.blendedOverall).toBeNull()
    expect(result.rows.map(row => row.market.marketCode)).toEqual(['CL', 'MX'])
    expect(result.rows.map(row => row.methodology?.competitorSetId)).toEqual(['set-cl', 'set-mx'])
    expect(result.rows.map(row => row.methodology?.scoreVersion)).toEqual(['v2', 'v2'])
    expect(result.rows.map(row => row.runId)).toEqual(['run-cl', 'run-mx'])
  })
  it('keeps an unmeasured market unavailable rather than borrowing another country', async () => {
    state.hasMexicoReport = false
    const result = await readGraderMarketMatrix({ subject, organizationId: 'org-a' })

    expect(result.rows[1]).toMatchObject({ runId: null, report: null, methodology: null })
    expect(result.rows[0].report).not.toBeNull()
  })
  it('rejects unconfigured market selection', async () => {
    await expect(
      readGraderMarketMatrix({ subject, organizationId: 'org-a', markets: ['foreign'] })
    ).rejects.toMatchObject({ code: 'aeo_market_not_configured' })
  })
  it('rejects client and unauthorized internal reads', async () => {
    await expect(
      readGraderMarketMatrix({ subject: { tenantType: 'client' } as never, organizationId: 'org-a' })
    ).rejects.toMatchObject({ code: 'forbidden' })
    state.allowed = false
    await expect(readGraderMarketMatrix({ subject, organizationId: 'org-a' })).rejects.toMatchObject({
      code: 'forbidden'
    })
  })
})
