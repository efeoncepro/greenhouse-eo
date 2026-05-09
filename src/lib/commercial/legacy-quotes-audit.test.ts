import { describe, expect, it } from 'vitest'

import { classifyLegacyQuoteAuditRow } from './legacy-quotes-audit'

const base = {
  legacyStatus: null,
  status: 'draft',
  financeQuoteId: null,
  organizationId: 'org-1',
  currentVersion: 1,
  hasCurrentVersionRow: true,
  hasCurrentLineItems: false,
  hasPipelineSnapshot: false,
  legacyExcluded: false
}

describe('classifyLegacyQuoteAuditRow', () => {
  it('does not classify finance_quote_id null as limbo by itself', () => {
    expect(classifyLegacyQuoteAuditRow(base)).toMatchObject({
      category: 'active_canonical',
      action: 'none',
      shouldMarkLegacyExcluded: false,
      reason: 'canonical_without_legacy_finance_bridge'
    })
  })

  it('keeps recoverable legacy rows for human normalization', () => {
    expect(classifyLegacyQuoteAuditRow({
      ...base,
      legacyStatus: 'draft',
      hasCurrentLineItems: true
    })).toMatchObject({
      category: 'recoverable',
      action: 'review_normalize',
      shouldMarkLegacyExcluded: false
    })
  })

  it('marks terminal legacy-only rows as historical finance-only', () => {
    expect(classifyLegacyQuoteAuditRow({
      ...base,
      legacyStatus: 'sent',
      status: 'issued',
      organizationId: null,
      hasCurrentVersionRow: false,
      hasCurrentLineItems: false
    })).toMatchObject({
      category: 'historical',
      action: 'mark_legacy_excluded',
      shouldMarkLegacyExcluded: true,
      reason: 'finance_only_historical_sent'
    })
  })

  it('marks broken limbo rows as excludable', () => {
    expect(classifyLegacyQuoteAuditRow({
      ...base,
      legacyStatus: 'draft',
      organizationId: null,
      hasCurrentVersionRow: false,
      hasCurrentLineItems: false
    })).toMatchObject({
      category: 'excludable',
      action: 'mark_legacy_excluded',
      shouldMarkLegacyExcluded: true
    })
  })
})
