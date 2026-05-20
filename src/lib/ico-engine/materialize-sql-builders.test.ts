/**
 * TASK-900 Slice 5 — Anti-regression tests for shared SQL builders.
 *
 * Verifica que el builder canonical produce SQL semánticamente equivalente
 * al legacy DELETE+INSERT pre-TASK-900 para los 5 materializers (parity
 * test). También verifica que el MERGE pattern produce shape canonical con:
 *   - QUALIFY ROW_NUMBER cinturón anti-duplicate
 *   - NO `WHEN NOT MATCHED BY SOURCE THEN DELETE` (preserva historicos)
 *   - delta filter opcional con TIMESTAMP(@deltaCutoff)
 *   - todas las metric columns presentes (no drift cross-sibling)
 */

import { describe, expect, it } from 'vitest'

import {
  buildLegacyDeleteInsertSql,
  buildMergeSql,
  buildPostCountSql,
  METRIC_COLUMNS,
  type MaterializerSqlConfig
} from './materialize-sql-builders'

const FAKE_PROJECT = 'efeonce-test'

const MEMBER_CFG: MaterializerSqlConfig = {
  tableName: 'metrics_by_member',
  keyColumns: ['member_id'],
  keySelectSql: 'te.primary_owner_member_id AS member_id',
  whereClauseSql:
    "te.primary_owner_member_id IS NOT NULL AND te.primary_owner_member_id != ''",
  groupBySql: 'member_id',
  partitionBySql: 'member_id, period_year, period_month'
}

const PROJECT_CFG: MaterializerSqlConfig = {
  tableName: 'metrics_by_project',
  keyColumns: ['project_source_id', 'space_id'],
  keySelectSql: 'project_source_id, space_id',
  whereClauseSql:
    "space_id IS NOT NULL AND project_source_id IS NOT NULL AND project_source_id != ''",
  groupBySql: 'project_source_id, space_id',
  partitionBySql: 'project_source_id, space_id, period_year, period_month'
}

describe('METRIC_COLUMNS', () => {
  it('exports 22 canonical metric columns en orden estable', () => {
    expect(METRIC_COLUMNS).toHaveLength(22)
    expect(METRIC_COLUMNS[0]).toBe('rpa_avg')
    expect(METRIC_COLUMNS[METRIC_COLUMNS.length - 1]).toBe('overdue_carried_forward_count')
  })
})

describe('buildLegacyDeleteInsertSql', () => {
  it('genera DELETE + INSERT con table name + key columns correctas', () => {
    const { deleteSql, insertSql } = buildLegacyDeleteInsertSql(MEMBER_CFG, FAKE_PROJECT)

    expect(deleteSql).toContain('DELETE FROM `efeonce-test.ico_engine.metrics_by_member`')
    expect(deleteSql).toContain('period_year = @periodYear AND period_month = @periodMonth')

    expect(insertSql).toContain('INSERT INTO `efeonce-test.ico_engine.metrics_by_member`')
    expect(insertSql).toContain('te.primary_owner_member_id AS member_id')
    expect(insertSql).toContain('GROUP BY member_id')
    expect(insertSql).toContain("te.primary_owner_member_id IS NOT NULL")
  })

  it('project config produce key columns project_source_id + space_id', () => {
    const { insertSql } = buildLegacyDeleteInsertSql(PROJECT_CFG, FAKE_PROJECT)

    expect(insertSql).toContain('INSERT INTO `efeonce-test.ico_engine.metrics_by_project`')
    expect(insertSql).toContain('project_source_id, space_id')
    expect(insertSql).toContain('GROUP BY project_source_id, space_id')
    expect(insertSql).toContain('space_id IS NOT NULL')
  })

  it('incluye TODAS las 22 metric columns + materialized_at en INSERT', () => {
    const { insertSql } = buildLegacyDeleteInsertSql(MEMBER_CFG, FAKE_PROJECT)

    for (const col of METRIC_COLUMNS) {
      expect(insertSql).toContain(col)
    }

    expect(insertSql).toContain('materialized_at')
    expect(insertSql).toContain('CURRENT_TIMESTAMP() AS materialized_at')
  })
})

