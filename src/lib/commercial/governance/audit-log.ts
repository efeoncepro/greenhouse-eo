import 'server-only'

import { query } from '@/lib/db'

import type { AuditAction, QuotationAuditEntry } from './contracts'

export interface QueryableClient {
  query: (text: string, values?: unknown[]) => Promise<unknown>
}

interface RecordAuditParams {
  quotationId: string
  versionNumber?: number | null
  action: AuditAction
  actorUserId: string
  actorName: string
  details?: Record<string, unknown>
}

export const recordAudit = async (
  params: RecordAuditParams,
  client?: QueryableClient
): Promise<void> => {
  const sql = `INSERT INTO greenhouse_commercial.quotation_audit_log (
       quotation_id, version_number, action, actor_user_id, actor_name, details
     ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)`

  const values: unknown[] = [
    params.quotationId,
    params.versionNumber ?? null,
    params.action,
    params.actorUserId,
    params.actorName,
    JSON.stringify(params.details ?? {})
  ]

  if (client) {
    await client.query(sql, values)

    return
  }

  await query(sql, values)
}

interface ListAuditParams {
  quotationId: string
  limit?: number
  actions?: AuditAction[]
}

interface AuditRow extends Record<string, unknown> {
  log_id: string
  quotation_id: string
  version_number: number | null
  action: string
  actor_user_id: string
  actor_name: string
  details: unknown
  created_at: string | Date
}

const toDetails = (value: unknown): Record<string, unknown> => {
  if (!value) return {}

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)

      return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {}
    } catch {
      return {}
    }
  }

  if (typeof value === 'object') {
    return value as Record<string, unknown>
  }

  return {}
}

const toIso = (value: string | Date): string => {
  if (value instanceof Date) return value.toISOString()

  return value
}

export const listQuotationAudit = async (
  params: ListAuditParams
): Promise<QuotationAuditEntry[]> => {
  const conditions: string[] = ['quotation_id = $1']
  const values: unknown[] = [params.quotationId]
  let idx = 1

  if (params.actions && params.actions.length > 0) {
    idx += 1
    conditions.push(`action = ANY($${idx}::text[])`)
    values.push(params.actions)
  }

  const limit = Math.min(500, Math.max(1, params.limit ?? 200))

  const rows = await query<AuditRow>(
    `SELECT log_id, quotation_id, version_number, action,
            actor_user_id, actor_name, details, created_at
       FROM greenhouse_commercial.quotation_audit_log
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT ${limit}`,
    values
  )

  return rows.map(row => ({
    logId: row.log_id,
    quotationId: row.quotation_id,
    versionNumber: row.version_number,
    action: row.action as AuditAction,
    actorUserId: row.actor_user_id,
    actorName: row.actor_name,
    details: toDetails(row.details),
    createdAt: toIso(row.created_at)
  }))
}
