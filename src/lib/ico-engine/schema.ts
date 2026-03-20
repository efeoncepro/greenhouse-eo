import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'

// ─── Constants ──────────────────────────────────────────────────────────────

const ICO_DATASET = 'ico_engine'
const CONFORMED_DATASET = 'greenhouse_conformed'

const ENGINE_VERSION = 'v1.0.0'

// ─── DDL Statements ─────────────────────────────────────────────────────────

const buildDatasetDDL = (projectId: string) =>
  `CREATE SCHEMA IF NOT EXISTS \`${projectId}.${ICO_DATASET}\``

/**
 * View layered on greenhouse_conformed.delivery_tasks — adds derived fields:
 *   fase_csc, cycle_time_days, hours_since_update, is_stuck, delivery_signal
 *
 * Column names are English (from the conformed layer) but task_status VALUES
 * remain in Spanish as synced from Notion.
 */
const buildTasksEnrichedView = (projectId: string) => `
  CREATE OR REPLACE VIEW \`${projectId}.${ICO_DATASET}.v_tasks_enriched\` AS
  SELECT
    dt.task_source_id,
    dt.project_source_id,
    dt.sprint_source_id,
    dt.space_id,
    dt.client_id,
    dt.module_code,
    dt.module_id,
    dt.task_name,
    dt.task_status,
    dt.assignee_member_id,
    IF(dt.assignee_member_ids IS NOT NULL AND ARRAY_LENGTH(dt.assignee_member_ids) > 0,
       dt.assignee_member_ids,
       IF(dt.assignee_member_id IS NOT NULL, [dt.assignee_member_id], [])
    ) AS assignee_member_ids,
    dt.completion_label,
    dt.delivery_compliance,
    dt.days_late,
    dt.is_rescheduled,
    dt.client_change_round_final,
    dt.rpa_value,
    dt.open_frame_comments,
    dt.client_review_open,
    dt.workflow_review_open,
    dt.blocker_count,
    dt.due_date,
    dt.completed_at,
    dt.last_edited_time,
    dt.synced_at,
    dt.created_at,

    -- Derived: CSC phase (configurable per space via status_phase_config, fallback to hardcoded CASE)
    COALESCE(spc.fase_csc,
      CASE
        WHEN dt.task_status IN ('Sin empezar', 'Backlog', 'Pendiente', 'Listo para diseñar')
          THEN 'briefing'
        WHEN dt.task_status IN ('En curso', 'En Curso')
          THEN 'produccion'
        WHEN dt.task_status LIKE 'Listo para revis%'
          THEN 'revision_interna'
        WHEN dt.task_status = 'Cambios Solicitados'
          THEN 'cambios_cliente'
        WHEN dt.task_status IN ('Listo', 'Done', 'Finalizado', 'Completado')
          THEN 'entrega'
        ELSE 'otros'
      END
    ) AS fase_csc,

    -- Derived: Cycle time (days from creation to completion or now)
    DATE_DIFF(
      COALESCE(DATE(dt.completed_at), CURRENT_DATE()),
      COALESCE(DATE(dt.created_at), DATE(dt.synced_at)),
      DAY
    ) AS cycle_time_days,

    -- Derived: Hours since last edit
    TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), dt.last_edited_time, HOUR) AS hours_since_update,

    -- Derived: Is stuck (no movement in 72+ hours while in an active state)
    (
      dt.task_status NOT IN (
        'Listo', 'Done', 'Finalizado', 'Completado',
        'Archivadas', 'Archivada', 'Cancelada', 'Canceled', 'Cancelled',
        'Sin empezar', 'Backlog', 'Pendiente'
      )
      AND dt.last_edited_time IS NOT NULL
      AND TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), dt.last_edited_time, HOUR) >= 72
    ) AS is_stuck,

    -- Derived: Delivery signal (on_time / late / unknown)
    CASE
      WHEN dt.completed_at IS NOT NULL AND dt.due_date IS NOT NULL
        AND DATE(dt.completed_at) <= dt.due_date THEN 'on_time'
      WHEN dt.completed_at IS NOT NULL AND dt.due_date IS NOT NULL
        AND DATE(dt.completed_at) > dt.due_date THEN 'late'
      ELSE 'unknown'
    END AS delivery_signal

  FROM \`${projectId}.${CONFORMED_DATASET}.delivery_tasks\` dt
  LEFT JOIN \`${projectId}.${ICO_DATASET}.status_phase_config\` spc
    ON spc.space_id = dt.space_id AND spc.task_status = dt.task_status
  WHERE dt.is_deleted = FALSE
    AND dt.task_status NOT IN ('Archivadas', 'Archivada', 'Cancelada', 'Canceled', 'Cancelled')
`

