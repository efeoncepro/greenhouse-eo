import 'server-only'

import { query } from '@/lib/db'

export interface QuotationIdentityRow {
  quotationId: string
  financeQuoteId: string | null
  currentVersion: number
  spaceId: string | null
}

export const resolveQuotationIdentity = async (
  quoteIdOrFinanceId: string
): Promise<QuotationIdentityRow | null> => {
  const rows = await query<{
    quotation_id: string
    finance_quote_id: string | null
    current_version: number
    space_id: string | null
  }>(
    `SELECT quotation_id, finance_quote_id, current_version, space_id
     FROM greenhouse_commercial.quotations
     WHERE quotation_id = $1 OR finance_quote_id = $1
     LIMIT 1`,
    [quoteIdOrFinanceId]
  )

  const row = rows[0]

  if (!row) return null

  return {
    quotationId: row.quotation_id,
    financeQuoteId: row.finance_quote_id,
    currentVersion: row.current_version,
    spaceId: row.space_id
  }
}
