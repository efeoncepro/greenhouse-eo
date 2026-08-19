import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export interface AssessmentPublicAccessRetentionSummary {
  purgedSessions: number
  purgedRequestBuckets: number
  overdueSessions: number
  overdueRequestBuckets: number
  batches: number
  steady: boolean
}

const MAX_RETENTION_BATCHES = 10
const MAX_RETENTION_RUNTIME_MS = 20_000

/** Daily ops-owner. It drains up to 50k sessions/200k buckets, but never runs unbounded. */
export const purgeAssessmentPublicAccessRetention = async (): Promise<AssessmentPublicAccessRetentionSummary> => {
  const deadline = Date.now() + MAX_RETENTION_RUNTIME_MS

  const summary: AssessmentPublicAccessRetentionSummary = {
    purgedSessions: 0,
    purgedRequestBuckets: 0,
    overdueSessions: 0,
    overdueRequestBuckets: 0,
    batches: 0,
    steady: false,
  }

  do {
    const rows = await runGreenhousePostgresQuery<{
      purged_sessions: number | string
      purged_request_buckets: number | string
      overdue_sessions: number | string
      overdue_request_buckets: number | string
    }>('SELECT * FROM greenhouse_hiring.run_assessment_public_access_retention()')

    const row = rows[0]

    summary.purgedSessions += Number(row?.purged_sessions ?? 0)
    summary.purgedRequestBuckets += Number(row?.purged_request_buckets ?? 0)
    summary.overdueSessions = Number(row?.overdue_sessions ?? 0)
    summary.overdueRequestBuckets = Number(row?.overdue_request_buckets ?? 0)
    summary.batches += 1
    summary.steady = summary.overdueSessions === 0 && summary.overdueRequestBuckets === 0
  } while (!summary.steady && summary.batches < MAX_RETENTION_BATCHES && Date.now() < deadline)

  if (!summary.steady) {
    captureWithDomain(new Error('Assessment public access retention remains overdue after bounded purge.'), 'hiring', {
      level: 'warning',
      tags: { source: 'assessment_public_access_retention_overdue' },
      extra: { ...summary },
    })
  }

  return summary
}
