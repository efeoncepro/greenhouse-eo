import 'server-only'

import { randomUUID } from 'node:crypto'

import { query, withTransaction } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import type {
  ServiceSlaComplianceItem,
  ServiceSlaComplianceSnapshotRecord,
  ServiceSlaDefinition,
  UpsertServiceSlaDefinitionInput
} from '@/types/service-sla'

type ServiceRow = Record<string, unknown> & {
  service_id: string
  space_id: string
  name: string
}

type ServiceContextRow = ServiceRow & {
  organization_id: string | null
  notion_project_id: string | null
}

type DefinitionRow = Record<string, unknown> & {
  definition_id: string
  service_id: string
  space_id: string
  indicator_code: string
  indicator_formula: string
  measurement_source: string
  comparison_mode: string
  unit: string
  sli_label: string | null
  slo_target_value: string | number
  sla_target_value: string | number
  breach_threshold: string | number | null
  warning_threshold: string | number | null
  display_order: number | string
  active: boolean
  created_by: string | null
  updated_by: string | null
  created_at: string | Date
  updated_at: string | Date
}

type SnapshotRow = Record<string, unknown> & {
  snapshot_id: string
  definition_id: string
  service_id: string
  space_id: string
  indicator_code: string
  comparison_mode: string
  unit: string
  compliance_status: string
  source_status: string
  trend_status: string
  actual_value: string | number | null
  slo_target_value: string | number
  sla_target_value: string | number
  breach_threshold: string | number | null
  warning_threshold: string | number | null
  delta_to_target: string | number | null
  confidence_level: string | null
  source_period_year: number | string | null
  source_period_month: number | string | null
  evidence_json: Record<string, unknown> | null
  evaluated_at: string | Date
}

type SpaceSummaryRow = Record<string, unknown> & {
  service_id: string
  status_rank: number | string
  service_name: string
}

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null

  const parsed = toNumber(value)

  return Number.isFinite(parsed) ? parsed : null
}

const toTimestamp = (value: string | Date): string =>
  value instanceof Date ? value.toISOString() : value

const buildRecordId = (prefix: 'SLD' | 'SLS') => `EO-${prefix}-${randomUUID().slice(0, 8).toUpperCase()}`

const deriveWarningThreshold = (input: UpsertServiceSlaDefinitionInput) => {
  if (input.warningThreshold !== undefined) {
    return input.warningThreshold
  }

  if (input.breachThreshold === null || input.breachThreshold === undefined) {
    return null
  }

  const gap = Math.abs(input.slaTargetValue - input.breachThreshold)
  const delta = gap === 0 ? 0 : Number((gap * 0.1).toFixed(4))

  if (input.comparisonMode === 'at_least') {
    return Number((input.breachThreshold + delta).toFixed(4))
  }

  return Number((input.breachThreshold - delta).toFixed(4))
}

const normalizeDefinition = (row: DefinitionRow): ServiceSlaDefinition => ({
  definitionId: row.definition_id,
  serviceId: row.service_id,
  spaceId: row.space_id,
  indicatorCode: row.indicator_code as ServiceSlaDefinition['indicatorCode'],
  indicatorFormula: row.indicator_formula,
  measurementSource: row.measurement_source,
  comparisonMode: row.comparison_mode as ServiceSlaDefinition['comparisonMode'],
  unit: row.unit as ServiceSlaDefinition['unit'],
  sliLabel: row.sli_label,
  sloTargetValue: toNumber(row.slo_target_value),
  slaTargetValue: toNumber(row.sla_target_value),
  breachThreshold: toNullableNumber(row.breach_threshold),
  warningThreshold: toNullableNumber(row.warning_threshold),
  displayOrder: toNumber(row.display_order),
  active: row.active,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: toTimestamp(row.created_at),
  updatedAt: toTimestamp(row.updated_at)
})

