// `pnpm pricing:v3 hubspot list|estimate` (TASK-1405): the HubSpot list price handed to a V3 brief.
//
// The fragment is checked by the real verifier, the brief schema (`briefSchema.shape.thirdPartyCosts`), not by its
// shape here; this file pins what the command decides: which lines become costs, which stay pending, and the exit.
import { describe, expect, it } from 'vitest'

import { runHubSpotCommand } from '../../../../../scripts/commercial/pricing-v3-hubspot'
import { briefSchema } from '../catalog/contracts'

const estimate = (values: Record<string, string | boolean>) => {
  const { text, exitCode } = runHubSpotCommand('estimate', values)

  return { output: JSON.parse(text), exitCode }
}

describe('pricing-v3 hubspot', () => {
  it('Sales Hub Enterprise, 10 licences, waiver: one client_direct licence cost for 12 periods, exit 0', () => {
    const { output, exitCode } = estimate({ hub: 'sales', tier: 'enterprise', seats: '10', 'waive-onboarding': true })

    expect(exitCode).toBe(0)
    expect(output.estimate.totals).toMatchObject({ monthlyUsd: 1500, yearOneUsd: 18000 })
    expect(output.brief.complete).toBe(true)
    expect(output.brief.thirdPartyCosts).toHaveLength(1)
    expect(output.brief.thirdPartyCosts[0]).toMatchObject({
      category: 'licences',
      supplier: 'HubSpot',
      settlement: 'client_direct',
      amount: '150',
      currency: 'USD',
      quantity: '10'
    })
    expect(output.brief.thirdPartyCosts[0].periodIds).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    expect(output.brief.omitted).toEqual([{ lineId: 'sales-enterprise-onboarding', reason: 'waived' }])
    expect(() => briefSchema.shape.thirdPartyCosts.parse(output.brief.thirdPartyCosts)).not.toThrow()
  })

  it('reinvoiced carries its evidence; a secondary onboarding fee stays pending and exits 2', () => {
    const { output, exitCode } = estimate({
      hub: 'sales',
      tier: 'pro',
      seats: '10',
      settlement: 'reinvoiced',
      months: '6'
    })

    expect(exitCode).toBe(2)
    expect(output.brief.thirdPartyCosts[0]).toMatchObject({ settlement: 'reinvoiced', amount: '100' })
    expect(output.brief.thirdPartyCosts[0].evidence.status).toBe('estimated')
    expect(output.brief.pending).toEqual([
      expect.objectContaining({ lineId: 'sales-pro-onboarding', reason: 'secondary_evidence' })
    ])
  })

  it('a «from» price of additional licences never becomes a cost', () => {
    const { output } = estimate({ hub: 'marketing', tier: 'pro', seats: '5', 'waive-onboarding': true })

    expect(output.brief.thirdPartyCosts.map((cost: { costId: string }) => cost.costId)).toEqual([
      'hubspot-marketing-pro-account'
    ])
    expect(output.brief.pending).toEqual([expect.objectContaining({ reason: 'from_price' })])
  })

  it('names the option to fix', () => {
    expect(() => runHubSpotCommand('estimate', { hub: 'nope', tier: 'pro', seats: '1' })).toThrow('INVALID_ARGUMENT')
    expect(() => runHubSpotCommand('estimate', { hub: 'sales', tier: 'pro' })).toThrow('MISSING_ARGUMENT')
    expect(() => runHubSpotCommand('estimate', { hub: 'sales', tier: 'gold', seats: '1' })).toThrow('INVALID_ARGUMENT')
  })

  it('lists the pricebook', () => {
    const { text, exitCode } = runHubSpotCommand('list', { hub: 'sales' })
    const output = JSON.parse(text)

    expect(exitCode).toBe(0)
    expect(output.pricebook).toMatchObject({ version: '1.0.0', asOf: '2026-11-05', currency: 'USD' })
    expect(output.rows.map((row: { tier: string }) => row.tier)).toEqual(['starter', 'pro', 'enterprise'])
  })
})
