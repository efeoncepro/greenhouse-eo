import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { normalizeSellableRolesCsv } from '@/lib/commercial/sellable-roles-seed'

const csv = readFileSync(
  path.join(process.cwd(), 'data/pricing/seed/sellable-roles-pricing.csv'),
  'utf8'
)

describe('normalizeSellableRolesCsv', () => {
  it('parses active rows and placeholders from the real seed contract', () => {
    const result = normalizeSellableRolesCsv(csv)

    expect(result.summary.totalRows).toBe(86)
    expect(result.summary.activeRows).toBe(32)
    expect(result.summary.skippedPlaceholder).toBe(54)
    expect(result.summary.rejected).toBe(0)
  })

  it('keeps employment type inference conservative', () => {
    const result = normalizeSellableRolesCsv(csv)
    const inferredRows = result.rows.filter(row => row.inferredEmploymentTypeCode === 'contractor_deel_usd')
    const reviewRows = result.rows.filter(row => row.reviewReasons.length > 0)

    expect(inferredRows).toHaveLength(28)
    expect(reviewRows).toHaveLength(4)

    expect(reviewRows.map(row => row.roleSku)).toEqual(expect.arrayContaining(['ECG-004', 'ECG-017', 'ECG-018', 'ECG-032']))
  })

  it('keeps the canonical spot checks aligned with the CSV', () => {
    const result = normalizeSellableRolesCsv(csv)
    const paidMediaManager = result.rows.find(row => row.roleSku === 'ECG-008')
    const hubspotPremium = result.rows.find(row => row.roleSku === 'ECG-032')

    expect(paidMediaManager?.roleLabelEs).toBe('Paid Media Manager')
    expect(paidMediaManager?.hourlyCostUsd).toBeCloseTo(17.4944444444, 6)
    expect(hubspotPremium?.reviewReasons).toEqual(['employment_type_requires_manual_review'])
  })
})
