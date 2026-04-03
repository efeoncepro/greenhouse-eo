import { describe, expect, it } from 'vitest'

import {
  buildNotionDeliveryDataQualityChecks,
  buildNotionDeliveryDataQualitySummary,
  deriveIntegrationDataQualityStatus
} from './notion-delivery-data-quality-core'
import type { DeliveryNotionParityAuditOutput, NotionParityBucket } from '@/lib/space-notion/notion-parity-audit'

const emptyBucketCounts = (): Record<NotionParityBucket, number> => ({
  missing_in_conformed: 0,
  missing_in_raw: 0,
  status_mismatch: 0,
  due_date_mismatch: 0,
  assignee_mismatch: 0,
  multiple_mutations: 0,
  fresh_raw_after_conformed_sync: 0,
  hierarchy_gap_candidate: 0
})

const makeAudit = (
  bucketCounts: Partial<Record<NotionParityBucket, number>> = {}
): DeliveryNotionParityAuditOutput => ({
  spaceId: 'EO-SPC-0001',
  periodField: 'due_date',
  period: {
    year: 2026,
    month: 4,
    startDate: '2026-04-01',
    endDate: '2026-04-30'
  },
  assigneeSourceId: null,
  conformedSyncedAt: '2026-04-03T03:45:00.000Z',
  summary: {
    rawCount: 10,
    conformedCount: 10,
    matchedCount: 10,
    diffCount: 0,
    bucketCounts: {
      ...emptyBucketCounts(),
      ...bucketCounts
    }
  },
  buckets: {
    missing_in_conformed: [],
    missing_in_raw: [],
    status_mismatch: [],
    due_date_mismatch: [],
    assignee_mismatch: [],
    multiple_mutations: [],
    fresh_raw_after_conformed_sync: [],
    hierarchy_gap_candidate: []
  }
})

describe('notion delivery data quality core', () => {
  it('classifies a clean audit as healthy', () => {
    const audit = makeAudit()

    const summary = buildNotionDeliveryDataQualitySummary({
      audit,
      rawFreshnessReady: true,
      rawFreshnessReasons: []
    })

    const checks = buildNotionDeliveryDataQualityChecks({
      audit,
      rawFreshnessReady: true,
      rawFreshnessReasons: []
    })

    expect(summary.rawFreshnessReady).toBe(true)
    expect(checks.every(check => check.severity === 'ok')).toBe(true)
    expect(deriveIntegrationDataQualityStatus(checks)).toBe('healthy')
  })

  it('classifies hard bucket findings as broken', () => {
    const audit = makeAudit({
      missing_in_conformed: 2
    })

    const checks = buildNotionDeliveryDataQualityChecks({
      audit,
      rawFreshnessReady: true,
      rawFreshnessReasons: []
    })

    expect(checks.find(check => check.checkKey === 'missing_in_conformed')?.severity).toBe('error')
    expect(deriveIntegrationDataQualityStatus(checks)).toBe('broken')
  })

  it('classifies warning buckets without hard failures as degraded', () => {
    const audit = makeAudit({
      status_mismatch: 3
    })

    const checks = buildNotionDeliveryDataQualityChecks({
      audit,
      rawFreshnessReady: true,
      rawFreshnessReasons: []
    })

    expect(checks.find(check => check.checkKey === 'status_mismatch')?.severity).toBe('warning')
    expect(deriveIntegrationDataQualityStatus(checks)).toBe('degraded')
  })
})
