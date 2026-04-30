import 'server-only'

import { getBigQueryClient } from '@/lib/bigquery'
import { getSantiagoDateParts } from '@/lib/calendar/business-time'
import {
  buildMetricSelectSQL,
  buildDeliveryPeriodSourceSql,
  getIcoEngineProjectId,
  runIcoEngineQuery
} from '../shared'

import { detectAiAnomalies } from './anomaly-detector'
import { buildAiPredictions } from './predictor'
import { analyzeAiRootCauses } from './root-cause-analyzer'
import {
  getResolvedProjectDisplay,
  isProjectDisplaySentinel,
  isTechnicalProjectIdentifier,
  resolveProjectDisplayBatch
} from './entity-display-resolution'
import type {
  AiMetricSnapshotRow,
  AiPredictionLogRow,
  AiRootCauseDimensionRow,
  AiSignalRecord
} from './types'

export interface AiSignalMaterializationResult {
  aiSignalsWritten: number
  predictionLogsWritten: number
}

const AI_MODEL_VERSION = 'ico-ai-core-v1.0.0'

const serializeSignalPayload = (payloadJson: Record<string, unknown>) => JSON.stringify(payloadJson)

const toBigQuerySignalRow = (signal: AiSignalRecord) => ({
  signal_id: signal.signalId,
  signal_type: signal.signalType,
  space_id: signal.spaceId,
  member_id: signal.memberId,
  project_id: signal.projectId,
  metric_name: signal.metricName,
  period_year: signal.periodYear,
  period_month: signal.periodMonth,
  severity: signal.severity,
  current_value: signal.currentValue,
  expected_value: signal.expectedValue,
  z_score: signal.zScore,
  predicted_value: signal.predictedValue,
  confidence: signal.confidence,
  prediction_horizon: signal.predictionHorizon,
  contribution_pct: signal.contributionPct,
  dimension: signal.dimension,
  dimension_id: signal.dimensionId,
  action_type: signal.actionType,
  action_summary: signal.actionSummary,
  action_target_id: signal.actionTargetId,
  model_version: signal.modelVersion,
  generated_at: signal.generatedAt,
  ai_eligible: signal.aiEligible,
  payload_json: serializeSignalPayload(signal.payloadJson)
})

const toBigQueryPredictionLogRow = (row: AiPredictionLogRow) => ({
  prediction_id: row.predictionId,
  space_id: row.spaceId,
  metric_name: row.metricName,
  period_year: row.periodYear,
  period_month: row.periodMonth,
  predicted_value: row.predictedValue,
  predicted_at: row.predictedAt,
  confidence: row.confidence,
  actual_value: row.actualValue,
  actual_recorded_at: row.actualRecordedAt,
  error_pct: row.errorPct,
  model_version: row.modelVersion
})

const readCurrentSnapshots = async (
  projectId: string,
  periodYear: number,
  periodMonth: number
) =>
  runIcoEngineQuery<AiMetricSnapshotRow>(
    `SELECT *
     FROM \`${projectId}.ico_engine.metric_snapshots_monthly\`
     WHERE period_year = @periodYear
       AND period_month = @periodMonth`,
    { periodYear, periodMonth }
  )

const readHistoricalSnapshots = async (
  projectId: string,
  spaceIds: string[],
  periodYear: number,
  periodMonth: number
) => {
  if (spaceIds.length === 0) {
    return new Map<string, AiMetricSnapshotRow[]>()
  }

  const rows = await runIcoEngineQuery<AiMetricSnapshotRow>(
    `SELECT *
     FROM \`${projectId}.ico_engine.metric_snapshots_monthly\`
     WHERE space_id IN UNNEST(@spaceIds)
       AND (period_year * 100 + period_month) < (@periodYear * 100 + @periodMonth)
     ORDER BY space_id, period_year DESC, period_month DESC`,
    { spaceIds, periodYear, periodMonth }
  )

  const grouped = new Map<string, AiMetricSnapshotRow[]>()

  for (const row of rows) {
    const existing = grouped.get(row.space_id) ?? []

    if (existing.length < 6) {
      existing.push(row)
      grouped.set(row.space_id, existing)
    }
  }

  return grouped
}

