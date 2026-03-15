import { NextResponse } from 'next/server'

import { getAiCreditWallet, updateWallet } from '@/lib/ai-tools/service'
import { toAiToolingErrorResponse } from '@/lib/ai-tools/shared'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import type { UpdateWalletInput } from '@/types/ai-tools'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ walletId: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { walletId } = await context.params
    const wallet = await getAiCreditWallet({ walletId, tenant })

    return NextResponse.json(wallet)
  } catch (error) {
    return toAiToolingErrorResponse(error, 'Unable to load AI credit wallet detail.')
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ walletId: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { walletId } = await context.params
    const body = (await request.json().catch(() => null)) as UpdateWalletInput | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const updated = await updateWallet(walletId, body)

    return NextResponse.json(updated)
  } catch (error) {
    return toAiToolingErrorResponse(error, 'Unable to update AI credit wallet.')
  }
}
