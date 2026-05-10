import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import type { ReliabilitySignal, ReliabilitySeverity } from '@/types/reliability'

export const RELEASE_GITHUB_WEBHOOK_UNMATCHED_SIGNAL_ID =
  'platform.release.github_webhook_unmatched'

interface GithubWebhookUnhealthyRow extends Record<string, unknown> {
  processing_status: string
  count: string
  latest_received_at: string | null
}

const WINDOW_HOURS = 24

const computeSeverity = (failedCount: number, unmatchedCount: number): ReliabilitySeverity => {
  if (failedCount > 0) return 'error'
  if (unmatchedCount > 0) return 'warning'

  return 'ok'
}

export const getReleaseGithubWebhookUnmatchedSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<GithubWebhookUnhealthyRow>(
      `SELECT processing_status,
              COUNT(*)::text AS count,
              MAX(received_at)::text AS latest_received_at
         FROM greenhouse_sync.github_release_webhook_events
        WHERE processing_status IN ('unmatched', 'failed')
          AND received_at >= NOW() - ($1::text || ' hours')::interval
        GROUP BY processing_status`,
      [String(WINDOW_HOURS)]
    )

    const failed = rows.find(row => row.processing_status === 'failed')
    const unmatched = rows.find(row => row.processing_status === 'unmatched')
    const failedCount = Number(failed?.count ?? 0)
    const unmatchedCount = Number(unmatched?.count ?? 0)
    const severity = computeSeverity(failedCount, unmatchedCount)

    return {
      signalId: RELEASE_GITHUB_WEBHOOK_UNMATCHED_SIGNAL_ID,
      moduleKey: 'platform',
      kind: 'drift',
      source: 'getReleaseGithubWebhookUnmatchedSignal',
      label: 'GitHub release webhooks unmatched',
      severity,
      summary:
        severity === 'ok'
          ? `0 GitHub release webhook unmatched/failed events in last ${WINDOW_HOURS}h.`
          : `${unmatchedCount} unmatched, ${failedCount} failed GitHub release webhook event${unmatchedCount + failedCount === 1 ? '' : 's'} in last ${WINDOW_HOURS}h.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'unmatched_count', value: String(unmatchedCount) },
        { kind: 'metric', label: 'failed_count', value: String(failedCount) },
        { kind: 'metric', label: 'window_hours', value: String(WINDOW_HOURS) },
        {
          kind: 'metric',
          label: 'latest_unhealthy_received_at',
          value: failed?.latest_received_at ?? unmatched?.latest_received_at ?? 'none'
        },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md §2.10'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'cloud', {
      tags: { source: 'reliability_signal_release_github_webhook_unmatched' }
    })

    return {
      signalId: RELEASE_GITHUB_WEBHOOK_UNMATCHED_SIGNAL_ID,
      moduleKey: 'platform',
      kind: 'drift',
      source: 'getReleaseGithubWebhookUnmatchedSignal',
      label: 'GitHub release webhooks unmatched',
      severity: 'unknown',
      summary: `No fue posible consultar GitHub release webhooks: ${redactErrorForResponse(error)}`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'error', value: redactErrorForResponse(error) }
      ]
    }
  }
}