const normalizeSnapshot = (row: SnapshotRow): ServiceSlaComplianceSnapshotRecord => ({
  snapshotId: row.snapshot_id,
  definitionId: row.definition_id,
  serviceId: row.service_id,
  spaceId: row.space_id,
  indicatorCode: row.indicator_code as ServiceSlaComplianceSnapshotRecord['indicatorCode'],
  comparisonMode: row.comparison_mode as ServiceSlaComplianceSnapshotRecord['comparisonMode'],
  unit: row.unit as ServiceSlaComplianceSnapshotRecord['unit'],
  complianceStatus: row.compliance_status as ServiceSlaComplianceSnapshotRecord['complianceStatus'],
  sourceStatus: row.source_status as ServiceSlaComplianceSnapshotRecord['sourceStatus'],
  trendStatus: row.trend_status as ServiceSlaComplianceSnapshotRecord['trendStatus'],
  actualValue: toNullableNumber(row.actual_value),
  sloTargetValue: toNumber(row.slo_target_value),
  slaTargetValue: toNumber(row.sla_target_value),
  breachThreshold: toNullableNumber(row.breach_threshold),
  warningThreshold: toNullableNumber(row.warning_threshold),
  deltaToTarget: toNullableNumber(row.delta_to_target),
  confidenceLevel: row.confidence_level as ServiceSlaComplianceSnapshotRecord['confidenceLevel'],
  sourcePeriodYear: row.source_period_year == null ? null : toNumber(row.source_period_year),
  sourcePeriodMonth: row.source_period_month == null ? null : toNumber(row.source_period_month),
  evidence: row.evidence_json ?? {},
  evaluatedAt: toTimestamp(row.evaluated_at)
})

export class ServiceSlaValidationError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'ServiceSlaValidationError'
    this.statusCode = statusCode
  }
}

export const assertServiceBelongsToSpace = async ({
  serviceId,
  spaceId
}: {
  serviceId: string
  spaceId: string
}) => {
  const rows = await query<ServiceRow>(
    `
      SELECT service_id, space_id, name
      FROM greenhouse_core.services
      WHERE service_id = $1
        AND space_id = $2
        AND active = TRUE
      LIMIT 1
    `,
    [serviceId, spaceId]
  )

  const service = rows[0]

  if (!service) {
    throw new ServiceSlaValidationError(`El servicio '${serviceId}' no pertenece al Space '${spaceId}'.`, 404)
  }

  return service
}

export const listServiceSlaDefinitions = async ({
  serviceId,
  spaceId,
  activeOnly = true
}: {
  serviceId: string
  spaceId: string
  activeOnly?: boolean
}) => {
  await assertServiceBelongsToSpace({ serviceId, spaceId })

  const rows = await query<DefinitionRow>(
    `
      SELECT
        definition_id,
        service_id,
        space_id,
        indicator_code,
        indicator_formula,
        measurement_source,
        comparison_mode,
        unit,
        sli_label,
        slo_target_value,
        sla_target_value,
        breach_threshold,
        warning_threshold,
        display_order,
        active,
        created_by,
        updated_by,
        created_at,
        updated_at
      FROM greenhouse_core.service_sla_definitions
      WHERE service_id = $1
        AND space_id = $2
        AND ($3::boolean = FALSE OR active = TRUE)
      ORDER BY display_order ASC, indicator_code ASC
    `,
    [serviceId, spaceId, activeOnly]
  )

  return rows.map(normalizeDefinition)
}

export const getServiceSlaContext = async ({
  serviceId,
  spaceId
}: {
  serviceId: string
  spaceId: string
}) => {
  const rows = await query<ServiceContextRow>(
    `
      SELECT
        service_id,
        space_id,
        name,
        organization_id,
        notion_project_id
      FROM greenhouse_core.services
      WHERE service_id = $1
        AND space_id = $2
        AND active = TRUE
      LIMIT 1
    `,
    [serviceId, spaceId]
  )

  const service = rows[0]

  if (!service) {
    throw new ServiceSlaValidationError(`El servicio '${serviceId}' no pertenece al Space '${spaceId}'.`, 404)
  }

  return {
    serviceId: service.service_id,
    spaceId: service.space_id,
    serviceName: service.name,
    organizationId: service.organization_id,
    notionProjectId: service.notion_project_id
  }
}

