import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { query, withTransaction } from '@/lib/db'
import { HrCoreValidationError } from '@/lib/hr-core/shared'
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

type ReportingLineWindowRow = {
  reporting_line_id: string
  member_id: string
  supervisor_member_id: string | null
  effective_from: string
  effective_to: string | null
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

const getReportingLineHistoryForUpdate = async (
  memberId: string,
  client: PoolClient
): Promise<ReportingLineWindowRow[]> => {
  const rows = await queryRows<ReportingLineWindowRow>(
    `
      SELECT
        reporting_line_id,
        member_id,
        supervisor_member_id,
        effective_from,
        effective_to
      FROM greenhouse_core.reporting_lines
      WHERE member_id = $1
      ORDER BY effective_from ASC, created_at ASC, reporting_line_id ASC
      FOR UPDATE
    `,
    [memberId],
    client
  )

  return rows
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
    throw new HrCoreValidationError('Invalid reporting line: the selected supervisor is already inside the member subtree.', 409)
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
    throw new HrCoreValidationError('memberId is required.')
  }

  if (normalizedSupervisorMemberId && normalizedMemberId === normalizedSupervisorMemberId) {
    throw new HrCoreValidationError('A member cannot report to itself.', 409)
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

const reloadReportingLineAt = async (
  memberId: string,
  referenceTimestamp: string,
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
        AND rl.effective_from <= $2::timestamptz
        AND (rl.effective_to IS NULL OR rl.effective_to > $2::timestamptz)
      ORDER BY rl.effective_from DESC
      LIMIT 1
    `,
    [memberId, referenceTimestamp],
    client
  )

  const row = rows[0]

  if (!row) {
    throw new HrCoreValidationError(`Current reporting line for member '${memberId}' could not be reloaded.`, 500)
  }

  return mapReportingLine(row)
}

const findReportingLineAt = (rows: ReportingLineWindowRow[], effectiveFrom: Date) =>
  rows.find(row => {
    const start = new Date(row.effective_from)
    const end = row.effective_to ? new Date(row.effective_to) : null

    return start <= effectiveFrom && (end == null || end > effectiveFrom)
  }) ?? null

const findNextScheduledReportingLine = (rows: ReportingLineWindowRow[], effectiveFrom: Date) =>
  rows.find(row => new Date(row.effective_from) > effectiveFrom) ?? null

export const upsertReportingLineInTransaction = async (
  input: UpsertReportingLineInput,
  client: PoolClient
): Promise<ReportingLineRecord> => {
  const memberId = String(input.memberId || '').trim()
  const supervisorMemberId = input.supervisorMemberId ? String(input.supervisorMemberId).trim() : null
  const actorUserId = input.actorUserId ? String(input.actorUserId).trim() : null
  const effectiveFrom = normalizeTimestampInput(input.effectiveFrom)
  const sourceSystem = normalizeReportingSourceSystem(input.sourceSystem)
  const changeReason = normalizeReportingReason(input.reason)
  const sourceMetadata = normalizeSourceMetadata(input.sourceMetadata)
  const effectiveFromDate = new Date(effectiveFrom)
  const nowIso = new Date().toISOString()
  const nowDate = new Date(nowIso)

  if (!memberId) {
    throw new HrCoreValidationError('memberId is required.')
  }

  if (supervisorMemberId && memberId === supervisorMemberId) {
    throw new HrCoreValidationError('A member cannot report to itself.', 409)
  }

  await assertReportingLineChangeAllowedInTransaction({ memberId, supervisorMemberId, client })

  const historyRows = await getReportingLineHistoryForUpdate(memberId, client)
  const activeLineNow = findReportingLineAt(historyRows, nowDate)
  const activeLineAtTarget = findReportingLineAt(historyRows, effectiveFromDate)
  const nextScheduledLine = findNextScheduledReportingLine(historyRows, effectiveFromDate)

  if (activeLineNow) {
    const activeNowEffectiveFrom = new Date(activeLineNow.effective_from)

    if (effectiveFromDate < activeNowEffectiveFrom) {
      throw new HrCoreValidationError('effectiveFrom must be later than the current active reporting line.', 409)
    }
  }

  if (activeLineAtTarget?.supervisor_member_id === supervisorMemberId) {
    return reloadReportingLineAt(memberId, effectiveFrom, client)
  }

  let reportingLineId = `rpt-${randomUUID()}`

  if (activeLineAtTarget && effectiveFromDate.getTime() === new Date(activeLineAtTarget.effective_from).getTime()) {
    await queryRows(
      `
        UPDATE greenhouse_core.reporting_lines
        SET
          supervisor_member_id = $2,
          source_system = $3,
          source_metadata = $4::jsonb,
          change_reason = $5,
          changed_by_user_id = $6,
          updated_at = CURRENT_TIMESTAMP
        WHERE reporting_line_id = $1
      `,
      [
        activeLineAtTarget.reporting_line_id,
        supervisorMemberId,
        sourceSystem,
        JSON.stringify(sourceMetadata),
        changeReason,
        actorUserId
      ],
      client
    )
    reportingLineId = activeLineAtTarget.reporting_line_id
  } else if (nextScheduledLine && nextScheduledLine.supervisor_member_id === supervisorMemberId) {
    if (activeLineAtTarget) {
      await queryRows(
        `
          UPDATE greenhouse_core.reporting_lines
          SET
            effective_to = $2::timestamptz,
            updated_at = CURRENT_TIMESTAMP
          WHERE reporting_line_id = $1
        `,
        [activeLineAtTarget.reporting_line_id, effectiveFrom],
        client
      )
    }

    await queryRows(
      `
        UPDATE greenhouse_core.reporting_lines
        SET
          effective_from = $2::timestamptz,
          source_system = $3,
          source_metadata = $4::jsonb,
          change_reason = $5,
          changed_by_user_id = $6,
          updated_at = CURRENT_TIMESTAMP
        WHERE reporting_line_id = $1
      `,
      [
        nextScheduledLine.reporting_line_id,
        effectiveFrom,
        sourceSystem,
        JSON.stringify(sourceMetadata),
        changeReason,
        actorUserId
      ],
      client
    )

    reportingLineId = nextScheduledLine.reporting_line_id
  } else {
    if (activeLineAtTarget) {
      await queryRows(
        `
          UPDATE greenhouse_core.reporting_lines
          SET
            effective_to = $2::timestamptz,
            updated_at = CURRENT_TIMESTAMP
          WHERE reporting_line_id = $1
        `,
        [activeLineAtTarget.reporting_line_id, effectiveFrom],
        client
      )
    }

    await queryRows(
      `
        INSERT INTO greenhouse_core.reporting_lines (
          reporting_line_id,
          member_id,
          supervisor_member_id,
          effective_from,
          effective_to,
          source_system,
          source_metadata,
          change_reason,
          changed_by_user_id
        )
        VALUES ($1, $2, $3, $4::timestamptz, $5::timestamptz, $6, $7::jsonb, $8, $9)
      `,
      [
        reportingLineId,
        memberId,
        supervisorMemberId,
        effectiveFrom,
        nextScheduledLine?.effective_from ?? null,
        sourceSystem,
        JSON.stringify(sourceMetadata),
        changeReason,
        actorUserId
      ],
      client
    )
  }

  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.reportingHierarchy,
      aggregateId: memberId,
      eventType: EVENT_TYPES.reportingHierarchyUpdated,
      payload: {
        memberId,
        reportingLineId,
        previousSupervisorMemberId: activeLineAtTarget?.supervisor_member_id ?? activeLineNow?.supervisor_member_id ?? null,
        supervisorMemberId,
        changedByUserId: actorUserId,
        changeReason,
        sourceSystem,
        sourceMetadata
      }
    },
    client
  )

  return reloadReportingLineAt(memberId, effectiveFrom, client)
}

export const upsertReportingLine = async (input: UpsertReportingLineInput): Promise<ReportingLineRecord> =>
  withTransaction(client => upsertReportingLineInTransaction(input, client))

export const clearReportingLine = async (
  input: Omit<UpsertReportingLineInput, 'supervisorMemberId'>
): Promise<ReportingLineRecord> =>
  upsertReportingLine({
    ...input,
    supervisorMemberId: null
  })
