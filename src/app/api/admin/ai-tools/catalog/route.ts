import { NextResponse } from 'next/server'

import { createAiTool, listAiToolsCatalog } from '@/lib/ai-tools/service'
import { toAiToolingErrorResponse } from '@/lib/ai-tools/shared'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import type { CreateAiToolInput } from '@/types/ai-tools'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const costModel = searchParams.get('costModel')
    const activeOnly = searchParams.get('activeOnly') !== 'false'
    const data = await listAiToolsCatalog({ category, costModel, activeOnly })

    return NextResponse.json(data)
  } catch (error) {
    return toAiToolingErrorResponse(error, 'Unable to load AI tools catalog.')
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json().catch(() => null)) as CreateAiToolInput | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const created = await createAiTool(body)

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return toAiToolingErrorResponse(error, 'Unable to create AI tool.')
  }
}
