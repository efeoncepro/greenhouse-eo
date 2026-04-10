import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { query, withTransaction } from '@/lib/db'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import type { ReportingLineRecord, UpsertReportingLineInput } from '@/lib/reporting-hierarchy/types'
import {
  assertMemberExists,
  normalizeReportingReason,
  normalizeReportingSourceSystem,
  normalizeSourceMetadata,
  normalizeTimestampInput
} from '@/lib/reporting-hierarchy/shared'

type CurrentReportingLineRow = {
  reporting_line_id: string
  member_id: string
  supervisor_member_id: string | null
  effective_from: string
}

type ReportingLineRow = {
  reporting_line_id: string
  member_id: string
  member_name: string | null
  member_active: boolean
  supervisor_member_id: string | null
  supervisor_name: string | null
  supervisor_active: boolean | null
  effective_from: string
  effective_to: string | null
  source_system: string
  source_metadata: Record<string, unknown> | null
  change_reason: string
  changed_by_user_id: string | null
}

const queryRows = async <T extends Record<string, unknown>>(text: string, values: unknown[] = [], client?: PoolClient) => {
  if (client) {
    const result = await client.query<T>(text, values)

    return result.rows
  }

  return query<T>(text, values)
}

const mapReportingLine = (row: ReportingLineRow): ReportingLineRecord => ({
  reportingLineId: row.reporting_line_id,
  memberId: row.member_id,
  memberName: row.member_name,
  memberActive: Boolean(row.member_active),
  supervisorMemberId: row.supervisor_member_id,
  supervisorName: row.supervisor_name,
  supervisorActive: row.supervisor_active == null ? null : Boolean(row.supervisor_active),
  effectiveFrom: row.effective_from,
  effectiveTo: row.effective_to,
  sourceSystem: row.source_system,
  sourceMetadata: row.source_metadata ?? {},
  changeReason: row.change_reason,
  changedByUserId: row.changed_by_user_id
})

const getCurrentReportingLineForUpdate = async (
  memberId: string,
  client: PoolClient
): Promise<CurrentReportingLineRow | null> => {
  const rows = await queryRows<CurrentReportingLineRow>(
    `
      SELECT
        reporting_line_id,
        member_id,
        supervisor_member_id,
        effective_from
      FROM greenhouse_core.reporting_lines
      WHERE member_id = $1
        AND effective_to IS NULL
      ORDER BY effective_from DESC
      LIMIT 1
      FOR UPDATE
    `,
    [memberId],
    client
  )

  return rows[0] ?? null
}

const assertNoReportingCycle = async ({
  memberId,
  supervisorMemberId,
  client
}: {
  memberId: string
  supervisorMemberId: string
  client: PoolClient
}) => {
  const rows = await queryRows<{ member_id: string }>(
    `
      WITH RECURSIVE subtree AS (
        SELECT
          rl.member_id
        FROM greenhouse_core.reporting_lines AS rl
        WHERE rl.member_id = $1
          AND rl.effective_to IS NULL

        UNION ALL

        SELECT
          child.member_id
        FROM greenhouse_core.reporting_lines AS child
        INNER JOIN subtree
          ON child.supervisor_member_id = subtree.member_id
        WHERE child.effective_to IS NULL
      )
      SELECT member_id
      FROM subtree
      WHERE member_id = $2
      LIMIT 1
    `,
    [memberId, supervisorMemberId],
    client
  )

  if (rows.length > 0) {
    throw new Error('Invalid reporting line: the selected supervisor is already inside the member subtree.')
  }
}

const assertReportingLineChangeAllowedInTransaction = async ({
  memberId,
  supervisorMemberId,
  client
}: {
  memberId: string
  supervisorMemberId: string | null
  client: PoolClient
}) => {
  const normalizedMemberId = String(memberId || '').trim()
  const normalizedSupervisorMemberId = supervisorMemberId ? String(supervisorMemberId).trim() : null

  if (!normalizedMemberId) {
    throw new Error('memberId is required.')
  }

  if (normalizedSupervisorMemberId && normalizedMemberId === normalizedSupervisorMemberId) {
    throw new Error('A member cannot report to itself.')
  }

  await assertMemberExists(normalizedMemberId, client)

  if (normalizedSupervisorMemberId) {
    await assertMemberExists(normalizedSupervisorMemberId, client)
    await assertNoReportingCycle({
      memberId: normalizedMemberId,
      supervisorMemberId: normalizedSupervisorMemberId,
      client
    })
  }
}

export const assertReportingLineChangeAllowed = async ({
  memberId,
  supervisorMemberId
}: {
  memberId: string
  supervisorMemberId: string | null
}) =>
  withTransaction(async client =>
    assertReportingLineChangeAllowedInTransaction({
      memberId,
      supervisorMemberId,
      client
    })
  )

