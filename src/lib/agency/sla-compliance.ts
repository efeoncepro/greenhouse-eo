import 'server-only'

import { readLatestSpaceMetrics } from '@/lib/ico-engine/read-metrics'
import { getIcoEngineProjectId, runIcoEngineQuery } from '@/lib/ico-engine/shared'
import { resolveTimeToMarketMetric } from '@/lib/ico-engine/time-to-market'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import {
  getServiceSlaContext,
  listServiceSlaComplianceSnapshots,
  listServiceSlaDefinitions,
  replaceServiceSlaComplianceSnapshots
} from '@/lib/services/service-sla-store'
import type {
  ServiceSlaComplianceItem,
  ServiceSlaComplianceReport,
  ServiceSlaComplianceSnapshotRecord,
  ServiceSlaDefinition,
  ServiceSlaEvidence,
  ServiceSlaSourceStatus,
  ServiceSlaTrendStatus
} from '@/types/service-sla'

const CONFORMED_DATASET = 'greenhouse_conformed'

const ICO_METRIC_MAP = {
  otd_pct: { metricId: 'otd_pct', column: 'otd_pct' },
  rpa_avg: { metricId: 'rpa', column: 'rpa_avg' },
  ftr_pct: { metricId: 'ftr_pct', column: 'ftr_pct' }
} as const

type OverallStatus = ServiceSlaComplianceReport['overallStatus']

type MeasuredIndicator = {
  actualValue: number | null
  sourceStatus: ServiceSlaSourceStatus
  trendStatus: ServiceSlaTrendStatus
  confidenceLevel: ServiceSlaComplianceItem['confidenceLevel']
  sourcePeriodYear: number | null
  sourcePeriodMonth: number | null
  evidence: ServiceSlaEvidence
}

type RevisionRoundsRow = {
  avg_revision_rounds: number | string | null
  completed_task_count: number | string | null
  latest_year: number | string | null
  latest_month: number | string | null
}

type TrendRow = {
  metric_value: number | string | null
}

type TimeToMarketRow = {
  start_date: string | null
  end_date: string | null
}

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

const formatPeriodLabel = (year: number | null, month: number | null) => {
  if (!year || !month) return null

  return `${year}-${String(month).padStart(2, '0')}`
}

const deriveComplianceStatus = ({
  definition,
  actualValue,
  sourceStatus
}: {
  definition: ServiceSlaDefinition
  actualValue: number | null
  sourceStatus: ServiceSlaSourceStatus
}): ServiceSlaComplianceItem['complianceStatus'] => {
  if (actualValue === null || sourceStatus !== 'ready') {
    return 'source_unavailable'
  }

  const breachBoundary = definition.breachThreshold ?? definition.slaTargetValue
  const warningBoundary = definition.warningThreshold ?? definition.slaTargetValue

  if (definition.comparisonMode === 'at_least') {
    if (actualValue < breachBoundary) return 'breached'
    if (warningBoundary !== null && actualValue < warningBoundary) return 'at_risk'

    return 'met'
  }

  if (actualValue > breachBoundary) return 'breached'
  if (warningBoundary !== null && actualValue > warningBoundary) return 'at_risk'

  return 'met'
}

const deriveOverallStatus = (
  items: ServiceSlaComplianceItem[]
): OverallStatus => {
  if (items.length === 0) return 'no_sla_defined'
  if (items.some(item => item.complianceStatus === 'breached')) return 'breached'
  if (items.some(item => item.complianceStatus === 'at_risk')) return 'at_risk'
  if (items.some(item => item.complianceStatus === 'source_unavailable')) return 'partial'

  return 'healthy'
}

const mapSnapshotToItem = (
  definition: ServiceSlaDefinition,
  snapshot: ServiceSlaComplianceSnapshotRecord | null
): ServiceSlaComplianceItem => ({
  definition,
  complianceStatus: snapshot?.complianceStatus ?? 'source_unavailable',
  sourceStatus: snapshot?.sourceStatus ?? 'source_unavailable',
  trendStatus: snapshot?.trendStatus ?? 'unknown',
  actualValue: snapshot?.actualValue ?? null,
  deltaToTarget: snapshot?.deltaToTarget ?? null,
  confidenceLevel: snapshot?.confidenceLevel ?? null,
  sourcePeriodYear: snapshot?.sourcePeriodYear ?? null,
  sourcePeriodMonth: snapshot?.sourcePeriodMonth ?? null,
  evaluatedAt: snapshot?.evaluatedAt ?? new Date().toISOString(),
  evidence: (snapshot?.evidence as ServiceSlaEvidence | undefined) ?? {
    sourceLabel: 'Sin materialización previa',
    reasons: ['Todavía no existe snapshot materializado para este indicador.']
  }
})

