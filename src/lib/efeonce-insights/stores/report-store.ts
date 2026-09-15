import 'server-only'

import type { InsightActor } from '../contracts/states'
import { InsightsInputError } from '../errors'
import { type InsightsDbClient, runInsightsQuery, toIso } from './db'
import type { InsightReportRecord } from './records'

interface ReportRow extends Record<string, unknown> {
  report_id: string
  report_code: string
  organization_id: string
  purpose: string
  title: string
  status: 'active' | 'archived'
  created_by_actor_kind: InsightReportRecord['createdByActorKind']
  created_by_user_id: string | null
  created_by_member_id: string | null
  created_at: Date | string
  updated_at: Date | string
}

const REPORT_COLUMNS = `report_id, report_code, organization_id, purpose, title, status,
  created_by_actor_kind, created_by_user_id, created_by_member_id, created_at, updated_at`

const mapReport = (row: ReportRow): InsightReportRecord => ({
  reportId: row.report_id,
  reportCode: row.report_code,
  organizationId: row.organization_id,
  purpose: row.purpose,
  title: row.title,
  status: row.status,
  createdByActorKind: row.created_by_actor_kind,
  createdByUserId: row.created_by_user_id,
  createdByMemberId: row.created_by_member_id,
  createdAt: toIso(row.created_at) ?? '',
  updatedAt: toIso(row.updated_at) ?? ''
})

export interface CreateInsightReportInput {
  organizationId: string
  title: string
  purpose: string
  actor: InsightActor
}

/** El código legible lo asigna la DB (`next_insight_report_code()`): unicidad atómica, sin MAX+1. */
export const insertInsightReport = async (
  client: InsightsDbClient | undefined,
  input: CreateInsightReportInput
): Promise<InsightReportRecord> => {
  if (input.title.trim().length < 3) throw new InsightsInputError('title debe tener al menos 3 caracteres')
  if (input.purpose.trim().length < 3) throw new InsightsInputError('purpose debe tener al menos 3 caracteres')

  const rows = await runInsightsQuery<ReportRow>(
    client,
    `INSERT INTO greenhouse_insights.insight_reports
       (organization_id, purpose, title, created_by_actor_kind, created_by_user_id, created_by_member_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${REPORT_COLUMNS}`,
    [input.organizationId, input.purpose.trim(), input.title.trim(), input.actor.kind, input.actor.userId, input.actor.memberId]
  )

  return mapReport(rows[0]!)
}

/** Lock del aggregate para asignar versiones de edición sin carreras (dentro de una tx). */
export const lockInsightReport = async (
  client: InsightsDbClient,
  organizationId: string,
  reportId: string
): Promise<InsightReportRecord | null> => {
  const rows = await runInsightsQuery<ReportRow>(
    client,
    `SELECT ${REPORT_COLUMNS} FROM greenhouse_insights.insight_reports
      WHERE organization_id = $1 AND report_id = $2 FOR UPDATE`,
    [organizationId, reportId]
  )

  return rows[0] ? mapReport(rows[0]) : null
}

export const getInsightReportById = async (
  client: InsightsDbClient | undefined,
  organizationId: string,
  reportId: string
): Promise<InsightReportRecord | null> => {
  const rows = await runInsightsQuery<ReportRow>(
    client,
    `SELECT ${REPORT_COLUMNS} FROM greenhouse_insights.insight_reports WHERE organization_id = $1 AND report_id = $2`,
    [organizationId, reportId]
  )

  return rows[0] ? mapReport(rows[0]) : null
}

export const getInsightReportByCode = async (
  client: InsightsDbClient | undefined,
  organizationId: string,
  reportCode: string
): Promise<InsightReportRecord | null> => {
  const rows = await runInsightsQuery<ReportRow>(
    client,
    `SELECT ${REPORT_COLUMNS} FROM greenhouse_insights.insight_reports WHERE organization_id = $1 AND report_code = $2`,
    [organizationId, reportCode]
  )

  return rows[0] ? mapReport(rows[0]) : null
}

export interface ListInsightReportsInput {
  organizationId: string
  status?: 'active' | 'archived'
  limit: number
  offset: number
}

export const listInsightReports = async (
  client: InsightsDbClient | undefined,
  input: ListInsightReportsInput
): Promise<{ items: InsightReportRecord[]; total: number }> => {
  const limit = Math.min(Math.max(1, Math.floor(input.limit)), 200)
  const offset = Math.max(0, Math.floor(input.offset))
  const where = `organization_id = $1 AND ($2::text IS NULL OR status = $2)`
  const params = [input.organizationId, input.status ?? null]

  const [rows, totals] = await Promise.all([
    runInsightsQuery<ReportRow>(
      client,
      `SELECT ${REPORT_COLUMNS} FROM greenhouse_insights.insight_reports
        WHERE ${where}
        ORDER BY created_at DESC, report_id COLLATE "C" DESC
        LIMIT $3 OFFSET $4`,
      [...params, limit, offset]
    ),
    runInsightsQuery<{ total: number | string }>(
      client,
      `SELECT count(*)::int AS total FROM greenhouse_insights.insight_reports WHERE ${where}`,
      params
    )
  ])

  return { items: rows.map(mapReport), total: Number(totals[0]?.total ?? 0) }
}