const reloadReportingLine = async (
  memberId: string,
  client: PoolClient
): Promise<ReportingLineRecord> => {
  const rows = await queryRows<ReportingLineRow>(
    `
      SELECT
        rl.reporting_line_id,
        rl.member_id,
        member_ref.display_name AS member_name,
        member_ref.active AS member_active,
        rl.supervisor_member_id,
        supervisor_ref.display_name AS supervisor_name,
        supervisor_ref.active AS supervisor_active,
        rl.effective_from,
        rl.effective_to,
        rl.source_system,
        rl.source_metadata,
        rl.change_reason,
        rl.changed_by_user_id
      FROM greenhouse_core.reporting_lines AS rl
      INNER JOIN greenhouse_core.members AS member_ref
        ON member_ref.member_id = rl.member_id
      LEFT JOIN greenhouse_core.members AS supervisor_ref
        ON supervisor_ref.member_id = rl.supervisor_member_id
      WHERE rl.member_id = $1
        AND rl.effective_to IS NULL
      ORDER BY rl.effective_from DESC
      LIMIT 1
    `,
    [memberId],
    client
  )

  const row = rows[0]

  if (!row) {
    throw new Error(`Current reporting line for member '${memberId}' could not be reloaded.`)
  }

  return mapReportingLine(row)
}

export const upsertReportingLine = async (input: UpsertReportingLineInput): Promise<ReportingLineRecord> => {
  const memberId = String(input.memberId || '').trim()
  const supervisorMemberId = input.supervisorMemberId ? String(input.supervisorMemberId).trim() : null
  const actorUserId = input.actorUserId ? String(input.actorUserId).trim() : null
  const effectiveFrom = normalizeTimestampInput(input.effectiveFrom)
  const sourceSystem = normalizeReportingSourceSystem(input.sourceSystem)
  const changeReason = normalizeReportingReason(input.reason)
  const sourceMetadata = normalizeSourceMetadata(input.sourceMetadata)

  if (!memberId) {
    throw new Error('memberId is required.')
  }

  if (supervisorMemberId && memberId === supervisorMemberId) {
    throw new Error('A member cannot report to itself.')
  }

  return withTransaction(async client => {
    await assertReportingLineChangeAllowedInTransaction({ memberId, supervisorMemberId, client })

    const currentLine = await getCurrentReportingLineForUpdate(memberId, client)

    if (currentLine?.supervisor_member_id === supervisorMemberId) {
      return reloadReportingLine(memberId, client)
    }

    if (currentLine) {
      const currentEffectiveFrom = new Date(currentLine.effective_from)
      const nextEffectiveFrom = new Date(effectiveFrom)

      if (nextEffectiveFrom <= currentEffectiveFrom) {
        throw new Error('effectiveFrom must be later than the current active reporting line.')
      }

      await queryRows(
        `
          UPDATE greenhouse_core.reporting_lines
          SET
            effective_to = $2::timestamptz,
            updated_at = CURRENT_TIMESTAMP
          WHERE reporting_line_id = $1
        `,
        [currentLine.reporting_line_id, effectiveFrom],
        client
      )
    }

    const reportingLineId = `rpt-${randomUUID()}`

    await queryRows(
      `
        INSERT INTO greenhouse_core.reporting_lines (
          reporting_line_id,
          member_id,
          supervisor_member_id,
          effective_from,
          source_system,
          source_metadata,
          change_reason,
          changed_by_user_id
        )
        VALUES ($1, $2, $3, $4::timestamptz, $5, $6::jsonb, $7, $8)
      `,
      [
        reportingLineId,
        memberId,
        supervisorMemberId,
        effectiveFrom,
        sourceSystem,
        JSON.stringify(sourceMetadata),
        changeReason,
        actorUserId
      ],
      client
    )

    await queryRows(
      `
        UPDATE greenhouse_core.members
        SET
          reports_to_member_id = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE member_id = $1
      `,
      [memberId, supervisorMemberId],
      client
    )

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.reportingHierarchy,
        aggregateId: memberId,
        eventType: EVENT_TYPES.reportingHierarchyUpdated,
        payload: {
          memberId,
          reportingLineId,
          previousSupervisorMemberId: currentLine?.supervisor_member_id ?? null,
          supervisorMemberId,
          changedByUserId: actorUserId,
          changeReason,
          sourceSystem,
          sourceMetadata
        }
      },
      client
    )

    return reloadReportingLine(memberId, client)
  })
}

export const clearReportingLine = async (
  input: Omit<UpsertReportingLineInput, 'supervisorMemberId'>
): Promise<ReportingLineRecord> =>
  upsertReportingLine({
    ...input,
    supervisorMemberId: null
  })
