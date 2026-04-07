import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { createHubSpotQuote } from '@/lib/hubspot/create-hubspot-quote'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    // ── Validate required fields ──

    const organizationId = body.organizationId
    const title = body.title?.trim()
    const expirationDate = body.expirationDate?.trim()
    const lineItems = body.lineItems

    if (!organizationId || typeof organizationId !== 'string') {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 })
    }

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    if (!expirationDate || !/^\d{4}-\d{2}-\d{2}$/.test(expirationDate)) {
      return NextResponse.json({ error: 'expirationDate is required (YYYY-MM-DD)' }, { status: 400 })
    }

    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json({ error: 'At least one line item is required' }, { status: 400 })
    }

    for (const [i, li] of lineItems.entries()) {
      if (!li.name || typeof li.name !== 'string') {
        return NextResponse.json({ error: `Line item ${i + 1}: name is required` }, { status: 400 })
      }

      if (typeof li.quantity !== 'number' || li.quantity <= 0) {
        return NextResponse.json({ error: `Line item ${i + 1}: quantity must be > 0` }, { status: 400 })
      }

      if (typeof li.unitPrice !== 'number' || li.unitPrice < 0) {
        return NextResponse.json({ error: `Line item ${i + 1}: unitPrice must be >= 0` }, { status: 400 })
      }
    }

    // ── Generate quote ID ──

    const now = new Date()
    const quoteId = `QUO-HS-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(Date.now()).slice(-6)}`

    // ── Create ──

    const result = await createHubSpotQuote({
      quoteId,
      organizationId,
      title,
      expirationDate,
      description: body.description?.trim() || undefined,
      lineItems: lineItems.map((li: { name: string; quantity: number; unitPrice: number; description?: string }) => ({
        name: li.name.trim(),
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        description: li.description?.trim()
      })),
      dealId: body.dealId || undefined,
      publishImmediately: body.publishImmediately === true
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 422 })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('[quotes/hubspot] Create failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