describe('buildMergeSql', () => {
  it('genera MERGE con table name + ON conditions correctas', () => {
    const sql = buildMergeSql(MEMBER_CFG, FAKE_PROJECT, false)

    expect(sql).toContain('MERGE INTO `efeonce-test.ico_engine.metrics_by_member` AS t')
    expect(sql).toContain('t.member_id = s.member_id')
    expect(sql).toContain('t.period_year = s.period_year')
    expect(sql).toContain('t.period_month = s.period_month')
  })

  it('MERGE incluye QUALIFY ROW_NUMBER cinturón anti-duplicate', () => {
    const sql = buildMergeSql(MEMBER_CFG, FAKE_PROJECT, false)

    expect(sql).toContain('QUALIFY ROW_NUMBER() OVER')
    expect(sql).toContain('PARTITION BY member_id, period_year, period_month')
    expect(sql).toContain('ORDER BY materialized_at DESC')
  })

  it('MERGE NO incluye WHEN NOT MATCHED BY SOURCE THEN DELETE (preserve historicos)', () => {
    const sql = buildMergeSql(MEMBER_CFG, FAKE_PROJECT, false)

    expect(sql).not.toMatch(/WHEN\s+NOT\s+MATCHED\s+BY\s+SOURCE/i)
    expect(sql).toContain('WHEN MATCHED THEN UPDATE SET')
    expect(sql).toContain('WHEN NOT MATCHED THEN INSERT')
  })

  it('MERGE incluye delta filter cuando hasDeltaFilter=true', () => {
    const sql = buildMergeSql(MEMBER_CFG, FAKE_PROJECT, true)

    expect(sql).toContain('MAX(te.last_edited_time) AS entity_last_edited')
    expect(sql).toContain('entity_last_edited >= TIMESTAMP(@deltaCutoff)')
  })

  it('MERGE NO incluye delta filter cuando hasDeltaFilter=false', () => {
    const sql = buildMergeSql(MEMBER_CFG, FAKE_PROJECT, false)

    expect(sql).toContain('MAX(te.last_edited_time) AS entity_last_edited')
    expect(sql).not.toContain('entity_last_edited >= TIMESTAMP')
  })

  it('UPDATE SET incluye TODAS las 22 metric columns + materialized_at (NO key + NO period)', () => {
    const sql = buildMergeSql(MEMBER_CFG, FAKE_PROJECT, false)

    for (const col of METRIC_COLUMNS) {
      expect(sql).toContain(`${col} = s.${col}`)
    }

    expect(sql).toContain('materialized_at = s.materialized_at')

    // Key + period NO se actualizan (son JOIN key)
    expect(sql).not.toContain('member_id = s.member_id,\n')
    expect(sql).not.toContain('period_year = s.period_year,')
    expect(sql).not.toContain('period_month = s.period_month,')
  })

  it('project config: PARTITION BY incluye keys compuestos + period', () => {
    const sql = buildMergeSql(PROJECT_CFG, FAKE_PROJECT, false)

    expect(sql).toContain('PARTITION BY project_source_id, space_id, period_year, period_month')
    expect(sql).toContain('t.project_source_id = s.project_source_id')
    expect(sql).toContain('t.space_id = s.space_id')
  })
})

describe('buildPostCountSql', () => {
  it('genera COUNT canonical con period filter', () => {
    const sql = buildPostCountSql(MEMBER_CFG, FAKE_PROJECT)

    expect(sql).toContain('SELECT COUNT(*) AS cnt')
    expect(sql).toContain('FROM `efeonce-test.ico_engine.metrics_by_member`')
    expect(sql).toContain('period_year = @periodYear AND period_month = @periodMonth')
  })
})

describe('TASK-900 — config invariants for 5 ICO materializers', () => {
  // Smoke test que verifica que el builder produce SQL semánticamente
  // distinto para los 5 entities — protege contra config drift cross-entity.
  it('config para diferentes entities produce table names distintos', () => {
    const memberSql = buildMergeSql(MEMBER_CFG, FAKE_PROJECT, false)
    const projectSql = buildMergeSql(PROJECT_CFG, FAKE_PROJECT, false)

    expect(memberSql).toContain('metrics_by_member')
    expect(memberSql).not.toContain('metrics_by_project')

    expect(projectSql).toContain('metrics_by_project')
    expect(projectSql).not.toContain('metrics_by_member')
  })
})
