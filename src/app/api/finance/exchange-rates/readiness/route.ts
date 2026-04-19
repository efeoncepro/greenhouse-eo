import 'server-only'

import { NextResponse } from 'next/server'

import { CURRENCY_DOMAINS, type CurrencyDomain } from '@/lib/finance/currency-domain'
import { resolveFxReadiness } from '@/lib/finance/fx-readiness'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const isValidDomain = (value: string | null): value is CurrencyDomain =>
  typeof value === 'string' && (CURRENCY_DOMAINS as readonly string[]).includes(value)

// GET /api/finance/exchange-rates/readiness?from=X&to=Y&domain=pricing_output&rateDate=YYYY-MM-DD
//
// Canonical readiness endpoint for all UI/backend consumers that need to
// check whether a currency pair is safe to snapshot. See
// `src/lib/finance/fx-readiness.ts` for the full state machine.
export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const domain = searchParams.get('domain')
  const rateDate = searchParams.get('rateDate')

  if (!from || !to) {
    return NextResponse.json(
      { error: 'Query params `from` and `to` are required (ISO currency codes).' },
      { status: 400 }
    )
  }

  if (!isValidDomain(domain)) {
    return NextResponse.json(
      {
        error: `Query param \`domain\` must be one of: ${CURRENCY_DOMAINS.join(', ')}`
      },
      { status: 400 }
    )
  }

  try {
    const readiness = await resolveFxReadiness({
      fromCurrency: from,
      toCurrency: to,
      rateDate: rateDate ?? null,
      domain
    })

    return NextResponse.json(readiness, {
      headers: { 'Cache-Control': 'private, max-age=60' }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'FX readiness resolution failed.'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