const readRootCauseDimensionRows = async (
  projectId: string,
  periodYear: number,
  periodMonth: number
) => {
  const memberRows = await runIcoEngineQuery<AiRootCauseDimensionRow>(
    `SELECT
       space_id,
       'member' AS dimension,
       primary_owner_member_id AS dimension_id,
       primary_owner_member_id AS dimension_label,
       ${buildMetricSelectSQL()}
     FROM ${buildDeliveryPeriodSourceSql(projectId)}
     WHERE primary_owner_member_id IS NOT NULL
       AND TRIM(primary_owner_member_id) != ''
     GROUP BY space_id, dimension, dimension_id, dimension_label`,
    { periodYear, periodMonth }
  )

  const projectRows = await runIcoEngineQuery<AiRootCauseDimensionRow>(
    `SELECT
       space_id,
       'project' AS dimension,
       project_source_id AS dimension_id,
       project_source_id AS dimension_label,
       ${buildMetricSelectSQL()}
     FROM ${buildDeliveryPeriodSourceSql(projectId)}
     WHERE project_source_id IS NOT NULL
       AND TRIM(project_source_id) != ''
     GROUP BY space_id, dimension, dimension_id, dimension_label`,
    { periodYear, periodMonth }
  )

  const phaseRows = await runIcoEngineQuery<AiRootCauseDimensionRow>(
    `SELECT
       space_id,
       'phase' AS dimension,
       fase_csc AS dimension_id,
       fase_csc AS dimension_label,
       ${buildMetricSelectSQL()}
     FROM ${buildDeliveryPeriodSourceSql(projectId)}
     WHERE fase_csc IS NOT NULL
       AND TRIM(fase_csc) != ''
     GROUP BY space_id, dimension, dimension_id, dimension_label`,
    { periodYear, periodMonth }
  )

  const projectResolutions = await resolveProjectDisplayBatch(
    projectRows
      .filter((row): row is AiRootCauseDimensionRow & { dimension_id: string } => Boolean(row.dimension_id?.trim()) && Boolean(row.space_id?.trim()))
      .map(row => ({
        entityId: row.dimension_id as string,
        spaceId: row.space_id
      }))
  )

  const hydratedProjectRows = projectRows.map(row => {
    const resolution = row.dimension_id
      ? getResolvedProjectDisplay(projectResolutions, row.space_id, row.dimension_id)
      : null

    return {
      ...row,
      dimension_label: resolution?.displayLabel ?? row.dimension_label
    }
  })

  return [...memberRows, ...hydratedProjectRows, ...phaseRows]
}

