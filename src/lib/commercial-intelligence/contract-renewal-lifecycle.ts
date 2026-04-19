import 'server-only'

import { query, withTransaction } from '@/lib/db'
import { publishContractRenewalDue } from '@/lib/commercial/contract-events'
import { completeContract } from '@/lib/commercial/contract-lifecycle'

import { RENEWAL_CADENCE_DAYS, RENEWAL_LOOKAHEAD_DAYS } from './contracts'

interface SweepRow extends Record<string, unknown> {
  contract_id: string
  contract_number: string
  client_id: string | null
  organization_id: string | null
  space_id: string | null
  status: string
  commercial_model: string | null
  staffing_model: string | null
  auto_renewal: boolean | null
  tcv_clp: string | number | null
  end_date: string | Date | null
  originator_quote_id: string | null
}

interface ReminderStateRow extends Record<string, unknown> {
  contract_id: string
  last_reminder_at: string | Date | null
  reminder_count: number | null
}

const toIsoDate = (value: string | Date | null): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return String(value).slice(0, 10)
}

const daysBetween = (fromIso: string, toIso: string): number => {
  const from = new Date(fromIso)
  const to = new Date(toIso)
  const msPerDay = 24 * 60 * 60 * 1000

  return Math.round((to.getTime() - from.getTime()) / msPerDay)
}

export interface ContractRenewalSweepResult {
  completedCount: number
  renewalDueCount: number
  contractsProcessed: number
}

export const runContractLifecycleSweep = async ({
  now = new Date()
}: {
  now?: Date
} = {}): Promise<ContractRenewalSweepResult> => {
  const todayIso = now.toISOString().slice(0, 10)

  const candidates = await query<SweepRow>(
    `SELECT contract_id, contract_number, client_id, organization_id, space_id,
            status, commercial_model, staffing_model, auto_renewal, tcv_clp,
            end_date, originator_quote_id
       FROM greenhouse_commercial.contracts
      WHERE status IN ('active', 'paused', 'renewed')
        AND end_date IS NOT NULL`
  )

  let completedCount = 0
  let renewalDueCount = 0

  for (const row of candidates) {
    const endDate = toIsoDate(row.end_date)

    if (!endDate) continue

    const days = daysBetween(todayIso, endDate)

    if (days < 0) {
      if (!row.auto_renewal) {
        await completeContract({ contractId: String(row.contract_id) })
        completedCount++
      }

      continue
    }

    if (row.auto_renewal) continue
    if (days > RENEWAL_LOOKAHEAD_DAYS) continue

    const reminderRows = await query<ReminderStateRow>(
      `SELECT contract_id, last_reminder_at, reminder_count
         FROM greenhouse_commercial.contract_renewal_reminders
        WHERE contract_id = $1
        LIMIT 1`,
      [row.contract_id]
    )

    const reminder = reminderRows[0] ?? null
    const lastReminder = reminder?.last_reminder_at ? new Date(String(reminder.last_reminder_at)) : null

    const daysSinceLast = lastReminder
      ? Math.round((now.getTime() - lastReminder.getTime()) / (24 * 60 * 60 * 1000))
      : Number.POSITIVE_INFINITY

    if (daysSinceLast < RENEWAL_CADENCE_DAYS) continue

    await withTransaction(async client => {
      await publishContractRenewalDue(
        {
          contractId: String(row.contract_id),
          contractNumber: String(row.contract_number),
          clientId: row.client_id ? String(row.client_id) : null,
          organizationId: row.organization_id ? String(row.organization_id) : null,
          spaceId: row.space_id ? String(row.space_id) : null,
          status: String(row.status),
          commercialModel: row.commercial_model ? String(row.commercial_model) : null,
          staffingModel: row.staffing_model ? String(row.staffing_model) : null,
          originatorQuoteId: row.originator_quote_id ? String(row.originator_quote_id) : null,
          endDate,
          daysUntilExpiry: days,
          autoRenewal: Boolean(row.auto_renewal)
        },
        client
      )

      await client.query(
        `INSERT INTO greenhouse_commercial.contract_renewal_reminders (
           contract_id, last_reminder_at, reminder_count, next_check_at, last_event_type
         ) VALUES ($1, NOW(), 1, NOW() + INTERVAL '${RENEWAL_CADENCE_DAYS} days', 'renewal_due')
         ON CONFLICT (contract_id) DO UPDATE SET
           last_reminder_at = NOW(),
           reminder_count = greenhouse_commercial.contract_renewal_reminders.reminder_count + 1,
           next_check_at = NOW() + INTERVAL '${RENEWAL_CADENCE_DAYS} days',
           last_event_type = 'renewal_due',
           updated_at = NOW()`,
        [row.contract_id]
      )
    })

    renewalDueCount++
  }

  return {
    completedCount,
    renewalDueCount,
    contractsProcessed: candidates.length
  }
}