export const upsertServiceSlaDefinition = async ({
  serviceId,
  spaceId,
  actorUserId,
  input
}: {
  serviceId: string
  spaceId: string
  actorUserId: string | null
  input: UpsertServiceSlaDefinitionInput
}) => {
  await assertServiceBelongsToSpace({ serviceId, spaceId })

  if (!input.indicatorFormula.trim()) {
    throw new ServiceSlaValidationError('indicatorFormula es requerido.')
  }

  if (!input.measurementSource.trim()) {
    throw new ServiceSlaValidationError('measurementSource es requerido.')
  }

  const existingRows = await query<DefinitionRow>(
    `
      SELECT
        definition_id,
        service_id,
        space_id,
        indicator_code,
        indicator_formula,
        measurement_source,
        comparison_mode,
        unit,
        sli_label,
        slo_target_value,
        sla_target_value,
        breach_threshold,
        warning_threshold,
        display_order,
        active,
        created_by,
        updated_by,
        created_at,
        updated_at
      FROM greenhouse_core.service_sla_definitions
      WHERE service_id = $1
        AND space_id = $2
        AND (
          ($3::text IS NOT NULL AND definition_id = $3)
          OR indicator_code = $4
        )
      ORDER BY updated_at DESC
      LIMIT 1
    `,
    [serviceId, spaceId, input.definitionId ?? null, input.indicatorCode]
  )

  const existingDefinition = existingRows[0]
  const definitionId = existingDefinition?.definition_id ?? input.definitionId ?? buildRecordId('SLD')
  const warningThreshold = deriveWarningThreshold(input)
  const nextDisplayOrder = input.displayOrder ?? 100

  await withTransaction(async client => {
    await client.query(
      `
        INSERT INTO greenhouse_core.service_sla_definitions (
          definition_id,
          service_id,
          space_id,
          indicator_code,
          indicator_formula,
          measurement_source,
          comparison_mode,
          unit,
          sli_label,
          slo_target_value,
          sla_target_value,
          breach_threshold,
          warning_threshold,
          display_order,
          active,
          created_by,
          updated_by,
          created_at,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14, COALESCE($15, TRUE),
          $16, $16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON CONFLICT (service_id, indicator_code) DO UPDATE SET
          definition_id = greenhouse_core.service_sla_definitions.definition_id,
          indicator_formula = EXCLUDED.indicator_formula,
          measurement_source = EXCLUDED.measurement_source,
          comparison_mode = EXCLUDED.comparison_mode,
          unit = EXCLUDED.unit,
          sli_label = EXCLUDED.sli_label,
          slo_target_value = EXCLUDED.slo_target_value,
          sla_target_value = EXCLUDED.sla_target_value,
          breach_threshold = EXCLUDED.breach_threshold,
          warning_threshold = EXCLUDED.warning_threshold,
          display_order = EXCLUDED.display_order,
          active = EXCLUDED.active,
          updated_by = EXCLUDED.updated_by,
          updated_at = CURRENT_TIMESTAMP
      `,
      [
        definitionId,
        serviceId,
        spaceId,
        input.indicatorCode,
        input.indicatorFormula.trim(),
        input.measurementSource.trim(),
        input.comparisonMode,
        input.unit,
        input.sliLabel?.trim() || null,
        input.sloTargetValue,
        input.slaTargetValue,
        input.breachThreshold ?? null,
        warningThreshold ?? null,
        nextDisplayOrder,
        input.active ?? true,
        actorUserId
      ]
    )

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.serviceSlaDefinition,
        aggregateId: definitionId,
        eventType: existingDefinition ? EVENT_TYPES.serviceSlaDefinitionUpdated : EVENT_TYPES.serviceSlaDefinitionCreated,
        payload: {
          definitionId,
          serviceId,
          spaceId,
          indicatorCode: input.indicatorCode
        }
      },
      client
    )
  })

  const definitions = await listServiceSlaDefinitions({ serviceId, spaceId, activeOnly: false })

  return definitions.find(item => item.definitionId === definitionId) ?? null
}

export const deleteServiceSlaDefinition = async ({
  serviceId,
  spaceId,
  definitionId,
  actorUserId
}: {
  serviceId: string
  spaceId: string
  definitionId: string
  actorUserId: string | null
}) => {
  await assertServiceBelongsToSpace({ serviceId, spaceId })

  await withTransaction(async client => {
    await client.query(
      `
        DELETE FROM greenhouse_core.service_sla_definitions
        WHERE definition_id = $1
          AND service_id = $2
          AND space_id = $3
      `,
      [definitionId, serviceId, spaceId]
    )

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.serviceSlaDefinition,
        aggregateId: definitionId,
        eventType: EVENT_TYPES.serviceSlaDefinitionDeleted,
        payload: {
          definitionId,
          serviceId,
          spaceId,
          actorUserId
        }
      },
      client
    )
  })

  return { deleted: true }
}