const buildReport = ({
  serviceId,
  spaceId,
  definitions,
  items
}: {
  serviceId: string
  spaceId: string
  definitions: ServiceSlaDefinition[]
  items: ServiceSlaComplianceItem[]
}): ServiceSlaComplianceReport => ({
  serviceId,
  spaceId,
  evaluatedAt:
    items
      .map(item => item.evaluatedAt)
      .sort((a, b) => b.localeCompare(a))[0] ?? new Date().toISOString(),
  overallStatus: deriveOverallStatus(items),
  summary: {
    totalDefinitions: definitions.length,
    metCount: items.filter(item => item.complianceStatus === 'met').length,
    atRiskCount: items.filter(item => item.complianceStatus === 'at_risk').length,
    breachedCount: items.filter(item => item.complianceStatus === 'breached').length,
    sourceUnavailableCount: items.filter(item => item.complianceStatus === 'source_unavailable').length
  },
  items
})

const readMetricTrend = async ({
  spaceId,
  column,
  comparisonMode
}: {
  spaceId: string
  column: 'otd_pct' | 'rpa_avg' | 'ftr_pct'
  comparisonMode: ServiceSlaDefinition['comparisonMode']
}): Promise<ServiceSlaTrendStatus> => {
  const projectId = getIcoEngineProjectId()

  const rows = await runIcoEngineQuery<TrendRow>(
    `
      SELECT ${column} AS metric_value
      FROM \`${projectId}.ico_engine.metric_snapshots_monthly\`
      WHERE space_id = @spaceId
        AND ${column} IS NOT NULL
      ORDER BY period_year DESC, period_month DESC
      LIMIT 3
    `,
    { spaceId }
  )

  if (rows.length < 2) return 'unknown'

  const newest = toNumber(rows[0]?.metric_value)
  const oldest = toNumber(rows[rows.length - 1]?.metric_value)

  if (newest === null || oldest === null) return 'unknown'

  const delta = Number((newest - oldest).toFixed(4))

  if (Math.abs(delta) < 0.01) return 'stable'

  if (comparisonMode === 'at_least') {
    return delta > 0 ? 'improving' : 'degrading'
  }

  return delta < 0 ? 'improving' : 'degrading'
}

const measureIcoMetric = async ({
  definition,
  spaceId
}: {
  definition: ServiceSlaDefinition
  spaceId: string
}): Promise<MeasuredIndicator> => {
  const config = ICO_METRIC_MAP[definition.indicatorCode as keyof typeof ICO_METRIC_MAP]

  if (!config) {
    return {
      actualValue: null,
      sourceStatus: 'source_unavailable',
      trendStatus: 'unknown',
      confidenceLevel: null,
      sourcePeriodYear: null,
      sourcePeriodMonth: null,
      evidence: {
        sourceLabel: definition.measurementSource,
        reasons: ['No existe mapeo ICO para este indicador.']
      }
    }
  }

  try {
    const snapshot = await readLatestSpaceMetrics(spaceId)

    if (!snapshot) {
      return {
        actualValue: null,
        sourceStatus: 'source_unavailable',
        trendStatus: 'unknown',
        confidenceLevel: null,
        sourcePeriodYear: null,
        sourcePeriodMonth: null,
        evidence: {
          sourceLabel: definition.measurementSource,
          reasons: ['El ICO Engine no tiene snapshot materializado para este Space.']
        }
      }
    }

    const metric = snapshot.metrics.find(item => item.metricId === config.metricId)

    if (!metric || metric.value === null) {
      return {
        actualValue: null,
        sourceStatus: 'source_unavailable',
        trendStatus: 'unknown',
        confidenceLevel: metric?.confidenceLevel === 'none' ? 'none' : metric?.confidenceLevel ?? null,
        sourcePeriodYear: snapshot.periodYear,
        sourcePeriodMonth: snapshot.periodMonth,
        evidence: {
          sourceLabel: definition.measurementSource,
          sourcePeriodLabel: formatPeriodLabel(snapshot.periodYear, snapshot.periodMonth),
          reasons:
            metric?.qualityGateReasons && metric.qualityGateReasons.length > 0
              ? metric.qualityGateReasons
              : ['El snapshot ICO no devolvió valor utilizable para este indicador.'],
          meta: {
            qualityGateStatus: metric?.qualityGateStatus ?? null
          }
        }
      }
    }

    return {
      actualValue: metric.value,
      sourceStatus: 'ready',
      trendStatus: await readMetricTrend({
        spaceId,
        column: config.column,
        comparisonMode: definition.comparisonMode
      }).catch(() => 'unknown'),
      confidenceLevel: metric.confidenceLevel === 'none' ? 'none' : metric.confidenceLevel ?? null,
      sourcePeriodYear: snapshot.periodYear,
      sourcePeriodMonth: snapshot.periodMonth,
      evidence: {
        sourceLabel: definition.measurementSource,
        sourcePeriodLabel: formatPeriodLabel(snapshot.periodYear, snapshot.periodMonth),
        reasons: metric.qualityGateReasons ?? [],
        meta: {
          qualityGateStatus: metric.qualityGateStatus ?? null,
          source: snapshot.source
        }
      }
    }
  } catch (error) {
    return {
      actualValue: null,
      sourceStatus: 'source_unavailable',
      trendStatus: 'unknown',
      confidenceLevel: null,
      sourcePeriodYear: null,
      sourcePeriodMonth: null,
      evidence: {
        sourceLabel: definition.measurementSource,
        reasons: [error instanceof Error ? error.message : 'No se pudo leer el snapshot ICO.']
      }
    }
  }
}

