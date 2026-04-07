import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type {
  AccountFinanceFacet,
  AccountFinanceClientProfile,
  AccountScope,
  AccountFacetContext
} from '@/types/account-complete-360'

// ── Row shapes ──

type ClientProfileRow = {
  client_id: string
  legal_name: string | null
  payment_currency: string | null
  payment_terms_days: string | number | null
  requires_po: boolean
  requires_hes: boolean
}

type RevenueRow = {
  revenue_ytd: string | number
  invoice_count: string | number
  outstanding: string | number
}

// ── Helpers ──

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v

  if (typeof v === 'string') { const n = Number(v);

 

return Number.isFinite(n) ? n : 0 }
  
return 0
}

// ── Facet ──

export const fetchFinanceFacet = async (
  scope: AccountScope,
  ctx: AccountFacetContext
): Promise<AccountFinanceFacet | null> => {
  void ctx
  if (scope.clientIds.length === 0) return null

  const [profileRows, revenueRows] = await Promise.all([
    runGreenhousePostgresQuery<ClientProfileRow>(
      `SELECT
        client_id,
        legal_name,
        payment_currency,
        payment_terms_days,
        requires_po,
        requires_hes
      FROM greenhouse_finance.client_profiles
      WHERE client_id = ANY($1)`,
      [scope.clientIds]
    ),
    runGreenhousePostgresQuery<RevenueRow>(
      `SELECT
        COALESCE(SUM(total_amount_clp), 0) AS revenue_ytd,
        COUNT(*) AS invoice_count,
        COALESCE(SUM(CASE WHEN payment_status IN ('pending', 'partial') THEN total_amount_clp ELSE 0 END), 0) AS outstanding
      FROM greenhouse_finance.income
      WHERE client_id = ANY($1)
        AND EXTRACT(YEAR FROM invoice_date) = EXTRACT(YEAR FROM CURRENT_DATE)`,
      [scope.clientIds]
    )
  ])

  const clientProfiles: AccountFinanceClientProfile[] = profileRows.map(row => ({
    clientId: row.client_id,
    legalName: row.legal_name,
    currency: row.payment_currency,
    paymentTerms: row.payment_terms_days != null ? toNum(row.payment_terms_days) : null,
    requiresPo: row.requires_po,
    requiresHes: row.requires_hes
  }))

  const rev = revenueRows[0]

  return {
    clientProfiles,
    revenueYTD: rev ? toNum(rev.revenue_ytd) : 0,
    invoiceCount: rev ? toNum(rev.invoice_count) : 0,
    outstandingAmount: rev ? toNum(rev.outstanding) : 0,
    dteCoverage: null,
    accountsReceivable: null
  }
}
