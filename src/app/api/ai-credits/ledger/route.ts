import { NextResponse } from 'next/server'

import { listAiCreditLedger } from '@/lib/ai-tools/service'
import { requireAiCreditsReadTenantContext, toAiToolingErrorResponse } from '@/lib/ai-tools/shared'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAiCreditsReadTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const walletId = searchParams.get('walletId')

    if (!walletId) {
      return NextResponse.json({ error: 'walletId is required.' }, { status: 400 })
    }

    const entryType = searchParams.get('entryType')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const memberId = searchParams.get('memberId')
    const limit = Number(searchParams.get('limit') || 50)
    const offset = Number(searchParams.get('offset') || 0)

    const data = await listAiCreditLedger({
      tenant,
      walletId,
      entryType,
      dateFrom,
      dateTo,
      memberId,
      limit,
      offset
    })

    return NextResponse.json(data)
  } catch (error) {
    return toAiToolingErrorResponse(error, 'Unable to load AI credit ledger.')
  }
}