const measureRevisionRounds = async ({
  definition,
  spaceId,
  notionProjectId
}: {
  definition: ServiceSlaDefinition
  spaceId: string
  notionProjectId: string | null
}): Promise<MeasuredIndicator> => {
  if (!notionProjectId) {
    return {
      actualValue: null,
      sourceStatus: 'insufficient_linkage',
      trendStatus: 'unknown',
      confidenceLevel: null,
      sourcePeriodYear: null,
      sourcePeriodMonth: null,
      evidence: {
        sourceLabel: definition.measurementSource,
        reasons: ['El servicio no tiene `notion_project_id`; no podemos vincular las tareas del ICO Engine.']
      }
    }
  }

  try {
    const projectId = getIcoEngineProjectId()

    const rows = await runIcoEngineQuery<RevisionRoundsRow>(
      `
        SELECT
          ROUND(AVG(
            COALESCE(SAFE_CAST(client_change_round_final AS FLOAT64), 0)
            + COALESCE(SAFE_CAST(workflow_change_round AS FLOAT64), 0)
          ), 2) AS avg_revision_rounds,
          COUNT(*) AS completed_task_count,
          MAX(EXTRACT(YEAR FROM completed_at)) AS latest_year,
          MAX(EXTRACT(MONTH FROM completed_at)) AS latest_month
        FROM \`${projectId}.ico_engine.v_tasks_enriched\`
        WHERE space_id = @spaceId
          AND project_source_id = @projectSourceId
          AND completed_at IS NOT NULL
      `,
      {
        spaceId,
        projectSourceId: notionProjectId
      }
    )

    const row = rows[0]
    const sampleSize = toNumber(row?.completed_task_count) ?? 0

    if (sampleSize === 0) {
      return {
        actualValue: null,
        sourceStatus: 'insufficient_sample',
        trendStatus: 'unknown',
        confidenceLevel: null,
        sourcePeriodYear: null,
        sourcePeriodMonth: null,
        evidence: {
          sourceLabel: definition.measurementSource,
          reasons: ['El proyecto no tiene tareas completadas suficientes para medir rondas de revisión.'],
          meta: {
            projectSourceId: notionProjectId,
            sampleSize
          }
        }
      }
    }

    const latestYear = toNumber(row?.latest_year)
    const latestMonth = toNumber(row?.latest_month)

    return {
      actualValue: toNumber(row?.avg_revision_rounds),
      sourceStatus: 'ready',
      trendStatus: 'unknown',
      confidenceLevel: sampleSize >= 10 ? 'high' : 'medium',
      sourcePeriodYear: latestYear,
      sourcePeriodMonth: latestMonth,
      evidence: {
        sourceLabel: definition.measurementSource,
        sourcePeriodLabel: formatPeriodLabel(latestYear, latestMonth),
        reasons: [],
        meta: {
          projectSourceId: notionProjectId,
          sampleSize
        }
      }
    }
  } catch (error) {
    return {
      actualValue: null,
      sourceStatus: 'source_unavailable',
      trendStatus: 'unknown',
      confidenceLevel: null,
      sourcePeriodYear: null,
      sourcePeriodMonth: null,
      evidence: {
        sourceLabel: definition.measurementSource,
        reasons: [error instanceof Error ? error.message : 'No se pudo consultar revisión rounds en BigQuery.']
      }
    }
  }
}

