import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import { runFinanceQuery, getFinanceProjectId, toNumber } from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

interface CountRow {
  total: unknown
}

export async function POST() {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureFinanceInfrastructure()

  const projectId = getFinanceProjectId()

  // MERGE existing tenants (from greenhouse.clients) into fin_client_profiles
  // Only inserts clients that don't already have a financial profile
  await runFinanceQuery(`
    MERGE \`${projectId}.greenhouse.fin_client_profiles\` AS target
    USING (
      SELECT
        c.client_id AS client_profile_id,
        c.client_id AS client_id,
        COALESCE(c.hubspot_company_id, c.client_id) AS hubspot_company_id,
        c.client_name AS legal_name,
        'CL' AS billing_country,
        30 AS payment_terms_days,
        'CLP' AS payment_currency,
        FALSE AS requires_po,
        FALSE AS requires_hes,
        @createdBy AS created_by
      FROM \`${projectId}.greenhouse.clients\` AS c
      WHERE c.active = TRUE
    ) AS source
    ON target.client_profile_id = source.client_profile_id
    WHEN NOT MATCHED THEN
      INSERT (
        client_profile_id, client_id, hubspot_company_id, legal_name,
        billing_country, payment_terms_days, payment_currency,
        requires_po, requires_hes, created_by,
        created_at, updated_at
      )
      VALUES (
        source.client_profile_id, source.client_id, source.hubspot_company_id, source.legal_name,
        source.billing_country, source.payment_terms_days, source.payment_currency,
        source.requires_po, source.requires_hes, source.created_by,
        CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()
      )
  `, { createdBy: tenant.userId || 'sync' })

  // Count total profiles after sync
  const countResult = await runFinanceQuery<CountRow>(`
    SELECT COUNT(*) AS total
    FROM \`${projectId}.greenhouse.fin_client_profiles\`
  `)

  const total = toNumber(countResult[0]?.total)

  return NextResponse.json({ total, message: `${total} perfiles de cliente disponibles` })
}
