import 'server-only'

import { NextResponse } from 'next/server'

import { requireCronAuth } from '@/lib/cron/require-cron-auth'
import type { PlatformCurrency } from '@/lib/finance/currency-domain'
import { syncCurrencyPair } from '@/lib/finance/fx/sync-orchestrator'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Per-TZ windows for LATAM currencies. The cron hits this route with a
// `?window=morning|midday|evening` param. Each window syncs one or more
// currencies per the publication timing of its primary provider.
//
// Adding a new currency:
//   1. Add to CURRENCY_REGISTRY + CURRENCY_DOMAIN_SUPPORT.
//   2. Append its code to the appropriate window below.
//   3. Add a vercel.json cron entry if a new timing is needed.
//
// No code change in the adapter layer.
const WINDOW_CURRENCIES: Record<'morning' | 'midday' | 'evening', readonly PlatformCurrency[]> = {
  // TRM publishes in the evening for the next business day; safe to sync
  // at 09:00 UTC (06:00 CLT) which is always after the previous night's
  // publication.
  morning: ['COP'],

  // SUNAT publishes early morning in Lima (~09:00 PET = 14:00 UTC).
  midday: ['PEN'],

  // Banxico FIX publishes ~12:00 CDMX (18:00 UTC summer / 19:00 UTC
  // winter). Evening window at 22:00 UTC is always safe.
  evening: ['MXN']
}

const isValidWindow = (value: string | null): value is keyof typeof WINDOW_CURRENCIES =>
  value === 'morning' || value === 'midday' || value === 'evening'

export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) return errorResponse

  const { searchParams } = new URL(request.url)
  const window = searchParams.get('window')

  if (!isValidWindow(window)) {
    return NextResponse.json(
      { error: `window must be one of: ${Object.keys(WINDOW_CURRENCIES).join(', ')}` },
      { status: 400 }
    )
  }

  // Dry-run is controlled by env so the operator can turn off persistence
  // for the first 24-48h post-deploy without touching code.
  const dryRun = process.env.FX_SYNC_DRY_RUN === 'true'

  const currencies = WINDOW_CURRENCIES[window]
  const results = []

  for (const currency of currencies) {
    try {
      const result = await syncCurrencyPair({
        fromCurrency: 'USD',
        toCurrency: currency,
        rateDate: null,
        dryRun,
        triggeredBy: `cron:fx-sync-latam:${window}`
      })

      results.push({
        currency,
        success: result.success,
        providerUsed: result.providerUsed,
        rateDate: result.rateDate,
        isCarried: result.isCarried,
        runId: result.runId,
        error: result.error
      })
    } catch (caught) {
      results.push({
        currency,
        success: false,
        providerUsed: null,
        rateDate: null,
        isCarried: false,
        runId: null,
        error: caught instanceof Error ? caught.message : String(caught)
      })
    }
  }

  return NextResponse.json({ window, dryRun, results })
}