const measureTimeToMarket = async ({
  definition,
  notionProjectId
}: {
  definition: ServiceSlaDefinition
  notionProjectId: string | null
}): Promise<MeasuredIndicator> => {
  if (!notionProjectId) {
    return {
      actualValue: null,
      sourceStatus: 'insufficient_linkage',
      trendStatus: 'unknown',
      confidenceLevel: null,
      sourcePeriodYear: null,
      sourcePeriodMonth: null,
      evidence: {
        sourceLabel: definition.measurementSource,
        reasons: ['El servicio no tiene `notion_project_id`; no podemos resolver TTM desde delivery_projects.']
      }
    }
  }

  try {
    const projectId = getIcoEngineProjectId()

    const rows = await runIcoEngineQuery<TimeToMarketRow>(
      `
        SELECT start_date, end_date
        FROM \`${projectId}.${CONFORMED_DATASET}.delivery_projects\`
        WHERE project_source_id = @projectSourceId
          AND is_deleted = FALSE
        QUALIFY ROW_NUMBER() OVER (
          PARTITION BY project_source_id
          ORDER BY last_edited_time DESC NULLS LAST, synced_at DESC NULLS LAST, project_source_id
        ) = 1
      `,
      { projectSourceId: notionProjectId }
    )

    const row = rows[0]

    if (!row) {
      return {
        actualValue: null,
        sourceStatus: 'source_unavailable',
        trendStatus: 'unknown',
        confidenceLevel: null,
        sourcePeriodYear: null,
        sourcePeriodMonth: null,
        evidence: {
          sourceLabel: definition.measurementSource,
          reasons: ['No existe un proyecto conformed activo para el `notion_project_id` del servicio.'],
          meta: { projectSourceId: notionProjectId }
        }
      }
    }

    const metric = resolveTimeToMarketMetric({
      startCandidates: [
        {
          date: row.start_date,
          label: 'Fecha de inicio del proyecto vinculado',
          source: 'greenhouse_conformed.delivery_projects.start_date',
          mode: 'proxy'
        }
      ],
      activationCandidates: [
        {
          date: row.end_date,
          label: 'Fecha de cierre del proyecto vinculado',
          source: 'greenhouse_conformed.delivery_projects.end_date',
          mode: 'proxy'
        }
      ]
    })

    return {
      actualValue: metric.valueDays,
      sourceStatus: metric.valueDays === null ? 'source_unavailable' : 'ready',
      trendStatus: 'unknown',
      confidenceLevel: metric.confidenceLevel,
      sourcePeriodYear: metric.activation.date ? Number(metric.activation.date.slice(0, 4)) : null,
      sourcePeriodMonth: metric.activation.date ? Number(metric.activation.date.slice(5, 7)) : null,
      evidence: {
        sourceLabel: definition.measurementSource,
        sourcePeriodLabel: metric.activation.date ? metric.activation.date.slice(0, 7) : null,
        reasons: metric.qualityGateReasons,
        meta: {
          projectSourceId: notionProjectId,
          start: metric.start,
          activation: metric.activation,
          dataStatus: metric.dataStatus
        }
      }
    }
  } catch (error) {
    return {
      actualValue: null,
      sourceStatus: 'source_unavailable',
      trendStatus: 'unknown',
      confidenceLevel: null,
      sourcePeriodYear: null,
      sourcePeriodMonth: null,
      evidence: {
        sourceLabel: definition.measurementSource,
        reasons: [error instanceof Error ? error.message : 'No se pudo resolver TTM desde BigQuery.']
      }
    }
  }
}

