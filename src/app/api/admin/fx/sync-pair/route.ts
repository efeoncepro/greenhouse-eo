import 'server-only'

import { NextResponse } from 'next/server'

import { syncCurrencyPair } from '@/lib/finance/fx/sync-orchestrator'
import type { FxProviderCode } from '@/lib/finance/fx/provider-adapter'
import { FX_PROVIDER_CODES } from '@/lib/finance/fx/provider-adapter'
import { canAdministerPricingCatalog, requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

// POST /api/admin/fx/sync-pair
//
// Admin-only manual trigger for FX pair sync. Gated by
// canAdministerPricingCatalog (efeonce_admin + finance_admin).
//
// Body:
//   {
//     fromCurrency: string   // ISO, e.g. "USD"
//     toCurrency:   string   // ISO, e.g. "MXN"
//     rateDate?:    string   // ISO YYYY-MM-DD, defaults to today
//     dryRun?:      boolean  // default true for safety
//     providerCode?: FxProviderCode  // override chain (debug)
//   }
//
// Returns the full SyncCurrencyPairResult so operators can see which
// provider won, whether the rate was carried, the run id for
// source_sync_runs lookup, and the actual numeric rate.
export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canAdministerPricingCatalog(tenant)) {
    return NextResponse.json(
      { error: 'Forbidden — requires efeonce_admin or finance_admin' },
      { status: 403 }
    )
  }

  let body: {
    fromCurrency?: unknown
    toCurrency?: unknown
    rateDate?: unknown
    dryRun?: unknown
    providerCode?: unknown
  }

  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const fromCurrency = typeof body.fromCurrency === 'string' ? body.fromCurrency.trim() : ''
  const toCurrency = typeof body.toCurrency === 'string' ? body.toCurrency.trim() : ''

  if (!fromCurrency || !toCurrency) {
    return NextResponse.json(
      { error: 'fromCurrency and toCurrency are required (ISO 3-letter codes).' },
      { status: 400 }
    )
  }

  const rateDate = typeof body.rateDate === 'string' ? body.rateDate : null

  // Default to dryRun=true for safety. Operator must pass explicit false to persist.
  const dryRun = body.dryRun !== false

  let overrideProviderCode: FxProviderCode | undefined

  if (typeof body.providerCode === 'string') {
    if (!(FX_PROVIDER_CODES as readonly string[]).includes(body.providerCode)) {
      return NextResponse.json(
        {
          error: `providerCode must be one of: ${FX_PROVIDER_CODES.join(', ')}`
        },
        { status: 400 }
      )
    }

    overrideProviderCode = body.providerCode as FxProviderCode
  }

  try {
    const result = await syncCurrencyPair({
      fromCurrency,
      toCurrency,
      rateDate,
      dryRun,
      overrideProviderCode,
      triggeredBy: `admin:${tenant.userId}`
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'FX sync failed.'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
