import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal, ReliabilitySeverity } from '@/types/reliability'

export const NUBOX_SOURCE_FRESHNESS_SIGNAL_ID = 'finance.nubox.source_freshness'

const RAW_MAX_AGE_HOURS = 30
const QUOTES_HOT_MAX_AGE_MINUTES = 45
const BALANCE_MAX_AGE_HOURS = 5

type NuboxTrackedSourceObjectType =
  | 'raw_sync'
  | 'conformed_sync'
  | 'postgres_projection'
  | 'quotes_hot_sync'
  | 'balance_sync'

interface NuboxSyncRunFreshnessRow extends Record<string, unknown> {
  source_object_type: NuboxTrackedSourceObjectType
  latest_status: string | null
  latest_started_at: Date | string | null
  latest_finished_at: Date | string | null
  latest_notes: string | null
  latest_success_finished_at: Date | string | null
}

const QUERY_SQL = `
  WITH expected(source_object_type) AS (
    VALUES
      ('raw_sync'),
      ('conformed_sync'),
      ('postgres_projection'),
      ('quotes_hot_sync'),
      ('balance_sync')
  ),
  latest AS (
    SELECT DISTINCT ON (source_object_type)
      source_object_type,
      status,
      started_at,
      finished_at,
      notes
    FROM greenhouse_sync.source_sync_runs
    WHERE source_system = 'nubox'
      AND source_object_type IN (
        'raw_sync',
        'conformed_sync',
        'postgres_projection',
        'quotes_hot_sync',
        'balance_sync'
      )
    ORDER BY source_object_type, started_at DESC
  ),
  latest_success AS (
    SELECT DISTINCT ON (source_object_type)
      source_object_type,
      finished_at
    FROM greenhouse_sync.source_sync_runs
    WHERE source_system = 'nubox'
      AND status = 'succeeded'
      AND source_object_type IN (
        'raw_sync',
        'conformed_sync',
        'postgres_projection',
        'quotes_hot_sync',
        'balance_sync'
      )
    ORDER BY source_object_type, started_at DESC
  )
  SELECT
    expected.source_object_type,
    latest.status AS latest_status,
    latest.started_at AS latest_started_at,
    latest.finished_at AS latest_finished_at,
    latest.notes AS latest_notes,
    latest_success.finished_at AS latest_success_finished_at
  FROM expected
  LEFT JOIN latest USING (source_object_type)
  LEFT JOIN latest_success USING (source_object_type)
  ORDER BY expected.source_object_type
`