export const listServiceSlaComplianceSnapshots = async ({
  serviceId,
  spaceId
}: {
  serviceId: string
  spaceId: string
}) => {
  await assertServiceBelongsToSpace({ serviceId, spaceId })

  const rows = await query<SnapshotRow>(
    `
      SELECT
        snapshot_id,
        definition_id,
        service_id,
        space_id,
        indicator_code,
        comparison_mode,
        unit,
        compliance_status,
        source_status,
        trend_status,
        actual_value,
        slo_target_value,
        sla_target_value,
        breach_threshold,
        warning_threshold,
        delta_to_target,
        confidence_level,
        source_period_year,
        source_period_month,
        evidence_json,
        evaluated_at
      FROM greenhouse_serving.service_sla_compliance_snapshots
      WHERE service_id = $1
        AND space_id = $2
      ORDER BY evaluated_at DESC, indicator_code ASC
    `,
    [serviceId, spaceId]
  )

  return rows.map(normalizeSnapshot)
}

export const replaceServiceSlaComplianceSnapshots = async ({
  serviceId,
  spaceId,
  items
}: {
  serviceId: string
  spaceId: string
  items: ServiceSlaComplianceItem[]
}) => {
  await assertServiceBelongsToSpace({ serviceId, spaceId })

  await withTransaction(async client => {
    await client.query(
      `
        DELETE FROM greenhouse_serving.service_sla_compliance_snapshots
        WHERE service_id = $1
          AND space_id = $2
      `,
      [serviceId, spaceId]
    )

    for (const item of items) {
      await client.query(
        `
          INSERT INTO greenhouse_serving.service_sla_compliance_snapshots (
            snapshot_id,
            definition_id,
            service_id,
            space_id,
            indicator_code,
            comparison_mode,
            unit,
            compliance_status,
            source_status,
            trend_status,
            actual_value,
            slo_target_value,
            sla_target_value,
            breach_threshold,
            warning_threshold,
            delta_to_target,
            confidence_level,
            source_period_year,
            source_period_month,
            evidence_json,
            evaluated_at,
            created_at,
            updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19,
            $20::jsonb, $21, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
        `,
        [
          buildRecordId('SLS'),
          item.definition.definitionId,
          serviceId,
          spaceId,
          item.definition.indicatorCode,
          item.definition.comparisonMode,
          item.definition.unit,
          item.complianceStatus,
          item.sourceStatus,
          item.trendStatus,
          item.actualValue,
          item.definition.sloTargetValue,
          item.definition.slaTargetValue,
          item.definition.breachThreshold,
          item.definition.warningThreshold,
          item.deltaToTarget,
          item.confidenceLevel,
          item.sourcePeriodYear,
          item.sourcePeriodMonth,
          JSON.stringify(item.evidence ?? {}),
          item.evaluatedAt
        ]
      )
    }
  })

  return listServiceSlaComplianceSnapshots({ serviceId, spaceId })
}

export const listServiceSlaStatusesBySpace = async (spaceId: string) => {
  const rows = await query<SpaceSummaryRow>(
    `
      WITH latest_status AS (
        SELECT
          s.service_id,
          s.name AS service_name,
          MIN(
            CASE snap.compliance_status
              WHEN 'breached' THEN 0
              WHEN 'at_risk' THEN 1
              WHEN 'source_unavailable' THEN 2
              WHEN 'met' THEN 3
              ELSE 4
            END
          ) AS status_rank
        FROM greenhouse_core.services s
        LEFT JOIN greenhouse_serving.service_sla_compliance_snapshots snap
          ON snap.service_id = s.service_id
         AND snap.space_id = s.space_id
        WHERE s.space_id = $1
          AND s.active = TRUE
        GROUP BY s.service_id, s.name
      )
      SELECT service_id, service_name, status_rank
      FROM latest_status
      ORDER BY service_name ASC
    `,
    [spaceId]
  )

  return rows.map(row => ({
    serviceId: row.service_id,
    serviceName: row.service_name,
    overallStatus:
      toNumber(row.status_rank) === 0
        ? 'breached'
        : toNumber(row.status_rank) === 1
          ? 'at_risk'
          : toNumber(row.status_rank) === 2
            ? 'partial'
            : toNumber(row.status_rank) === 3
              ? 'healthy'
              : 'no_sla_defined'
  }))
}
