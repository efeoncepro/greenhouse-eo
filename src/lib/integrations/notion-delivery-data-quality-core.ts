import type {
  DeliveryNotionParityAuditOutput,
  NotionParityBucket
} from '@/lib/space-notion/notion-parity-audit'
import type {
  IntegrationDataQualityCheckResult,
  IntegrationDataQualityCheckSeverity,
  IntegrationDataQualityStatus,
  NotionDeliveryDataQualitySummary
} from '@/types/integration-data-quality'

const HARD_BUCKETS: NotionParityBucket[] = [
  'missing_in_conformed',
  'missing_in_raw',
  'fresh_raw_after_conformed_sync'
]

const WARNING_BUCKETS: NotionParityBucket[] = [
  'status_mismatch',
  'due_date_mismatch',
  'assignee_mismatch',
  'multiple_mutations',
  'hierarchy_gap_candidate'
]

const buildCheck = ({
  checkKey,
  severity,
  summary,
  observedValue,
  expectedValue,
  detail
}: {
  checkKey: string
  severity: IntegrationDataQualityCheckSeverity
  summary: string
  observedValue?: string | null
  expectedValue?: string | null
  detail?: Record<string, unknown>
}): Omit<IntegrationDataQualityCheckResult, 'dataQualityCheckId' | 'createdAt'> => ({
  checkKey,
  severity,
  summary,
  observedValue: observedValue ?? null,
  expectedValue: expectedValue ?? null,
  detail: detail ?? {}
})

export const deriveIntegrationDataQualityStatus = (
  checks: Array<{ severity: IntegrationDataQualityCheckSeverity }>
): IntegrationDataQualityStatus => {
  if (checks.some(check => check.severity === 'error')) return 'broken'
  if (checks.some(check => check.severity === 'warning')) return 'degraded'

  return 'healthy'
}

export const buildNotionDeliveryDataQualitySummary = ({
  audit,
  rawFreshnessReady,
  rawFreshnessReasons
}: {
  audit: DeliveryNotionParityAuditOutput
  rawFreshnessReady: boolean
  rawFreshnessReasons: string[]
}): NotionDeliveryDataQualitySummary => ({
  rawCount: audit.summary.rawCount,
  conformedCount: audit.summary.conformedCount,
  matchedCount: audit.summary.matchedCount,
  diffCount: audit.summary.diffCount,
  bucketCounts: audit.summary.bucketCounts,
  rawFreshnessReady,
  rawFreshnessReasons,
  conformedSyncedAt: audit.conformedSyncedAt
})

export const buildNotionDeliveryDataQualityChecks = ({
  audit,
  rawFreshnessReady,
  rawFreshnessReasons
}: {
  audit: DeliveryNotionParityAuditOutput
  rawFreshnessReady: boolean
  rawFreshnessReasons: string[]
}) => {
  const checks: Array<Omit<IntegrationDataQualityCheckResult, 'dataQualityCheckId' | 'createdAt'>> = []

  checks.push(
    buildCheck({
      checkKey: 'raw_freshness',
      severity: rawFreshnessReady ? 'ok' : 'error',
      summary: rawFreshnessReady
        ? 'Raw Notion fresco para este space'
        : `Raw Notion no está listo: ${rawFreshnessReasons.join(' | ') || 'sin detalle'}`,
      detail: {
        reasons: rawFreshnessReasons
      }
    })
  )

  const countParityOk = audit.summary.rawCount === audit.summary.conformedCount

  checks.push(
    buildCheck({
      checkKey: 'row_count_parity',
      severity: countParityOk ? 'ok' : 'error',
      summary: countParityOk
        ? 'Conteo total raw vs conformed consistente'
        : `Conteo desigual raw=${audit.summary.rawCount} conformed=${audit.summary.conformedCount}`,
      observedValue: String(audit.summary.conformedCount),
      expectedValue: String(audit.summary.rawCount)
    })
  )

  for (const bucket of HARD_BUCKETS) {
    const count = audit.summary.bucketCounts[bucket]

    checks.push(
      buildCheck({
        checkKey: bucket,
        severity: count > 0 ? 'error' : 'ok',
        summary: count > 0 ? `${bucket} detectó ${count} caso(s)` : `${bucket} sin hallazgos`,
        observedValue: String(count),
        expectedValue: '0'
      })
    )
  }

  for (const bucket of WARNING_BUCKETS) {
    const count = audit.summary.bucketCounts[bucket]

    checks.push(
      buildCheck({
        checkKey: bucket,
        severity: count > 0 ? 'warning' : 'ok',
        summary: count > 0 ? `${bucket} detectó ${count} caso(s)` : `${bucket} sin hallazgos`,
        observedValue: String(count),
        expectedValue: '0'
      })
    )
  }

  return checks
}
