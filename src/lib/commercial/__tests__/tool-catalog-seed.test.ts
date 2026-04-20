import { describe, expect, it } from 'vitest'

import { loadToolCatalogSeedFile, normalizeToolCatalogCsv } from '@/lib/commercial/tool-catalog-seed'

describe('normalizeToolCatalogCsv', () => {
  it('maps figma into a canonical commercial tool row', async () => {
    const csv = await loadToolCatalogSeedFile()
    const parsed = normalizeToolCatalogCsv(csv)
    const figma = parsed.rows.find(row => row.toolSku === 'ETG-019')

    expect(figma).toBeTruthy()
    expect(figma?.toolName).toBe('Figma')
    expect(figma?.providerId).toBe('figma')
    expect(figma?.proratingQty).toBe(3)
    expect(figma?.proratedCostUsd).toBe(20)
    expect(figma?.applicableBusinessLines).toEqual(['wave'])
    expect(figma?.applicabilityTags).toEqual([])
  })

  it('keeps non-business-line semantics in applicability tags', async () => {
    const csv = await loadToolCatalogSeedFile()
    const parsed = normalizeToolCatalogCsv(csv)
    const notion = parsed.rows.find(row => row.toolSku === 'ETG-015')
    const deel = parsed.rows.find(row => row.toolSku === 'ETG-017')

    expect(notion?.applicableBusinessLines).toEqual([])
    expect(notion?.applicabilityTags).toEqual(['all_business_lines'])
    expect(deel?.applicableBusinessLines).toEqual([])
    expect(deel?.applicabilityTags).toEqual(['staff_augmentation'])
  })

  it('skips placeholders and blank rows instead of creating junk', async () => {
    const csv = await loadToolCatalogSeedFile()
    const parsed = normalizeToolCatalogCsv(csv)

    expect(parsed.summary.activeRows).toBe(26)
    expect(parsed.summary.skippedPlaceholder).toBe(7)
    expect(parsed.summary.skippedEmpty).toBe(3)
    expect(parsed.rejectedRows).toHaveLength(0)
  })
})