/**
 * Materialized table for monthly metric snapshots per space.
 * Populated by a scheduled query (external to this app) or on-demand compute.
 * No DEFAULT clauses (BigQuery constraint).
 */
const buildMonthlySnapshotTable = (projectId: string) => `
  CREATE TABLE IF NOT EXISTS \`${projectId}.${ICO_DATASET}.metric_snapshots_monthly\` (
    snapshot_id STRING NOT NULL,
    space_id STRING NOT NULL,
    client_id STRING,
    period_year INT64 NOT NULL,
    period_month INT64 NOT NULL,
    rpa_avg FLOAT64,
    otd_pct FLOAT64,
    ftr_pct FLOAT64,
    cycle_time_avg_days FLOAT64,
    cycle_time_p50_days FLOAT64,
    cycle_time_variance FLOAT64,
    throughput_count INT64,
    pipeline_velocity FLOAT64,
    stuck_asset_count INT64,
    stuck_asset_pct FLOAT64,
    csc_distribution STRING,
    total_tasks INT64,
    completed_tasks INT64,
    active_tasks INT64,
    computed_at TIMESTAMP,
    engine_version STRING
  )
  PARTITION BY RANGE_BUCKET(period_year, GENERATE_ARRAY(2024, 2030, 1))
  CLUSTER BY space_id, period_month
`

/**
 * Convenience view returning the latest snapshot per space (most recent period).
 */
const buildLatestMetricsView = (projectId: string) => `
  CREATE OR REPLACE VIEW \`${projectId}.${ICO_DATASET}.v_metric_latest\` AS
  SELECT ms.*
  FROM \`${projectId}.${ICO_DATASET}.metric_snapshots_monthly\` ms
  INNER JOIN (
    SELECT space_id, MAX(period_year * 100 + period_month) AS max_period
    FROM \`${projectId}.${ICO_DATASET}.metric_snapshots_monthly\`
    GROUP BY space_id
  ) latest
    ON ms.space_id = latest.space_id
    AND (ms.period_year * 100 + ms.period_month) = latest.max_period
`

/**
 * AI metric scores — empty table for future AI agents to write to (spec §12.5.9).
 * Partitioned by processed_at date, clustered by metric_id + task_id.
 */
const buildAiMetricScoresTable = (projectId: string) => `
  CREATE TABLE IF NOT EXISTS \`${projectId}.${ICO_DATASET}.ai_metric_scores\` (
    id STRING NOT NULL,
    task_id STRING NOT NULL,
    metric_id STRING NOT NULL,
    score FLOAT64,
    passed BOOL,
    breakdown STRING,
    reasoning STRING,
    model STRING,
    prompt_version STRING,
    prompt_hash STRING,
    confidence FLOAT64,
    tokens_used INT64,
    latency_ms INT64,
    input_snapshot_url STRING,
    space_id STRING,
    project_id STRING,
    processed_at TIMESTAMP,
    _synced_at TIMESTAMP
  )
  PARTITION BY DATE(processed_at)
  CLUSTER BY metric_id, task_id
`

/**
 * Detail table for stuck assets (spec §5.5). Full-refreshed daily by materialization.
 * 72h threshold aligns with v_tasks_enriched.is_stuck definition.
 */
const buildStuckAssetsDetailTable = (projectId: string) => `
  CREATE TABLE IF NOT EXISTS \`${projectId}.${ICO_DATASET}.stuck_assets_detail\` (
    task_source_id STRING NOT NULL,
    task_name STRING,
    space_id STRING NOT NULL,
    project_source_id STRING,
    fase_csc STRING,
    hours_since_update FLOAT64,
    days_since_update FLOAT64,
    severity STRING,
    rpa_value FLOAT64,
    client_review_open BOOL,
    materialized_at TIMESTAMP
  )
  CLUSTER BY space_id, severity
`

/**
 * RPA trend by space and month (spec §5.6). Full-refreshed daily.
 * Stores last 12 months of aggregated RPA data for trend charts.
 */
const buildRpaTrendTable = (projectId: string) => `
  CREATE TABLE IF NOT EXISTS \`${projectId}.${ICO_DATASET}.rpa_trend\` (
    space_id STRING NOT NULL,
    period_year INT64 NOT NULL,
    period_month INT64 NOT NULL,
    rpa_avg FLOAT64,
    rpa_median FLOAT64,
    tasks_completed INT64,
    materialized_at TIMESTAMP
  )
  CLUSTER BY space_id
`

