import 'server-only'

import { ICO_DATASET } from './schema'
import { buildDeliveryPeriodSourceSql, buildMetricSelectSQL } from './shared'

/**
 * TASK-900 Slice 5 — Shared SQL builders para los 5 materializers ICO.
 *
 * Cada materializer (member/project/sprint/organization/business_unit) tiene
 * forma idéntica salvo:
 *   - target table name (metrics_by_<entity>)
 *   - key columns (entity_id, opcionalmente space_id)
 *   - SELECT key expressions (e.g. te.primary_owner_member_id AS member_id)
 *   - WHERE filter (entity NOT NULL + space si aplica)
 *   - GROUP BY
 *
 * Estas funciones generan el SQL canonical para legacy DELETE+INSERT y MERGE
 * pattern (con QUALIFY ROW_NUMBER cinturón + delta filter opcional Slice 4).
 *
 * `buildMetricSelectSQL()` (de shared.ts) produce los 23 metric expressions
 * idénticos para los 5 materializers. Su forma es load-bearing: cualquier
 * cambio ahí afecta los 5 materializers (intencional — un solo source of
 * truth de los KPIs).
 */

export interface MaterializerSqlConfig {
  /** Nombre BQ de la target table — e.g. 'metrics_by_member'. */
  tableName: string

  /**
   * Columnas de la tabla target en orden canonical (incluye key cols + 23
   * metric cols + materialized_at). NO incluye period_year/period_month que
   * son inyectados por el SELECT.
   *
   * Forma canonical para member: ['member_id'] + metrics + [materialized_at]
   * Forma canonical para project: ['project_source_id', 'space_id'] + metrics + [materialized_at]
   */
  keyColumns: string[]

  /**
   * SELECT expressions para las key columns en el source aggregate.
   * E.g. para member: 'te.primary_owner_member_id AS member_id'
   *      para project: 'project_source_id,\n      space_id'
   */
  keySelectSql: string

  /**
   * WHERE clause adicional para filtrar source rows. NO incluye AND inicial.
   * E.g. para member: "te.primary_owner_member_id IS NOT NULL AND te.primary_owner_member_id != ''"
   *      para project: "space_id IS NOT NULL AND project_source_id IS NOT NULL AND project_source_id != ''"
   */
  whereClauseSql: string

  /**
   * GROUP BY expression. E.g. 'member_id' o 'project_source_id, space_id'.
   * Las period columns son inyectadas vía @periodYear/@periodMonth, no
   * agrupadas.
   */
  groupBySql: string

  /**
   * PARTITION BY para el QUALIFY ROW_NUMBER cinturón anti-duplicates.
   * E.g. 'member_id, period_year, period_month' o
   *      'project_source_id, space_id, period_year, period_month'.
   */
  partitionBySql: string
}

/** Lista canonical de metric columns (orden importa para INSERT/MERGE). */
export const METRIC_COLUMNS = [
  'rpa_avg',
  'rpa_median',
  'rpa_eligible_task_count',
  'rpa_missing_task_count',
  'rpa_non_positive_task_count',
  'otd_pct',
  'ftr_pct',
  'cycle_time_avg_days',
  'cycle_time_p50_days',
  'cycle_time_variance',
  'throughput_count',
  'pipeline_velocity',
  'stuck_asset_count',
  'stuck_asset_pct',
  'total_tasks',
  'completed_tasks',
  'active_tasks',
  'on_time_count',
  'late_drop_count',
  'overdue_count',
  'carry_over_count',
  'overdue_carried_forward_count'
]

/**
 * Genera el SQL legacy DELETE-then-INSERT (idempotente full-period).
 * Mantiene paridad bit-for-bit con el patrón pre-TASK-900.
 */
