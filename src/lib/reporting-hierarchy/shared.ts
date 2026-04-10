import 'server-only'

import type { PoolClient } from 'pg'

import { query } from '@/lib/db'

type MemberExistenceRow = {
  member_id: string
  display_name: string | null
}

const queryRows = async <T extends Record<string, unknown>>(text: string, values: unknown[] = [], client?: PoolClient) => {
  if (client) {
    const result = await client.query<T>(text, values)

    return result.rows
  }

  return query<T>(text, values)
}

export const DEFAULT_REPORTING_SOURCE_SYSTEM = 'greenhouse_manual'
export const DEFAULT_REPORTING_REASON = 'unspecified'

export const normalizeTimestampInput = (value?: string | null): string => {
  if (!value) {
    return new Date().toISOString()
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid effectiveFrom timestamp.')
  }

  return date.toISOString()
}

export const normalizeReportingReason = (value?: string | null): string => {
  const normalized = String(value || '').trim()

  return normalized || DEFAULT_REPORTING_REASON
}

export const normalizeReportingSourceSystem = (value?: string | null): string => {
  const normalized = String(value || '').trim()

  return normalized || DEFAULT_REPORTING_SOURCE_SYSTEM
}

export const normalizeSourceMetadata = (value?: Record<string, unknown> | null): Record<string, unknown> =>
  value && typeof value === 'object' ? value : {}

export const assertMemberExists = async (
  memberId: string,
  client?: PoolClient
): Promise<MemberExistenceRow> => {
  const rows = await queryRows<MemberExistenceRow>(
    `
      SELECT
        member_id,
        display_name
      FROM greenhouse_core.members
      WHERE member_id = $1
      LIMIT 1
    `,
    [memberId],
    client
  )

  const row = rows[0]

  if (!row) {
    throw new Error(`Member '${memberId}' not found.`)
  }

  return row
}