export const buildRecommendationSignals = ({
  anomalies,
  rootCauses,
  generatedAt
}: {
  anomalies: AiSignalRecord[]
  rootCauses: AiSignalRecord[]
  generatedAt: string
}): AiSignalRecord[] => {
  const recommendations: AiSignalRecord[] = []

  for (const anomaly of anomalies) {
    const primaryCause = rootCauses.find(rootCause => rootCause.payloadJson.parentSignalId === anomaly.signalId)

    if (!primaryCause) {
      continue
    }

    const rawLabel =
      typeof primaryCause.payloadJson.dimensionLabel === 'string' && primaryCause.payloadJson.dimensionLabel.trim()
        ? primaryCause.payloadJson.dimensionLabel.trim()
        : primaryCause.dimensionId

    // Un label es usable si no es ID técnico y no es sentinel placeholder
    // (p. ej. "Sin nombre" histórico en BQ antes de TASK-588).
    const labelIsHuman =
      Boolean(rawLabel) && !isTechnicalProjectIdentifier(rawLabel) && !isProjectDisplaySentinel(rawLabel)

    const targetLabel = labelIsHuman ? rawLabel : primaryCause.dimensionId

    const safeProjectLabel = labelIsHuman ? rawLabel : 'este proyecto'

    const actionSummary =
      primaryCause.dimension === 'member'
        ? `Investigar carga operativa de ${targetLabel || 'este responsable'}: concentra ${primaryCause.contributionPct ?? 'n/a'}% del deterioro de ${anomaly.metricName}.`
        : primaryCause.dimension === 'project'
          ? `Priorizar ${safeProjectLabel}: concentra ${primaryCause.contributionPct ?? 'n/a'}% del deterioro de ${anomaly.metricName}.`
          : `Destrabar la fase ${targetLabel || primaryCause.dimensionId}: concentra ${primaryCause.contributionPct ?? 'n/a'}% del deterioro de ${anomaly.metricName}.`

    recommendations.push({
      signalId: `EO-AIS-${anomaly.signalId.slice(-8)}-REC`,
      signalType: 'recommendation',
      spaceId: anomaly.spaceId,
      memberId: primaryCause.memberId,
      projectId: primaryCause.projectId,
      metricName: anomaly.metricName,
      periodYear: anomaly.periodYear,
      periodMonth: anomaly.periodMonth,
      severity: anomaly.severity,
      currentValue: anomaly.currentValue,
      expectedValue: anomaly.expectedValue,
      zScore: anomaly.zScore,
      predictedValue: null,
      confidence: null,
      predictionHorizon: null,
      contributionPct: primaryCause.contributionPct,
      dimension: primaryCause.dimension,
      dimensionId: primaryCause.dimensionId,
      actionType: primaryCause.dimension === 'member' ? 'rebalance' : 'investigate',
      actionSummary,
      actionTargetId: primaryCause.dimensionId,
      modelVersion: AI_MODEL_VERSION,
      generatedAt,
      aiEligible: anomaly.aiEligible,
      payloadJson: {
        parentSignalId: anomaly.signalId,
        rootCauseSignalId: primaryCause.signalId
      }
    })
  }

  return recommendations
}

const replaceBigQuerySignalsForPeriod = async (
  projectId: string,
  periodYear: number,
  periodMonth: number,
  signals: AiSignalRecord[]
) => {
  const bigQuery = getBigQueryClient()

  await runIcoEngineQuery(
    `DELETE FROM \`${projectId}.ico_engine.ai_signals\`
     WHERE period_year = @periodYear
       AND period_month = @periodMonth`,
    { periodYear, periodMonth }
  )

  if (signals.length === 0) {
    return 0
  }

  await bigQuery.dataset('ico_engine').table('ai_signals').insert(signals.map(toBigQuerySignalRow))

  return signals.length
}

const replacePredictionLogs = async (projectId: string, rows: AiPredictionLogRow[]) => {
  if (rows.length === 0) {
    return 0
  }

  const bigQuery = getBigQueryClient()
  const predictionIds = rows.map(row => row.predictionId)

  await runIcoEngineQuery(
    `DELETE FROM \`${projectId}.ico_engine.ai_prediction_log\`
     WHERE prediction_id IN UNNEST(@predictionIds)`,
    { predictionIds }
  )

  await bigQuery.dataset('ico_engine').table('ai_prediction_log').insert(rows.map(toBigQueryPredictionLogRow))

  return rows.length
}