/**
 * Project-level metrics (spec §5.2). Materialized monthly alongside space snapshots.
 */
const buildMetricsByProjectTable = (projectId: string) => `
  CREATE TABLE IF NOT EXISTS \`${projectId}.${ICO_DATASET}.metrics_by_project\` (
    project_source_id STRING NOT NULL,
    space_id STRING NOT NULL,
    period_year INT64 NOT NULL,
    period_month INT64 NOT NULL,
    rpa_avg FLOAT64,
    rpa_median FLOAT64,
    otd_pct FLOAT64,
    ftr_pct FLOAT64,
    cycle_time_avg_days FLOAT64,
    cycle_time_p50_days FLOAT64,
    cycle_time_variance FLOAT64,
    throughput_count INT64,
    pipeline_velocity FLOAT64,
    stuck_asset_count INT64,
    stuck_asset_pct FLOAT64,
    total_tasks INT64,
    completed_tasks INT64,
    active_tasks INT64,
    materialized_at TIMESTAMP
  )
  CLUSTER BY space_id, project_source_id
`

/**
 * Member-level metrics. Same structure as metrics_by_project but keyed by member_id.
 * Uses UNNEST(assignee_member_ids) to credit tasks to all assignees.
 */
const buildMetricsByMemberTable = (projectId: string) => `
  CREATE TABLE IF NOT EXISTS \`${projectId}.${ICO_DATASET}.metrics_by_member\` (
    member_id STRING NOT NULL,
    period_year INT64 NOT NULL,
    period_month INT64 NOT NULL,
    rpa_avg FLOAT64,
    rpa_median FLOAT64,
    otd_pct FLOAT64,
    ftr_pct FLOAT64,
    cycle_time_avg_days FLOAT64,
    cycle_time_p50_days FLOAT64,
    cycle_time_variance FLOAT64,
    throughput_count INT64,
    pipeline_velocity FLOAT64,
    stuck_asset_count INT64,
    stuck_asset_pct FLOAT64,
    total_tasks INT64,
    completed_tasks INT64,
    active_tasks INT64,
    materialized_at TIMESTAMP
  )
  CLUSTER BY member_id
`

/**
 * Configurable mapping of task_status → CSC phase per space.
 * Used by v_tasks_enriched via LEFT JOIN — unmapped statuses fall back to the
 * hardcoded CASE (Efeonce defaults).
 */
const buildStatusPhaseConfigTable = (projectId: string) => `
  CREATE TABLE IF NOT EXISTS \`${projectId}.${ICO_DATASET}.status_phase_config\` (
    space_id STRING NOT NULL,
    task_status STRING NOT NULL,
    fase_csc STRING NOT NULL
  )
`

type TableColumnSpec = Record<string, string>

const REQUIRED_COLUMN_MIGRATIONS: Record<string, TableColumnSpec> = {
  metric_snapshots_monthly: {
    pipeline_velocity: 'FLOAT64',
    stuck_asset_pct: 'FLOAT64',
    total_tasks: 'INT64',
    completed_tasks: 'INT64',
    active_tasks: 'INT64',
    computed_at: 'TIMESTAMP',
    engine_version: 'STRING'
  },
  metrics_by_project: {
    otd_pct: 'FLOAT64',
    throughput_count: 'INT64',
    pipeline_velocity: 'FLOAT64',
    stuck_asset_count: 'INT64',
    stuck_asset_pct: 'FLOAT64',
    total_tasks: 'INT64',
    completed_tasks: 'INT64',
    active_tasks: 'INT64'
  },
  metrics_by_member: {
    otd_pct: 'FLOAT64',
    throughput_count: 'INT64',
    pipeline_velocity: 'FLOAT64',
    stuck_asset_count: 'INT64',
    stuck_asset_pct: 'FLOAT64',
    total_tasks: 'INT64',
    completed_tasks: 'INT64',
    active_tasks: 'INT64'
  }
}

// ─── Infrastructure Provisioning (Singleton Promise) ────────────────────────

let ensureIcoEngineInfrastructurePromise: Promise<void> | null = null

export { ENGINE_VERSION, ICO_DATASET }