const toDate = (value: Date | string | null): Date | null => {
  if (!value) return null

  const date = value instanceof Date ? value : new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

const ageMinutes = (value: Date | string | null, now: Date): number | null => {
  const date = toDate(value)

  if (!date) return null

  return Math.max(0, Math.round((now.getTime() - date.getTime()) / 60_000))
}

const formatAge = (minutes: number | null) => {
  if (minutes === null) return 'sin exito registrado'
  if (minutes < 60) return `${minutes}m`

  return `${Math.round(minutes / 60)}h`
}

const rowByType = (rows: NuboxSyncRunFreshnessRow[]) =>
  new Map<NuboxTrackedSourceObjectType, NuboxSyncRunFreshnessRow>(
    rows.map(row => [row.source_object_type, row])
  )

const isLatestFailed = (row: NuboxSyncRunFreshnessRow | undefined) =>
  row?.latest_status === 'failed' || row?.latest_status === 'partial'

export const evaluateNuboxSourceFreshnessRows = (
  rows: NuboxSyncRunFreshnessRow[],
  now = new Date()
): { severity: ReliabilitySeverity; summary: string; evidence: ReliabilitySignal['evidence'] } => {
  const byType = rowByType(rows)
  const raw = byType.get('raw_sync')
  const conformed = byType.get('conformed_sync')
  const postgres = byType.get('postgres_projection')
  const quotes = byType.get('quotes_hot_sync')
  const balance = byType.get('balance_sync')

  const rawAgeMinutes = ageMinutes(raw?.latest_success_finished_at ?? null, now)
  const quotesAgeMinutes = ageMinutes(quotes?.latest_success_finished_at ?? null, now)
  const balanceAgeMinutes = ageMinutes(balance?.latest_success_finished_at ?? null, now)
  const conformedSuccess = toDate(conformed?.latest_success_finished_at ?? null)
  const rawSuccess = toDate(raw?.latest_success_finished_at ?? null)

  const problems: string[] = []
  const warnings: string[] = []

  if (!rawSuccess || rawAgeMinutes === null || rawAgeMinutes > RAW_MAX_AGE_HOURS * 60) {
    problems.push(`raw_sync stale (${formatAge(rawAgeMinutes)})`)
  }

  if (isLatestFailed(raw)) {
    problems.push(`ultimo raw_sync=${raw?.latest_status}`)
  }

  if (!quotes?.latest_success_finished_at || quotesAgeMinutes === null || quotesAgeMinutes > QUOTES_HOT_MAX_AGE_MINUTES) {
    problems.push(`quotes_hot_sync stale (${formatAge(quotesAgeMinutes)})`)
  }

  if (isLatestFailed(quotes)) {
    problems.push(`ultimo quotes_hot_sync=${quotes?.latest_status}`)
  }

  if (conformedSuccess && rawSuccess && conformedSuccess > rawSuccess && rawAgeMinutes !== null && rawAgeMinutes > RAW_MAX_AGE_HOURS * 60) {
    problems.push('conformed/projection frescos sobre raw stale')
  }

  if (!balance?.latest_success_finished_at || balanceAgeMinutes === null || balanceAgeMinutes > BALANCE_MAX_AGE_HOURS * 60) {
    warnings.push(`balance_sync stale (${formatAge(balanceAgeMinutes)})`)
  }

  if (isLatestFailed(balance)) {
    warnings.push(`ultimo balance_sync=${balance?.latest_status}`)
  }

  const severity: ReliabilitySeverity = problems.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ok'

  return {
    severity,
    summary:
      severity === 'ok'
        ? 'Nubox raw, quotes hot lane, proyeccion y balance sync estan dentro de SLA.'
        : [...problems, ...warnings].join('; '),
    evidence: [
      {
        kind: 'metric',
        label: 'raw_success_age',
        value: formatAge(rawAgeMinutes)
      },
      {
        kind: 'metric',
        label: 'quotes_hot_success_age',
        value: formatAge(quotesAgeMinutes)
      },
      {
        kind: 'metric',
        label: 'balance_success_age',
        value: formatAge(balanceAgeMinutes)
      },
      {
        kind: 'metric',
        label: 'latest_raw_status',
        value: raw?.latest_status ?? 'missing'
      },
      {
        kind: 'metric',
        label: 'latest_quotes_hot_status',
        value: quotes?.latest_status ?? 'missing'
      },
      {
        kind: 'metric',
        label: 'latest_postgres_projection_status',
        value: postgres?.latest_status ?? 'missing'
      },
      {
        kind: 'sql',
        label: 'Query',
        value: 'greenhouse_sync.source_sync_runs WHERE source_system=nubox'
      }
    ]
  }
}

export const getNuboxSourceFreshnessSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<NuboxSyncRunFreshnessRow>(QUERY_SQL)
    const evaluated = evaluateNuboxSourceFreshnessRows(rows)

    return {
      signalId: NUBOX_SOURCE_FRESHNESS_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'freshness',
      source: 'getNuboxSourceFreshnessSignal',
      label: 'Nubox source freshness',
      severity: evaluated.severity,
      summary: evaluated.summary,
      observedAt,
      evidence: [
        ...evaluated.evidence,
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-841-nubox-ops-worker-config-freshness-hardening.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'finance', {
      tags: { source: 'reliability_signal_nubox_source_freshness' }
    })

    return {
      signalId: NUBOX_SOURCE_FRESHNESS_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'freshness',
      source: 'getNuboxSourceFreshnessSignal',
      label: 'Nubox source freshness',
      severity: 'unknown',
      summary: 'No fue posible leer freshness Nubox desde source_sync_runs.',
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'error',
          value: error instanceof Error ? error.message : String(error)
        }
      ]
    }
  }
}
