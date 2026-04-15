import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'
import { getActiveReopenAuditForPeriod } from '@/lib/payroll/reopen-period'
import { PayrollValidationError, toNumber } from '@/lib/payroll/shared'
import { pgUpsertPayrollEntry } from '@/lib/payroll/postgres-store'
import type { PayrollEntry } from '@/types/payroll'

// TASK-410 — Supersede helper for reliquidation recalculation.
//
// When a payroll period is in state `reopened`, calling recalculate on one
// of its entries MUST NOT mutate the v1 row in place. Instead we:
//
//   1. Look up the currently active row for (period_id, member_id).
//   2. If it's v1 (version = 1), insert a new v2 row with the new values
//      AND mark v1 as is_active = false / superseded_by = v2.entry_id.
//      Emit `payroll_entry.reliquidated` so Finance applies the delta.
//   3. If it's already v2 (subsequent edits during the reopened window),
//      UPDATE v2 in place with the new values. Still emit
//      `payroll_entry.reliquidated` with the delta vs. v2's previous state
//      so the finance consumer keeps the running total consistent.
//
// The whole flow runs inside a single transaction so the partial unique
// index `payroll_entries_period_member_active_unique` never observes two
// active rows for the same (period, member).

interface SupersedePayrollEntryInput {
  updatedEntry: PayrollEntry
  actorUserId: string
}

interface ActiveRowSnapshot {
  entry_id: string
  version: number
  gross_total: string | number
  net_total: string | number
}

const selectActiveRow = async (
  client: PoolClient,
  periodId: string,
  memberId: string
): Promise<ActiveRowSnapshot> => {
  const { rows } = await client.query<ActiveRowSnapshot>(
    `
      SELECT entry_id, version, gross_total, net_total
      FROM greenhouse_payroll.payroll_entries
      WHERE period_id = $1
        AND member_id = $2
        AND is_active = TRUE
      LIMIT 1
    `,
    [periodId, memberId]
  )

  const row = rows[0]

  if (!row) {
    throw new PayrollValidationError(
      `No active payroll entry found for period ${periodId} and member ${memberId}.`,
      404
    )
  }

  return row
}

const parsePeriodParts = (periodId: string) => {
  const [yearStr, monthStr] = periodId.split('-')
  const year = Number.parseInt(yearStr ?? '', 10)
  const month = Number.parseInt(monthStr ?? '', 10)

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    throw new PayrollValidationError(`Invalid periodId format: ${periodId}`, 400)
  }

  return { year, month }
}

/**
 * Creates or updates the v2 entry for a reopened period.
 * Returns the persisted entry_id of the currently active version.
 */
export const supersedePayrollEntryOnRecalculate = async ({
  updatedEntry,
  actorUserId
}: SupersedePayrollEntryInput): Promise<{ entryId: string; version: number; deltaNet: number; deltaGross: number }> => {
  if (!actorUserId?.trim()) {
    throw new PayrollValidationError('Supersede requires an authenticated actor user id.', 401)
  }

  const audit = await getActiveReopenAuditForPeriod(updatedEntry.periodId)

  if (!audit) {
    throw new PayrollValidationError(
      `Cannot supersede entry: period ${updatedEntry.periodId} has no active reopen audit row.`,
      409
    )
  }

  const { year: operationalYear, month: operationalMonth } = parsePeriodParts(updatedEntry.periodId)

  return withTransaction(async client => {
    const activeRow = await selectActiveRow(client, updatedEntry.periodId, updatedEntry.memberId)
    const previousEntryId = activeRow.entry_id
    const previousGross = toNumber(activeRow.gross_total)
    const previousNet = toNumber(activeRow.net_total)

    if (activeRow.version >= 2) {
      // Case B: v2 already exists. Update it in place with new values.
      // The supersede event carries delta vs. the currently stored v2, so
      // Finance accumulates a running adjustment as the operator iterates.
      const entryForUpdate: PayrollEntry = {
        ...updatedEntry,
        entryId: previousEntryId
      }

      await pgUpsertPayrollEntry(entryForUpdate, {
        client,
        supersede: {
          version: activeRow.version,
          isActive: true,
          reopenAuditId: audit.audit_id,
          previousEntryId,
          previousGrossTotal: previousGross,
          previousNetTotal: previousNet,
          deltaGross: updatedEntry.grossTotal - previousGross,
          deltaNet: updatedEntry.netTotal - previousNet,
          auditReason: audit.reason,
          operationalYear,
          operationalMonth
        }
      })

      return {
        entryId: previousEntryId,
        version: activeRow.version,
        deltaGross: updatedEntry.grossTotal - previousGross,
        deltaNet: updatedEntry.netTotal - previousNet
      }
    }

    // Case A: first supersession. We need to create a new v2 row.
    //
    // Transaction ordering is non-trivial because two constraints interact:
    //
    //   1. Partial unique index `payroll_entries_period_member_active_unique`
    //      forbids two rows with `is_active = TRUE` for the same
    //      (period_id, member_id). v1 MUST be marked inactive before v2 is
    //      inserted as active.
    //
    //   2. Foreign key `payroll_entries_superseded_by_fkey` is checked
    //      immediately (it is not DEFERRABLE). We CANNOT set
    //      v1.superseded_by = v2.entry_id before v2 exists — the FK
    //      validation fails with `23503` and the whole transaction rolls
    //      back with `Unable to calculate payroll.`
    //
    // Correct sequence (three statements, respects both constraints):
    //
    //   Step 1: UPDATE v1 SET is_active = FALSE
    //           → partial unique index is now free for v2
    //           → superseded_by stays NULL (valid FK — null allowed)
    //
    //   Step 2: INSERT v2 with is_active = TRUE and reopen_audit_id
    //           → partial unique index OK because v1 is inactive
    //           → v2.entry_id now exists in the table
    //
    //   Step 3: UPDATE v1 SET superseded_by = v2.entry_id
    //           → FK OK because v2 exists
    //           → chain is complete
    //
    const newEntryId = `payroll-entry-${randomUUID()}`

    // Step 1 — free the partial unique index without touching superseded_by.
    await client.query(
      `
        UPDATE greenhouse_payroll.payroll_entries
        SET is_active = FALSE,
            updated_at = CURRENT_TIMESTAMP
        WHERE entry_id = $1
      `,
      [previousEntryId]
    )

    const entryForInsert: PayrollEntry = {
      ...updatedEntry,
      entryId: newEntryId
    }

    // Step 2 — insert v2 as the new active row. pgUpsertPayrollEntry writes
    // version / is_active / reopen_audit_id via the supersede options path.
    await pgUpsertPayrollEntry(entryForInsert, {
      client,
      supersede: {
        version: 2,
        isActive: true,
        reopenAuditId: audit.audit_id,
        previousEntryId,
        previousGrossTotal: previousGross,
        previousNetTotal: previousNet,
        deltaGross: updatedEntry.grossTotal - previousGross,
        deltaNet: updatedEntry.netTotal - previousNet,
        auditReason: audit.reason,
        operationalYear,
        operationalMonth
      }
    })

    // Step 3 — link v1 to its successor. Safe now because v2 exists.
    await client.query(
      `
        UPDATE greenhouse_payroll.payroll_entries
        SET superseded_by = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE entry_id = $1
      `,
      [previousEntryId, newEntryId]
    )

    return {
      entryId: newEntryId,
      version: 2,
      deltaGross: updatedEntry.grossTotal - previousGross,
      deltaNet: updatedEntry.netTotal - previousNet
    }
  })
}
