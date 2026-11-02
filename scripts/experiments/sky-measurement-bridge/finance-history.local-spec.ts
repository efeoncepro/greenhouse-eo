import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { closeGreenhousePostgres, runGreenhousePostgresQuery as query } from '@/lib/postgres/client'
import { createExpenseServiceAllocation, approveExpenseServiceAllocation } from '@/lib/finance/expense-service-allocations'
import { computeClientEconomicsSnapshots } from '@/lib/finance/postgres-store-intelligence'
import { materializeServiceAttributionForPeriod as materialize } from '@/lib/service-attribution/materialize'

import { seedFinanceRouting, persistedAttribution, semanticAttribution } from './finance-routing-fixtures'

afterAll(async () => { await closeGreenhousePostgres() })

const allocate = (expenseId = 'expense-seo', serviceId = 'service-seo', amount = 120) =>
  createExpenseServiceAllocation({ expenseId, serviceId, allocatedAmountClp: amount, actorId: 'synthetic-operator' })

describe.each(['A-prime', 'B'] as const)('real Finance and history with %s', variant => {
  beforeEach(async () => { await seedFinanceRouting(variant) })

  it('actual trigger admits the existing commercial owner only when service has the same client', async () => {
    if (variant === 'A-prime') {
      await expect(allocate()).rejects.toThrow('does not match service client_id')
      expect(await query('SELECT * FROM greenhouse_finance.expense_service_allocations')).toEqual([])
    } else {
      const draft = await allocate()
      const approved = await approveExpenseServiceAllocation({ allocationId: draft.allocationId, actorId: 'synthetic-reviewer' })

      expect(approved).toMatchObject({ clientId: 'client-owner', serviceId: 'service-seo', reviewStatus: 'approved', allocatedAmountClp: 120 })
      await materialize(2026, 11)
      expect(await query(`SELECT service_id,amount_clp::float FROM greenhouse_serving.service_attribution_facts
        WHERE source_id=$1`, [draft.allocationId])).toEqual([{ service_id: 'service-seo', amount_clp: 120 }])
    }
  })

  it('cannot bypass expense ownership by explicitly supplying the SEO client', async () => {
    const input = { expenseId: 'expense-seo', serviceId: 'service-seo', clientId: 'client-seo', allocatedAmountClp: 120, actorId: 'synthetic' }

    await expect(createExpenseServiceAllocation(input)).rejects.toThrow('does not match expense allocated_client_id')
  })

  it('both variants reject cross-organization allocation without changing the expense', async () => {
    const before = await query(`SELECT to_jsonb(e) AS row FROM greenhouse_finance.expenses e WHERE expense_id='expense-seo'`)

    await expect(allocate('expense-seo', 'service-control')).rejects.toThrow('does not match service client_id')
    expect(await query(`SELECT to_jsonb(e) AS row FROM greenhouse_finance.expenses e WHERE expense_id='expense-seo'`)).toEqual(before)
  })

  it('preserves aggregate commercial P&L with canonical owner and real nonzero labor reader', async () => {
    const errors = vi.spyOn(console, 'error')

    try {
      const rows = await computeClientEconomicsSnapshots(2026, 11)
      const sky = rows.filter(row => row.organizationId === 'org-sky')

      expect(sky).toHaveLength(1)
      expect(sky[0]).toMatchObject({ clientId: 'client-owner', totalRevenueClp: 1500, laborCostClp: 100, directCostsClp: 200, grossMarginClp: 1200 })
      expect(errors).not.toHaveBeenCalled() // A swallowed missing-schema/labor fallback is a test failure.
    } finally { errors.mockRestore() }
  })

  it('characterizes the financial cost of rekeying SEO expenses to make its allocation pass', async () => {
    const seoClient = variant === 'A-prime' ? 'client-seo' : 'client-owner'

    await query(`UPDATE greenhouse_finance.expenses SET allocated_client_id=$1 WHERE expense_id='expense-seo'`, [seoClient])
    expect((await allocate()).clientId).toBe(seoClient)
    const rows = (await computeClientEconomicsSnapshots(2026, 11)).filter(row => row.organizationId === 'org-sky')

    expect(rows).toHaveLength(variant === 'A-prime' ? 2 : 1)
    expect(rows.reduce((sum, row) => sum + row.grossMarginClp, 0)).toBe(1200)

    if (variant === 'A-prime') {
      expect(rows.find(row => row.clientId === 'client-seo')).toMatchObject({ totalRevenueClp: 0, directCostsClp: 120, grossMarginClp: -120 })
      expect(rows.find(row => row.clientId === 'client-owner')?.grossMarginClp).toBe(1320)
    }
  })

  it('resolves invoice deals to both services while exposing the labor split difference', async () => {
    await materialize(2026, 11)
    expect(await query(`SELECT source_id,service_id,amount_clp::float FROM greenhouse_serving.service_attribution_facts
      WHERE source_domain='finance_revenue' AND organization_id='org-sky' ORDER BY source_id`)).toEqual([
      { source_id: 'income-design', service_id: 'service-design', amount_clp: 1000 },
      { source_id: 'income-seo', service_id: 'service-seo', amount_clp: 500 }
    ])

    const labor = await query(`SELECT service_id,amount_clp::float FROM greenhouse_serving.service_attribution_facts
      WHERE amount_kind='labor_cost' ORDER BY service_id`)

    expect(labor).toEqual(variant === 'A-prime'
      ? [{ service_id: 'service-design', amount_clp: 100 }]
      : [{ service_id: 'service-design', amount_clp: 66.67 }, { service_id: 'service-seo', amount_clp: 33.33 }])
    // Revenue share is an existing estimation rule, not proof of actual departmental effort.
  })

  it('same-input retries preserve semantic attribution without duplicate sources', async () => {
    await materialize(2026, 11)
    const before = await semanticAttribution(11)

    await materialize(2026, 11)
    expect(await semanticAttribution(11)).toEqual(before)
  })

  it('new-period materialization preserves every old-period persisted field', async () => {
    await materialize(2026, 10)
    const before = await persistedAttribution(10)

    expect(before.length).toBeGreaterThan(0)
    await materialize(2026, 11)
    expect(await persistedAttribution(10)).toEqual(before)
  })

  it('actual transaction rolls back fact AND unresolved purge on failed replacement, then retries', async () => {
    await query(`INSERT INTO greenhouse_finance.income(income_id,client_id,organization_id,hubspot_deal_id,total_amount,total_amount_clp,invoice_date)
      VALUES ('ambiguous','client-owner','org-sky','missing-deal',50,50,'2026-11-10')`)
    await materialize(2026, 11)
    const before = await persistedAttribution(11)
    const semanticBefore = await semanticAttribution(11)

    expect(before.some(row => row.kind === 'unresolved')).toBe(true)
    await query('UPDATE sky_experiment.failure_switch SET enabled=true')
    await expect(materialize(2026, 11)).rejects.toThrow('synthetic failure after period purge')
    expect(await persistedAttribution(11)).toEqual(before)
    await query('UPDATE sky_experiment.failure_switch SET enabled=false')
    await materialize(2026, 11)
    expect(await semanticAttribution(11)).toEqual(semanticBefore)
  })

  it('characterizes old-period rebuild using current service activity and replacing control rows too', async () => {
    await materialize(2026, 10)
    const before = await semanticAttribution(10)
    const control = await query(`SELECT attribution_id FROM greenhouse_serving.service_attribution_facts WHERE source_id='history-control'`)

    await query(`UPDATE greenhouse_core.services SET active=false WHERE service_id='service-design'`)
    await materialize(2026, 10)
    expect(await semanticAttribution(10)).not.toEqual(before)
    expect(await query(`SELECT source_id FROM greenhouse_serving.service_attribution_unresolved WHERE source_id='history-design'`)).toEqual([{ source_id: 'history-design' }])
    expect(await query(`SELECT attribution_id FROM greenhouse_serving.service_attribution_facts WHERE source_id='history-control'`)).not.toEqual(control)
    expect(await query(`SELECT amount_clp::float FROM greenhouse_serving.service_attribution_facts WHERE source_id='history-control'`)).toEqual([{ amount_clp: 100 }])
  })
})
