import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export interface AiSignalListItem {
  signalId: string
  signalType: string
  spaceId: string
  memberId: string | null
  projectId: string | null
  metricName: string
  severity: string | null
  currentValue: number | null
  expectedValue: number | null
  predictedValue: number | null
  confidence: number | null
  actionSummary: string | null
  generatedAt: string
}

export interface AgencyAiSignalsSummary {
  totals: {
    signals: number
    critical: number
    warning: number
    recommendation: number
  }
  recentSignals: AiSignalListItem[]
  lastGeneratedAt: string | null
}

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

const mapSignalRow = (row: Record<string, unknown>): AiSignalListItem => ({
  signalId: String(row.signal_id),
  signalType: String(row.signal_type),
  spaceId: String(row.space_id),
  memberId: typeof row.member_id === 'string' ? row.member_id : null,
  projectId: typeof row.project_id === 'string' ? row.project_id : null,
  metricName: String(row.metric_name),
  severity: typeof row.severity === 'string' ? row.severity : null,
  currentValue: toNumber(row.current_value),
  expectedValue: toNumber(row.expected_value),
  predictedValue: toNumber(row.predicted_value),
  confidence: toNumber(row.confidence),
  actionSummary: typeof row.action_summary === 'string' ? row.action_summary : null,
  generatedAt: String(row.generated_at)
})

export const readAgencyAiSignalsSummary = async (
  periodYear: number,
  periodMonth: number,
  limit = 8
): Promise<AgencyAiSignalsSummary> => {
  const totalsRows = await runGreenhousePostgresQuery<Record<string, unknown>>(
    `
      SELECT
        COUNT(*) AS signals,
        COUNT(*) FILTER (WHERE severity = 'critical') AS critical,
        COUNT(*) FILTER (WHERE severity = 'warning') AS warning,
        COUNT(*) FILTER (WHERE signal_type = 'recommendation') AS recommendation,
        MAX(generated_at)::text AS last_generated_at
      FROM greenhouse_serving.ico_ai_signals
      WHERE period_year = $1
        AND period_month = $2
    `,
    [periodYear, periodMonth]
  ).catch(() => [])

  const recentSignalsRows = await runGreenhousePostgresQuery<Record<string, unknown>>(
    `
      SELECT *
      FROM greenhouse_serving.ico_ai_signals
      WHERE period_year = $1
        AND period_month = $2
      ORDER BY generated_at DESC, severity DESC
      LIMIT $3
    `,
    [periodYear, periodMonth, limit]
  ).catch(() => [])

  const totalsRow = totalsRows[0] ?? {}

  return {
    totals: {
      signals: Number(totalsRow.signals ?? 0),
      critical: Number(totalsRow.critical ?? 0),
      warning: Number(totalsRow.warning ?? 0),
      recommendation: Number(totalsRow.recommendation ?? 0)
    },
    recentSignals: recentSignalsRows.map(row => mapSignalRow(row)),
    lastGeneratedAt: totalsRow.last_generated_at ? String(totalsRow.last_generated_at) : null
  }
}

export const readOrganizationAiSignals = async (
  organizationId: string,
  limit = 3
): Promise<AiSignalListItem[]> => {
  const rows = await runGreenhousePostgresQuery<Record<string, unknown>>(
    `SELECT sig.*
     FROM greenhouse_serving.ico_ai_signals sig
     INNER JOIN greenhouse_core.spaces s
       ON s.space_id = sig.space_id
     WHERE s.organization_id = $1
       AND s.active = TRUE
     ORDER BY sig.generated_at DESC, sig.severity DESC
     LIMIT $2`,
    [organizationId, limit]
  ).catch(() => [])

  return rows.map(mapSignalRow)
}
