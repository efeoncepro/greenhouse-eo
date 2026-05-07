import 'server-only'

import { NextResponse } from 'next/server'

import type {
  PricingEngineInputV2,
  PricingEngineOutputV2,
  PricingLineOutputV2
} from '@/lib/finance/pricing/contracts'
import { buildPricingEngineOutputV2 } from '@/lib/finance/pricing/pricing-engine-v2'
import { canViewCostStack, requireCommercialTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

type SanitizedPricingLineOutput = Omit<PricingLineOutputV2, 'costStack'> & {
  costStack?: PricingLineOutputV2['costStack']
}

type SanitizedPricingEngineOutput = Omit<PricingEngineOutputV2, 'lines'> & {
  lines: SanitizedPricingLineOutput[]
}

const stripCostStack = (output: PricingEngineOutputV2): SanitizedPricingEngineOutput => ({
  ...output,
  lines: output.lines.map(({ costStack, ...rest }) => {
    void costStack

    return rest
  })
})

const isValidInput = (payload: unknown): payload is PricingEngineInputV2 => {
  if (!payload || typeof payload !== 'object') return false
  const candidate = payload as Partial<PricingEngineInputV2>

  return (
    typeof candidate.commercialModel === 'string' &&
    typeof candidate.countryFactorCode === 'string' &&
    typeof candidate.outputCurrency === 'string' &&
    typeof candidate.quoteDate === 'string' &&
    Array.isArray(candidate.lines)
  )
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireCommercialTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  if (!isValidInput(body)) {
    return NextResponse.json(
      {
        error:
          'Missing required fields. Expected { commercialModel, countryFactorCode, outputCurrency, quoteDate, lines[] }.'
      },
      { status: 400 }
    )
  }

  try {
    const output = await buildPricingEngineOutputV2(body)
    const payload = canViewCostStack(tenant) ? output : stripCostStack(output)

    return NextResponse.json(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pricing engine simulation failed.'

    return NextResponse.json({ error: message }, { status: 422 })
  }
}
