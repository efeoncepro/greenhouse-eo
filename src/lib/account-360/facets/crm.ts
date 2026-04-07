import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type {
  AccountCrmFacet,
  AccountCrmCompany,
  AccountCrmDeal,
  AccountScope,
  AccountFacetContext
} from '@/types/account-complete-360'

// ── Row shapes ──

type CompanyRow = {
  hubspot_company_id: string
  company_name: string | null
  lifecycle_stage: string | null
  industry: string | null
  website_url: string | null
}

type DealRow = {
  deal_name: string
  stage_name: string | null
  amount: string | number | null
  currency: string | null
  close_date: string | null
  is_closed_won: boolean
  is_closed_lost: boolean
}

type CountRow = {
  cnt: string | number
}

// ── Helpers ──

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v

  if (typeof v === 'string') { const n = Number(v);

 

return Number.isFinite(n) ? n : 0 }
  
return 0
}

// ── Facet ──

export const fetchCrmFacet = async (
  scope: AccountScope,
  ctx: AccountFacetContext
): Promise<AccountCrmFacet | null> => {
  if (!scope.hubspotCompanyId) return null

  const limit = ctx.limit ?? 10

  const [companyRows, dealRows, contactRows] = await Promise.all([
    runGreenhousePostgresQuery<CompanyRow>(
      `SELECT
        hubspot_company_id,
        company_name,
        lifecycle_stage,
        industry,
        website_url
      FROM greenhouse_crm.companies
      WHERE hubspot_company_id = $1
      LIMIT 1`,
      [scope.hubspotCompanyId]
    ),
    runGreenhousePostgresQuery<DealRow>(
      `SELECT
        deal_name,
        stage_name,
        amount,
        currency,
        close_date::text,
        is_closed_won,
        is_closed_lost
      FROM greenhouse_crm.deals
      WHERE hubspot_company_id = $1
      ORDER BY close_date DESC NULLS LAST
      LIMIT $2`,
      [scope.hubspotCompanyId, limit]
    ),
    runGreenhousePostgresQuery<CountRow>(
      `SELECT COUNT(*) AS cnt
      FROM greenhouse_crm.contacts
      WHERE hubspot_primary_company_id = $1`,
      [scope.hubspotCompanyId]
    )
  ])

  // ── Company ──
  const companyRow = companyRows[0]

  const company: AccountCrmCompany | null = companyRow
    ? {
        hubspotId: companyRow.hubspot_company_id,
        name: companyRow.company_name,
        lifecycleStage: companyRow.lifecycle_stage,
        industry: companyRow.industry,
        website: companyRow.website_url,
        ownerName: null
      }
    : null

  // ── Deals ──
  const dealsPipeline: AccountCrmDeal[] = dealRows.map(row => ({
    dealName: row.deal_name,
    stage: row.stage_name,
    amount: row.amount != null ? toNum(row.amount) : null,
    currency: row.currency,
    closeDate: row.close_date,
    ownerName: null
  }))

  const currentYear = new Date().getFullYear()

  let openDealAmount = 0
  let closedWonYTD = 0

  for (const row of dealRows) {
    const amt = row.amount != null ? toNum(row.amount) : 0

    if (!row.is_closed_won && !row.is_closed_lost) {
      openDealAmount += amt
    }

    if (row.is_closed_won && row.close_date) {
      const year = new Date(row.close_date).getFullYear()

      if (year === currentYear) closedWonYTD += amt
    }
  }

  return {
    company,
    dealCount: dealRows.length,
    openDealAmount,
    closedWonYTD,
    dealsPipeline,
    contactCount: contactRows[0] ? toNum(contactRows[0].cnt) : 0
  }
}
