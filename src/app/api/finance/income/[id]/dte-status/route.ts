import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { refreshDteStatus } from '@/lib/nubox/emission'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireFinanceTenantContext()

  const { id: incomeId } = await params

  try {
    const result = await refreshDteStatus(incomeId)

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('DTE status refresh failed:', error)

    return NextResponse.json({ error: message }, { status: 502 })
  }
}
