import { NextResponse } from 'next/server'

import { getFinanceLedgerHealth } from '@/lib/finance/ledger-health'
import { FinanceValidationError } from '@/lib/finance/shared'
import { translatePostgresError, extractPostgresErrorTags } from '@/lib/finance/postgres-error-translator'
import { captureMessageWithDomain, captureWithDomain } from '@/lib/observability/capture'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * Finance Ledger Health (TASK-702 Slice 7).
 * ==========================================
 *
 * Read-only runtime invariant covering the 4 dimensions of finance ledger
 * drift (settlement, phantoms, balance freshness, unanchored expenses).
 * Surfaces:
 *
 *   - Structured JSON to admins / health probes / reliability composers.
 *   - Sentry message tagged `domain=finance` via `captureMessageWithDomain`
 *     when drift detected, so the Reliability dashboard reads it as an
 *     incident signal for the finance module (per
 *     `RELIABILITY_REGISTRY[finance].incidentDomainTag`).
 *
 * Returns 200 if healthy, 503 if drift detected. Admin only.
 */
export async function GET() {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const health = await getFinanceLedgerHealth()

    if (!health.healthy) {
      captureMessageWithDomain(
        `Finance ledger drift detected (settlement=${health.settlementDrift.driftedIncomesCount}, phantoms=${health.phantoms.incomePhantomsCount + health.phantoms.expensePhantomsCount}, stale_balances=${health.balanceFreshness.accountsWithStaleBalances.length}, unanchored=${health.unanchoredExpenses.count}).`,
        'finance',
        {
          level: 'warning',
          tags: { source: 'finance_ledger_drift' },
          extra: {
            settlementDriftCount: health.settlementDrift.driftedIncomesCount,
            phantomsCount: health.phantoms.incomePhantomsCount + health.phantoms.expensePhantomsCount,
            staleBalancesCount: health.balanceFreshness.accountsWithStaleBalances.length,
            unanchoredExpensesCount: health.unanchoredExpenses.count
          },
          fingerprint: ['finance-ledger-drift']
        }
      )
    }

    return NextResponse.json(health, {
      headers: { 'Cache-Control': 'no-store' },
      status: health.healthy ? 200 : 503
    })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json(
        { error: error.message, code: error.code, details: error.details },
        { status: error.statusCode }
      )
    }

    const translated = translatePostgresError(error)

    if (translated) {
      captureWithDomain(error, 'finance', {
        tags: { source: 'finance_admin', op: 'ledger_health', ...extractPostgresErrorTags(error) }
      })

      return NextResponse.json(
        { error: translated.message, code: translated.code, details: translated.details },
        { status: translated.statusCode }
      )
    }

    captureWithDomain(error, 'finance', { tags: { source: 'finance_admin', op: 'ledger_health' } })

    return NextResponse.json(
      { error: 'Error interno al evaluar la salud del ledger.' },
      { status: 500 }
    )
  }
}
