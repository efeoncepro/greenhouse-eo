import 'server-only'

import { query, withTransaction } from '@/lib/db'
import { recordAudit } from '@/lib/commercial/governance/audit-log'
import {
  publishQuotationExpired,
  publishQuotationRenewalDue
} from '@/lib/commercial/quotation-events'

import { RENEWAL_CADENCE_DAYS, RENEWAL_LOOKAHEAD_DAYS } from './contracts'

interface SweepRow extends Record<string, unknown> {
  quotation_id: string
  client_id: string | null
  organization_id: string | null
  status: string
  pricing_model: string | null
  commercial_model: string | null
  staffing_model: string | null
  total_amount_clp: string | number | null
  expiry_date: string | Date | null
  converted_at: string | Date | null
}

interface ReminderStateRow extends Record<string, unknown> {
  quotation_id: string
  last_reminder_at: string | Date | null
  reminder_count: number | null
}

const toNum = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
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

export interface RenewalSweepResult {
  expiredCount: number
  renewalDueCount: number
  quotationsProcessed: number
}

/**
 * Daily lifecycle sweep:
 * - flips quotations whose `expiry_date` has passed (and are not already
 *   converted/rejected/expired) to `status = 'expired'`, sets `expired_at`,
 *   records audit + publishes `commercial.quotation.expired`.
 * - emits `commercial.quotation.renewal_due` for open quotes whose expiry is
 *   within `RENEWAL_LOOKAHEAD_DAYS` and where no reminder was fired in the last
 *   `RENEWAL_CADENCE_DAYS` days (dedup via `quotation_renewal_reminders`).
 *
 * Idempotent: re-running the same day re-evaluates quotes but reminder cadence
 * table prevents duplicate notifications.
 */
export const runQuotationLifecycleSweep = async ({
  now = new Date()
}: {
  now?: Date
} = {}): Promise<RenewalSweepResult> => {
  const todayIso = now.toISOString().slice(0, 10)

  const candidates = await query<SweepRow>(
    `SELECT quotation_id, client_id, organization_id, status,
            pricing_model, commercial_model, staffing_model,
            total_amount_clp, expiry_date, converted_at
       FROM greenhouse_commercial.quotations
       WHERE expiry_date IS NOT NULL
         AND status NOT IN ('converted', 'rejected', 'expired')`
  )

  let expiredCount = 0
  let renewalDueCount = 0

  for (const row of candidates) {
    const expiryIso = toIsoDate(row.expiry_date)

    if (!expiryIso) continue

    const days = daysBetween(todayIso, expiryIso)

    if (days < 0) {
      await withTransaction(async client => {
        await client.query(
          `UPDATE greenhouse_commercial.quotations
             SET status = 'expired',
                 expired_at = NOW(),
                 updated_at = NOW()
             WHERE quotation_id = $1 AND status NOT IN ('converted', 'rejected', 'expired')`,
          [row.quotation_id]
        )

        await publishQuotationExpired(
          {
            quotationId: String(row.quotation_id),
            clientId: row.client_id ? String(row.client_id) : null,
            organizationId: row.organization_id ? String(row.organization_id) : null,
            totalAmountClp: toNum(row.total_amount_clp),
            expiredAt: now.toISOString(),
            daysSinceExpiry: Math.abs(days),
            pricingModel: row.pricing_model ? String(row.pricing_model) : null,
            commercialModel: row.commercial_model ? String(row.commercial_model) : null,
            staffingModel: row.staffing_model ? String(row.staffing_model) : null
          },
          client
        )

        await recordAudit(
          {
            quotationId: String(row.quotation_id),
            action: 'expired',
            actorUserId: 'system.lifecycle-sweep',
            actorName: 'Sistema',
            details: {
              expiryDate: expiryIso,
              daysSinceExpiry: Math.abs(days)
            }
          },
          client
        )
      })

      expiredCount++
    } else if (days <= RENEWAL_LOOKAHEAD_DAYS) {
      const reminderRows = await query<ReminderStateRow>(
        `SELECT quotation_id, last_reminder_at, reminder_count
           FROM greenhouse_commercial.quotation_renewal_reminders
           WHERE quotation_id = $1
           LIMIT 1`,
        [row.quotation_id]
      )

      const reminder = reminderRows[0] ?? null
      const lastReminder = reminder?.last_reminder_at ? new Date(String(reminder.last_reminder_at)) : null

      const daysSinceLast = lastReminder
        ? Math.round((now.getTime() - lastReminder.getTime()) / (24 * 60 * 60 * 1000))
        : Number.POSITIVE_INFINITY

      if (daysSinceLast < RENEWAL_CADENCE_DAYS) continue

      await withTransaction(async client => {
        await publishQuotationRenewalDue(
          {
            quotationId: String(row.quotation_id),
            clientId: row.client_id ? String(row.client_id) : null,
            organizationId: row.organization_id ? String(row.organization_id) : null,
            totalAmountClp: toNum(row.total_amount_clp),
            expiryDate: expiryIso,
            daysUntilExpiry: days,
            pricingModel: row.pricing_model ? String(row.pricing_model) : null,
            commercialModel: row.commercial_model ? String(row.commercial_model) : null,
            staffingModel: row.staffing_model ? String(row.staffing_model) : null
          },
          client
        )

        await client.query(
          `INSERT INTO greenhouse_commercial.quotation_renewal_reminders (
             quotation_id, last_reminder_at, reminder_count, next_check_at, last_event_type
           ) VALUES ($1, NOW(), 1, NOW() + INTERVAL '${RENEWAL_CADENCE_DAYS} days', 'renewal_due')
           ON CONFLICT (quotation_id) DO UPDATE SET
             last_reminder_at = NOW(),
             reminder_count = greenhouse_commercial.quotation_renewal_reminders.reminder_count + 1,
             next_check_at = NOW() + INTERVAL '${RENEWAL_CADENCE_DAYS} days',
             last_event_type = 'renewal_due',
             updated_at = NOW()`,
          [row.quotation_id]
        )
      })

      renewalDueCount++
    }
  }

  return {
    expiredCount,
    renewalDueCount,
    quotationsProcessed: candidates.length
  }
}
