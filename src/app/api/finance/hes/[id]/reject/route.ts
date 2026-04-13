import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { rejectHes } from '@/lib/finance/hes-store'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  if (!body.reason) {
    return NextResponse.json({ error: 'reason es obligatorio' }, { status: 400 })
  }

  const result = await rejectHes(id, body.reason)

  if (!result) {
    return NextResponse.json({ error: 'La HES no existe o ya no está en estado recibida.' }, { status: 404 })
  }

  return NextResponse.json(result)
}
