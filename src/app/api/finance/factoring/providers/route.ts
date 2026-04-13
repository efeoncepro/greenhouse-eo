import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { assertFinanceSlice2PostgresReady } from '@/lib/finance/postgres-store-slice2'
import { normalizeString } from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

/**
 * GET /api/finance/factoring/providers
 *
 * Returns providers registered as factoring companies
 * (greenhouse_core.providers WHERE provider_type = 'factoring').
 *
 * Used by the FactoringOperationDrawer dropdown.
 */
export async function GET() {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await assertFinanceSlice2PostgresReady()

    const rows = await runGreenhousePostgresQuery<{
      provider_id: string
      provider_name: string
      legal_name: string | null
    }>(
      `SELECT provider_id, provider_name, legal_name
       FROM greenhouse_core.providers
       WHERE provider_type = 'factoring' AND active = true
       ORDER BY provider_name ASC`
    )

    const providers = rows.map(r => ({
      providerId: normalizeString(r.provider_id),
      providerName: normalizeString(r.provider_name),
      legalName: r.legal_name ? normalizeString(r.legal_name) : null
    }))

    return NextResponse.json({ providers })
  } catch (error) {
    console.error('[factoring/providers] Error fetching factoring providers:', error)
    throw error
  }
}
