import { NextResponse } from 'next/server'

import { getFinanceContractDetail } from '@/lib/commercial/contracts-store'
import { readContractDocumentChain } from '@/lib/finance/quote-to-cash/document-chain-reader'
import { requireCommercialTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireCommercialTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const contract = await getFinanceContractDetail({
    tenant,
    contractId: id
  })

  if (!contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  }

  const chain = await readContractDocumentChain({ contractId: contract.contractId })

  return NextResponse.json(chain)
}
