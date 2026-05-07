import { NextResponse } from 'next/server'

import {
  createNewVersion,
  listQuotationVersions
} from '@/lib/commercial/governance/versions-store'
import { publishQuotationVersionCreated } from '@/lib/commercial/quotation-events'
import { resolveQuotationIdentity } from '@/lib/finance/pricing'
import { requireCommercialTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireCommercialTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const identity = await resolveQuotationIdentity(id)

  if (!identity) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  }

  const versions = await listQuotationVersions(identity.quotationId)

  return NextResponse.json({ items: versions, total: versions.length })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireCommercialTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const identity = await resolveQuotationIdentity(id)

  if (!identity) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  }

  let body: { notes?: string | null } = {}

  try {
    body = (await request.json()) as { notes?: string | null }
  } catch {
    body = {}
  }

  const actor = {
    userId: tenant.userId,
    name: tenant.clientName || tenant.userId
  }

  const result = await createNewVersion({
    quotationId: identity.quotationId,
    actor,
    notes: body.notes ?? null
  })

  await publishQuotationVersionCreated({
    quotationId: identity.quotationId,
    fromVersion: result.clonedFromVersion,
    toVersion: result.newVersionNumber,
    createdBy: tenant.userId,
    notes: body.notes ?? null
  })

  return NextResponse.json(
    {
      quotationId: identity.quotationId,
      newVersionNumber: result.newVersionNumber,
      clonedFromVersion: result.clonedFromVersion,
      linesCloned: result.linesCloned
    },
    { status: 201 }
  )
}