const hydratePredictionActuals = async (
  projectId: string,
  currentYear: number,
  currentMonth: number
) => {
  await runIcoEngineQuery(
    `UPDATE \`${projectId}.ico_engine.ai_prediction_log\` AS log
     SET
       actual_value = CASE log.metric_name
         WHEN 'otd_pct' THEN snap.otd_pct
         WHEN 'rpa_avg' THEN snap.rpa_avg
         WHEN 'ftr_pct' THEN snap.ftr_pct
         ELSE NULL
       END,
       actual_recorded_at = CURRENT_TIMESTAMP(),
       error_pct = CASE
         WHEN CASE log.metric_name
           WHEN 'otd_pct' THEN snap.otd_pct
           WHEN 'rpa_avg' THEN snap.rpa_avg
           WHEN 'ftr_pct' THEN snap.ftr_pct
           ELSE NULL
         END IS NULL OR CASE log.metric_name
           WHEN 'otd_pct' THEN snap.otd_pct
           WHEN 'rpa_avg' THEN snap.rpa_avg
           WHEN 'ftr_pct' THEN snap.ftr_pct
           ELSE NULL
         END = 0 THEN NULL
         ELSE ABS(
           log.predicted_value - CASE log.metric_name
             WHEN 'otd_pct' THEN snap.otd_pct
             WHEN 'rpa_avg' THEN snap.rpa_avg
             WHEN 'ftr_pct' THEN snap.ftr_pct
             ELSE NULL
           END
         ) / ABS(
           CASE log.metric_name
             WHEN 'otd_pct' THEN snap.otd_pct
             WHEN 'rpa_avg' THEN snap.rpa_avg
             WHEN 'ftr_pct' THEN snap.ftr_pct
             ELSE NULL
           END
         ) * 100
       END
     FROM \`${projectId}.ico_engine.metric_snapshots_monthly\` AS snap
     WHERE log.space_id = snap.space_id
       AND log.period_year = snap.period_year
       AND log.period_month = snap.period_month
       AND log.actual_value IS NULL
       AND (log.period_year * 100 + log.period_month) < (@currentYear * 100 + @currentMonth)`,
    { currentYear, currentMonth }
  )
}

export const materializeAiSignals = async (
  periodYear: number,
  periodMonth: number
): Promise<AiSignalMaterializationResult> => {
  const projectId = getIcoEngineProjectId()
  const currentSnapshots = await readCurrentSnapshots(projectId, periodYear, periodMonth)

  if (currentSnapshots.length === 0) {
    return { aiSignalsWritten: 0, predictionLogsWritten: 0 }
  }

  const generatedAt = new Date().toISOString()
  const generatedPeriod = getSantiagoDateParts(generatedAt)

  if (!generatedPeriod) {
    throw new Error(`ICO AI materialization produced invalid generatedAt timestamp: ${generatedAt}`)
  }

  const historyBySpace = await readHistoricalSnapshots(
    projectId,
    currentSnapshots.map(snapshot => snapshot.space_id),
    periodYear,
    periodMonth
  )

  const anomalies = detectAiAnomalies({
    currentSnapshots,
    historyBySpace,
    generatedAt,
    modelVersion: AI_MODEL_VERSION
  })

  const { predictionSignals, predictionLogs } = buildAiPredictions({
    currentSnapshots,
    historyBySpace,
    generatedAt,
    modelVersion: AI_MODEL_VERSION
  })

  const dimensionRows = anomalies.length > 0
    ? await readRootCauseDimensionRows(projectId, periodYear, periodMonth)
    : []

  const rootCauses = analyzeAiRootCauses({
    anomalies,
    dimensionRows,
    generatedAt,
    modelVersion: AI_MODEL_VERSION
  })

  const recommendations = buildRecommendationSignals({
    anomalies,
    rootCauses,
    generatedAt
  })

  const aiSignalsWritten = await replaceBigQuerySignalsForPeriod(
    projectId,
    periodYear,
    periodMonth,
    [...anomalies, ...predictionSignals, ...rootCauses, ...recommendations]
  )

  const predictionLogsWritten = await replacePredictionLogs(projectId, predictionLogs)

  await hydratePredictionActuals(projectId, generatedPeriod.year, generatedPeriod.month)

  return {
    aiSignalsWritten,
    predictionLogsWritten
  }
}
