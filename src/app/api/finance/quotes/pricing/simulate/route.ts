import 'server-only'

import { NextResponse } from 'next/server'

import { buildPricingEngineOutputV2 } from '@/lib/finance/pricing/pricing-engine-v2'
import { redactPricingOutputForProfile } from '@/lib/finance/pricing/pricing-output-redaction'
import { simulateQuoteInputSchema } from '@/lib/finance/pricing/simulate-input-schema'
import { canViewCostStack, requireCommercialTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

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

  // Gate de validación con el contrato Zod introspectable. Si pasa, ejercemos el
  // body original (no la versión transformada) contra el engine para preservar el
  // contrato runtime del UI.
  const parsed = simulateQuoteInputSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          'Missing or invalid fields. Expected { commercialModel, countryFactorCode, outputCurrency, quoteDate, lines[] }.'
      },
      { status: 400 }
    )
  }

  try {
    const output = await buildPricingEngineOutputV2(parsed.data)

    const payload = redactPricingOutputForProfile(output, {
      audience: 'internal',
      costStackVisible: canViewCostStack(tenant)
    })

    return NextResponse.json(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pricing engine simulation failed.'

    return NextResponse.json({ error: message }, { status: 422 })
  }
}