const measureDefinition = async ({
  definition,
  serviceContext
}: {
  definition: ServiceSlaDefinition
  serviceContext: Awaited<ReturnType<typeof getServiceSlaContext>>
}): Promise<MeasuredIndicator> => {
  if (definition.indicatorCode in ICO_METRIC_MAP) {
    return measureIcoMetric({
      definition,
      spaceId: serviceContext.spaceId
    })
  }

  if (definition.indicatorCode === 'revision_rounds') {
    return measureRevisionRounds({
      definition,
      spaceId: serviceContext.spaceId,
      notionProjectId: serviceContext.notionProjectId
    })
  }

  if (definition.indicatorCode === 'ttm_days') {
    return measureTimeToMarket({
      definition,
      notionProjectId: serviceContext.notionProjectId
    })
  }

  return {
    actualValue: null,
    sourceStatus: 'source_unavailable',
    trendStatus: 'unknown',
    confidenceLevel: null,
    sourcePeriodYear: null,
    sourcePeriodMonth: null,
    evidence: {
      sourceLabel: definition.measurementSource,
      reasons: ['Indicador no soportado por la implementación actual.']
    }
  }
}

export const getServiceSlaComplianceReport = async ({
  serviceId,
  spaceId
}: {
  serviceId: string
  spaceId: string
}): Promise<ServiceSlaComplianceReport> => {
  const definitions = await listServiceSlaDefinitions({
    serviceId,
    spaceId,
    activeOnly: false
  })

  const snapshots = await listServiceSlaComplianceSnapshots({ serviceId, spaceId })
  const snapshotByDefinition = new Map(snapshots.map(snapshot => [snapshot.definitionId, snapshot]))
  const items = definitions.map(definition => mapSnapshotToItem(definition, snapshotByDefinition.get(definition.definitionId) ?? null))

  return buildReport({
    serviceId,
    spaceId,
    definitions,
    items
  })
}

export const refreshServiceSlaCompliance = async ({
  serviceId,
  spaceId,
  emitStatusChangeEvents = true
}: {
  serviceId: string
  spaceId: string
  emitStatusChangeEvents?: boolean
}): Promise<ServiceSlaComplianceReport> => {
  const serviceContext = await getServiceSlaContext({ serviceId, spaceId })

  const definitions = await listServiceSlaDefinitions({
    serviceId,
    spaceId,
    activeOnly: true
  })

  if (definitions.length === 0) {
    await replaceServiceSlaComplianceSnapshots({
      serviceId,
      spaceId,
      items: []
    })

    return buildReport({
      serviceId,
      spaceId,
      definitions,
      items: []
    })
  }

  const previousSnapshots = await listServiceSlaComplianceSnapshots({ serviceId, spaceId })
  const previousStatusByDefinition = new Map(previousSnapshots.map(snapshot => [snapshot.definitionId, snapshot.complianceStatus]))
  const evaluatedAt = new Date().toISOString()

  const items = await Promise.all(
    definitions.map(async definition => {
      const measurement = await measureDefinition({
        definition,
        serviceContext
      })

      const complianceStatus = deriveComplianceStatus({
        definition,
        actualValue: measurement.actualValue,
        sourceStatus: measurement.sourceStatus
      })

      return {
        definition,
        complianceStatus,
        sourceStatus: measurement.sourceStatus,
        trendStatus: measurement.trendStatus,
        actualValue: measurement.actualValue,
        deltaToTarget:
          measurement.actualValue === null
            ? null
            : Number((measurement.actualValue - definition.slaTargetValue).toFixed(4)),
        confidenceLevel: measurement.confidenceLevel,
        sourcePeriodYear: measurement.sourcePeriodYear,
        sourcePeriodMonth: measurement.sourcePeriodMonth,
        evaluatedAt,
        evidence: measurement.evidence
      } satisfies ServiceSlaComplianceItem
    })
  )

  await replaceServiceSlaComplianceSnapshots({
    serviceId,
    spaceId,
    items
  })

  if (emitStatusChangeEvents) {
    await Promise.all(
      items
        .filter(item => previousStatusByDefinition.get(item.definition.definitionId) !== item.complianceStatus)
        .map(item =>
          publishOutboxEvent({
            aggregateType: AGGREGATE_TYPES.service,
            aggregateId: serviceId,
            eventType: EVENT_TYPES.serviceSlaStatusChanged,
            payload: {
              serviceId,
              serviceName: serviceContext.serviceName,
              spaceId,
              organizationId: serviceContext.organizationId,
              definitionId: item.definition.definitionId,
              indicatorCode: item.definition.indicatorCode,
              previousStatus: previousStatusByDefinition.get(item.definition.definitionId) ?? null,
              complianceStatus: item.complianceStatus,
              actualValue: item.actualValue,
              evaluatedAt: item.evaluatedAt
            }
          })
        )
    )
  }

  return buildReport({
    serviceId,
    spaceId,
    definitions,
    items
  })
}
