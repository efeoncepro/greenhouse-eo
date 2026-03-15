import { NextResponse } from 'next/server'

import { createWallet, listAiCreditWallets } from '@/lib/ai-tools/service'
import { toAiToolingErrorResponse } from '@/lib/ai-tools/shared'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import type { CreateWalletInput } from '@/types/ai-tools'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const toolId = searchParams.get('toolId')
    const status = searchParams.get('status')
    const scope = searchParams.get('scope')

    const data = await listAiCreditWallets({
      tenant,
      clientId,
      toolId,
      status,
      scope
    })

    return NextResponse.json(data)
  } catch (error) {
    return toAiToolingErrorResponse(error, 'Unable to load AI credit wallets.')
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json().catch(() => null)) as CreateWalletInput | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const created = await createWallet({
      input: body,
      actorUserId: tenant.userId
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return toAiToolingErrorResponse(error, 'Unable to create AI credit wallet.')
  }
}
