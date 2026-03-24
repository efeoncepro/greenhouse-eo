import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { emitDte } from '@/lib/nubox/emission'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireFinanceTenantContext()

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
      return NextResponse.json(result, { status: 422 })
    }

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('DTE emission failed:', error)

    return NextResponse.json({ error: message }, { status: 502 })
  }
}
