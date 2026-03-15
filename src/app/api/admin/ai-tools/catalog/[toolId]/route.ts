import { NextResponse } from 'next/server'

import { getAiToolCatalogItem, updateAiTool } from '@/lib/ai-tools/service'
import { toAiToolingErrorResponse } from '@/lib/ai-tools/shared'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import type { UpdateAiToolInput } from '@/types/ai-tools'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ toolId: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { toolId } = await context.params
    const tool = await getAiToolCatalogItem(toolId)

    if (!tool) {
      return NextResponse.json({ error: 'AI tool not found.' }, { status: 404 })
    }

    return NextResponse.json(tool)
  } catch (error) {
    return toAiToolingErrorResponse(error, 'Unable to load AI tool detail.')
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ toolId: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { toolId } = await context.params
    const body = (await request.json().catch(() => null)) as UpdateAiToolInput | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const updated = await updateAiTool(toolId, body)

    return NextResponse.json(updated)
  } catch (error) {
    return toAiToolingErrorResponse(error, 'Unable to update AI tool.')
  }
}
