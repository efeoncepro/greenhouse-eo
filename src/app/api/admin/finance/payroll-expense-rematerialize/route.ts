import { NextResponse } from 'next/server'

import { can } from '@/lib/entitlements/runtime'
import { materializePayrollExpensesForExportedPeriod } from '@/lib/finance/payroll-expense-reactive'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * TASK-765 slice 3 — Endpoint admin de rematerialización idempotente de
 * `expenses` desde un período payroll exportado.
 *
 * Caso de uso: cuando la proyección reactiva `finance_expense_reactive_intake`
 * quedó dead-letter (e.g. drift de columnas, fallo SQL no-recuperable) y el
 * período no tiene filas en `greenhouse_finance.expenses`, este endpoint
 * permite a FINANCE_ADMIN / EFEONCE_ADMIN re-disparar el materializador sin
 * SQL hand-coded.
 *
 * Idempotente: el materializador skipea filas existentes por
 * `(payroll_period_id, member_id, expense_type='payroll', source_type='payroll_generated')`.
 *
 * `dryRun=true` reporta qué se crearía sin insertar.
 *
 * Audit trail: outbox event `finance.payroll_expenses.rematerialized` por
 * cada ejecución (incluyendo dryRun) para que AI Observer y log de audit lo
 * capturen.
 */

interface RematerializeRequestBody {
  periodId?: unknown
  year?: unknown
  month?: unknown
  dryRun?: unknown
}

interface DryRunRow extends Record<string, unknown> {
  member_id: string
}

interface ExistingExpenseRow extends Record<string, unknown> {
  member_id: string
}

const sanitizeErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message.slice(0, 500)
  }

  return 'Internal error during payroll expense rematerialization.'
}

const validationError = (message: string) =>
  NextResponse.json({ error: message, code: 'validation_error' }, { status: 400 })

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!can(tenant, 'finance.payroll.rematerialize', 'update', 'tenant')) {
    return NextResponse.json(
      {
        error:
          'No tienes permisos para rematerializar expenses de payroll. Requiere finance.payroll.rematerialize.'
      },
      { status: 403 }
    )
  }

  let body: RematerializeRequestBody

  try {
    body = (await request.json()) as RematerializeRequestBody
  } catch {
    return validationError('Body must be valid JSON.')
  }

  const periodId = typeof body.periodId === 'string' ? body.periodId.trim() : ''
  const year = typeof body.year === 'number' ? body.year : Number(body.year)
  const month = typeof body.month === 'number' ? body.month : Number(body.month)
  const dryRun = body.dryRun === true

  if (!periodId) {
    return validationError('periodId is required (string).')
  }

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return validationError('year is required (integer between 2000 and 2100).')
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return validationError('month is required (integer 1-12).')
  }

  try {
    if (dryRun) {
      // Compute preview: members in payroll_entries minus members already
      // materialized in expenses for the period.
      const candidates = await runGreenhousePostgresQuery<DryRunRow>(
        `
          SELECT DISTINCT e.member_id
          FROM greenhouse_payroll.payroll_entries AS e
          WHERE e.period_id = $1
            AND e.is_active = TRUE
        `,
        [periodId]
      )

      const existing = await runGreenhousePostgresQuery<ExistingExpenseRow>(
        `
          SELECT member_id
          FROM greenhouse_finance.expenses
          WHERE payroll_period_id = $1
            AND expense_type = 'payroll'
            AND source_type = 'payroll_generated'
            AND member_id IS NOT NULL
        `,
        [periodId]
      )

      const existingMembers = new Set(existing.map(row => row.member_id))
      const wouldCreatePayroll = candidates.filter(row => !existingMembers.has(row.member_id)).length
      const wouldSkipPayroll = candidates.length - wouldCreatePayroll

      const socialSecurityExisting = await runGreenhousePostgresQuery<ExistingExpenseRow>(
        `
          SELECT member_id
          FROM greenhouse_finance.expenses
          WHERE payroll_period_id = $1
            AND expense_type = 'social_security'
          LIMIT 1
        `,
        [periodId]
      )

      const wouldCreateSocialSecurity = socialSecurityExisting.length === 0 && candidates.length > 0
      const wouldSkipSocialSecurity = !wouldCreateSocialSecurity

      const result = {
        payrollCreated: wouldCreatePayroll,
        payrollSkipped: wouldSkipPayroll,
        socialSecurityCreated: wouldCreateSocialSecurity,
        socialSecuritySkipped: wouldSkipSocialSecurity
      }

      const eventId = await publishOutboxEvent({
        aggregateType: 'payroll_expense',
        aggregateId: periodId,
        eventType: 'finance.payroll_expenses.rematerialized',
        payload: {
          eventVersion: 'v1',
          periodId,
          year,
          month,
          dryRun: true,
          payrollCreated: result.payrollCreated,
          payrollSkipped: result.payrollSkipped,
          socialSecurityCreated: result.socialSecurityCreated,
          socialSecuritySkipped: result.socialSecuritySkipped,
          actorUserId: tenant.userId,
          rematerializedAt: new Date().toISOString()
        }
      }).catch(error => {
        // Audit publish failure is non-blocking — the dry-run preview still
        // returns successfully. Capture so reliability surfaces it.
        captureWithDomain(error, 'finance', {
          tags: { source: 'payroll_expense_rematerialize_endpoint', op: 'audit_publish_dryrun' }
        })

        return null
      })

      return NextResponse.json({
        ok: true,
        dryRun: true,
        result,
        eventId: eventId ?? undefined
      })
    }

    const result = await materializePayrollExpensesForExportedPeriod({
      periodId,
      year,
      month
    })

    const eventId = await publishOutboxEvent({
      aggregateType: 'payroll_expense',
      aggregateId: periodId,
      eventType: 'finance.payroll_expenses.rematerialized',
      payload: {
        eventVersion: 'v1',
        periodId,
        year,
        month,
        dryRun: false,
        payrollCreated: result.payrollCreated,
        payrollSkipped: result.payrollSkipped,
        socialSecurityCreated: result.socialSecurityCreated,
        socialSecuritySkipped: result.socialSecuritySkipped,
        actorUserId: tenant.userId,
        rematerializedAt: new Date().toISOString()
      }
    }).catch(error => {
      // Materialization succeeded; audit publish failure is non-blocking but
      // observable. Reliability captures via captureWithDomain.
      captureWithDomain(error, 'finance', {
        tags: { source: 'payroll_expense_rematerialize_endpoint', op: 'audit_publish' }
      })

      return null
    })

    return NextResponse.json({
      ok: true,
      dryRun: false,
      result,
      eventId: eventId ?? undefined
    })
  } catch (error) {
    captureWithDomain(error, 'finance', {
      tags: { source: 'payroll_expense_rematerialize_endpoint' },
      extra: { periodId, year, month, dryRun, actorUserId: tenant.userId }
    })

    return NextResponse.json(
      {
        error: sanitizeErrorMessage(error),
        code: 'rematerialize_failed'
      },
      { status: 500 }
    )
  }
}