export const ensureIcoEngineInfrastructure = async () => {
  if (ensureIcoEngineInfrastructurePromise) {
    return ensureIcoEngineInfrastructurePromise
  }

  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  ensureIcoEngineInfrastructurePromise = (async () => {
    // All infrastructure steps are wrapped in try/catch to be resilient.
    // The service account may lack CREATE permissions — tables/views are
    // pre-created via admin CLI. If any step fails, log and continue.

    // 1. Ensure dataset exists
    try {
      await bigQuery.query({ query: buildDatasetDDL(projectId) })
    } catch {
      // Dataset may already exist or service account lacks datasets.create — safe to continue
    }

    // 2. Check which tables exist and create missing ones
    try {
      const [tableRows] = await bigQuery.query({
        query: `
          SELECT table_name
          FROM \`${projectId}.${ICO_DATASET}.INFORMATION_SCHEMA.TABLES\`
          WHERE table_name IN (
            'metric_snapshots_monthly', 'ai_metric_scores',
            'stuck_assets_detail', 'rpa_trend', 'metrics_by_project',
            'metrics_by_member', 'status_phase_config'
          )
        `
      })

      const existingTables = new Set(
        (tableRows as Array<{ table_name: string }>).map(r => r.table_name)
      )

      const tableBuilders: Array<[string, string]> = [
        ['metric_snapshots_monthly', buildMonthlySnapshotTable(projectId)],
        ['ai_metric_scores', buildAiMetricScoresTable(projectId)],
        ['stuck_assets_detail', buildStuckAssetsDetailTable(projectId)],
        ['rpa_trend', buildRpaTrendTable(projectId)],
        ['metrics_by_project', buildMetricsByProjectTable(projectId)],
        ['metrics_by_member', buildMetricsByMemberTable(projectId)],
        ['status_phase_config', buildStatusPhaseConfigTable(projectId)]
      ]

      for (const [tableName, ddl] of tableBuilders) {
        if (!existingTables.has(tableName)) {
          try {
            await bigQuery.query({ query: ddl })
          } catch (tableError) {
            console.warn(`[ICO] Could not create table ${tableName}:`, tableError instanceof Error ? tableError.message : tableError)
          }
        }
      }
    } catch (schemaCheckError) {
      console.warn('[ICO] Could not check INFORMATION_SCHEMA:', schemaCheckError instanceof Error ? schemaCheckError.message : schemaCheckError)
    }

    // 3. Apply additive schema migrations for existing tables.
    try {
      const tablesToInspect = Object.keys(REQUIRED_COLUMN_MIGRATIONS)

      const [columnRows] = await bigQuery.query({
        query: `
          SELECT table_name, column_name
          FROM \`${projectId}.${ICO_DATASET}.INFORMATION_SCHEMA.COLUMNS\`
          WHERE table_name IN UNNEST(@tables)
        `,
        params: { tables: tablesToInspect }
      })

      const existingColumns = new Map<string, Set<string>>()

      for (const row of columnRows as Array<{ table_name: string; column_name: string }>) {
        if (!existingColumns.has(row.table_name)) {
          existingColumns.set(row.table_name, new Set())
        }

        existingColumns.get(row.table_name)!.add(row.column_name)
      }

      for (const [tableName, requiredColumns] of Object.entries(REQUIRED_COLUMN_MIGRATIONS)) {
        const presentColumns = existingColumns.get(tableName) ?? new Set<string>()

        const missingDefinitions = Object.entries(requiredColumns)
          .filter(([columnName]) => !presentColumns.has(columnName))
          .map(([columnName, dataType]) => `ADD COLUMN IF NOT EXISTS ${columnName} ${dataType}`)

        if (missingDefinitions.length === 0) {
          continue
        }

        try {
          await bigQuery.query({
            query: `
              ALTER TABLE \`${projectId}.${ICO_DATASET}.${tableName}\`
              ${missingDefinitions.join(',\n              ')}
            `
          })
        } catch (migrationError) {
          console.warn('[ICO] Could not apply column migration:', migrationError instanceof Error ? migrationError.message : migrationError)
        }
      }
    } catch (migrationDiscoveryError) {
      console.warn('[ICO] Could not inspect existing columns:', migrationDiscoveryError instanceof Error ? migrationDiscoveryError.message : migrationDiscoveryError)
    }

    // 4. Create or replace views (idempotent)
    try {
      await bigQuery.query({ query: buildTasksEnrichedView(projectId) })
    } catch (viewError) {
      console.warn('[ICO] Could not create v_tasks_enriched:', viewError instanceof Error ? viewError.message : viewError)
    }

    try {
      await bigQuery.query({ query: buildLatestMetricsView(projectId) })
    } catch (viewError) {
      console.warn('[ICO] Could not create v_metric_latest:', viewError instanceof Error ? viewError.message : viewError)
    }
  })()

  // Never reset the promise — if infra fails, queries against pre-created
  // tables will still work. Resetting would cause repeated retry storms.
  return ensureIcoEngineInfrastructurePromise
}
