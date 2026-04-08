import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { emitDte } from '@/lib/nubox/emission'
import { enqueueDteEmissionWithType } from '@/lib/finance/dte-emission-queue'

export const dynamic = 'force-dynamic'

const isRetryableDteError = (error: string | null | undefined) => {
  const normalized = (error || '').toLowerCase()

  if (!normalized) return true

  return ![
    'income not found',
    'dte already emitted',
    'no client_id on income',
    'organization not found or missing rut'
  ].some(marker => normalized.includes(marker))
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: incomeId } = await params

  const body = (await request.json()) as { dteTypeCode?: string }
  const dteTypeCode = body.dteTypeCode || '33' // Default: Factura Electrónica

  const validDteCodes = ['33', '34', '56', '61', '38', '39', '41', '52']

  if (!validDteCodes.includes(dteTypeCode)) {
    return NextResponse.json(
      { error: `Invalid DTE type code. Valid codes: ${validDteCodes.join(', ')}` },
      { status: 400 }
    )
  }

  try {
    const result = await emitDte({ incomeId, dteTypeCode })

    if (!result.success) {
      if (isRetryableDteError(result.error)) {
        await enqueueDteEmissionWithType(incomeId, 'finance_emit_route', dteTypeCode).catch(() => {})
      }

      return NextResponse.json(result, { status: 422 })
    }

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('DTE emission failed:', error)

    return NextResponse.json({ error: message }, { status: 502 })
  }
}
