import { NextResponse } from 'next/server'

import type { ContractStatus } from '@/lib/commercial-intelligence/contracts'
import { ensureContractForQuotation } from '@/lib/commercial/contract-lifecycle'
import { listFinanceContracts } from '@/lib/commercial/contracts-store'
import { resolveQuotationIdentity } from '@/lib/finance/pricing'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const ALLOWED_STATUS: ReadonlySet<ContractStatus> = new Set([
  'draft',
  'active',
  'paused',
  'terminated',
  'completed',
  'renewed'
])

interface CreateContractBody {
  quotationId?: string
  startDate?: string | null
  endDate?: string | null
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const statusParam = searchParams.get('status')
  const clientId = searchParams.get('clientId')

  const status = statusParam && ALLOWED_STATUS.has(statusParam as ContractStatus)
    ? (statusParam as ContractStatus)
    : null

  const items = await listFinanceContracts({
    tenant,
    status,
    clientId: clientId || null
  })

  return NextResponse.json({ items, count: items.length })
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: CreateContractBody

  try {
    body = (await request.json()) as CreateContractBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  if (!body.quotationId) {
    return NextResponse.json({ error: 'quotationId es requerido.' }, { status: 400 })
  }

  const identity = await resolveQuotationIdentity(body.quotationId)

  if (!identity) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  }

  try {
    const result = await ensureContractForQuotation({
      quotationId: identity.quotationId,
      actor: {
        userId: tenant.userId,
        name: tenant.clientName || tenant.userId
      },
      startDate: body.startDate ?? null,
      endDate: body.endDate ?? null
    })

    return NextResponse.json(
      {
        contractId: result.contractId,
        contractNumber: result.contractNumber,
        created: result.created,
        status: result.status
      },
      { status: result.created ? 201 : 200 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al promover la cotización a contrato.'

    const status = message.includes('not found') ? 404 : 400

    return NextResponse.json({ error: message }, { status })
  }
}