export const buildLegacyDeleteInsertSql = (
  cfg: MaterializerSqlConfig,
  projectId: string
): { deleteSql: string; insertSql: string } => {
  const allColumns = [
    ...cfg.keyColumns,
    'period_year',
    'period_month',
    ...METRIC_COLUMNS,
    'materialized_at'
  ]

  const deleteSql = `
    DELETE FROM \`${projectId}.${ICO_DATASET}.${cfg.tableName}\`
    WHERE period_year = @periodYear AND period_month = @periodMonth
  `

  const insertSql = `
    INSERT INTO \`${projectId}.${ICO_DATASET}.${cfg.tableName}\`
      (${allColumns.join(', ')})
    SELECT
      ${cfg.keySelectSql},
      @periodYear AS period_year,
      @periodMonth AS period_month,

      ${buildMetricSelectSQL()},

      CURRENT_TIMESTAMP() AS materialized_at

    FROM ${buildDeliveryPeriodSourceSql(projectId)} te
    WHERE ${cfg.whereClauseSql}
    GROUP BY ${cfg.groupBySql}
  `

  return { deleteSql, insertSql }
}

/**
 * Genera el SQL MERGE atomic (con QUALIFY anti-duplicate + delta filter
 * opcional Slice 4). Cuando `deltaCutoffIso=null`, procesa full period.
 *
 * Crítico: NO incluye `WHEN NOT MATCHED BY SOURCE THEN DELETE` — preserva
 * historicos buenos cuando upstream parcial (cierra bug class TASK-877).
 *
 * Filtra a nivel BUCKET (entity touched), NO a nivel TASK. Inner aggregate
 * computa `MAX(te.last_edited_time) AS entity_last_edited` y outer WHERE
 * filtra `entity_last_edited >= TIMESTAMP(@deltaCutoff)`.
 */
export const buildMergeSql = (
  cfg: MaterializerSqlConfig,
  projectId: string,
  hasDeltaFilter: boolean
): string => {
  const allColumns = [
    ...cfg.keyColumns,
    'period_year',
    'period_month',
    ...METRIC_COLUMNS,
    'materialized_at'
  ]

  // ON clause: t.<key> = s.<key> para cada key + period
  const onConditions = [...cfg.keyColumns, 'period_year', 'period_month']
    .map(col => `t.${col} = s.${col}`)
    .join('\n    AND ')

  // UPDATE SET: solo metric columns + materialized_at (NO key + NO period)
  const updateSetSql = [...METRIC_COLUMNS, 'materialized_at']
    .map(col => `${col} = s.${col}`)
    .join(',\n      ')

  const insertColumnsSql = allColumns.join(', ')
  const insertValuesSql = allColumns.map(col => `s.${col}`).join(', ')

  const deltaFilterSql = hasDeltaFilter
    ? `WHERE entity_last_edited >= TIMESTAMP(@deltaCutoff)`
    : ''

  return `
    MERGE INTO \`${projectId}.${ICO_DATASET}.${cfg.tableName}\` AS t
    USING (
      SELECT
        ${[...cfg.keyColumns, 'period_year', 'period_month'].join(', ')},
        ${METRIC_COLUMNS.join(', ')},
        materialized_at
      FROM (
        SELECT
          ${cfg.keySelectSql},
          @periodYear AS period_year,
          @periodMonth AS period_month,

          ${buildMetricSelectSQL()},

          MAX(te.last_edited_time) AS entity_last_edited,
          CURRENT_TIMESTAMP() AS materialized_at
        FROM ${buildDeliveryPeriodSourceSql(projectId)} te
        WHERE ${cfg.whereClauseSql}
        GROUP BY ${cfg.groupBySql}
      )
      ${deltaFilterSql}
      QUALIFY ROW_NUMBER() OVER (
        PARTITION BY ${cfg.partitionBySql}
        ORDER BY materialized_at DESC
      ) = 1
    ) AS s
    ON ${onConditions}
    WHEN MATCHED THEN UPDATE SET
      ${updateSetSql}
    WHEN NOT MATCHED THEN INSERT
      (${insertColumnsSql})
    VALUES
      (${insertValuesSql})
  `
}

/**
 * Genera el SQL canonical de COUNT post-materialization. Mismo para legacy
 * + merge (counts current period rows).
 */
export const buildPostCountSql = (
  cfg: MaterializerSqlConfig,
  projectId: string
): string => `
  SELECT COUNT(*) AS cnt
  FROM \`${projectId}.${ICO_DATASET}.${cfg.tableName}\`
  WHERE period_year = @periodYear AND period_month = @periodMonth
`
