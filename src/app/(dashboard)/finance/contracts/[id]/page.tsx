import type { Metadata } from 'next'

import ContractDetailView from '@/views/greenhouse/finance/ContractDetailView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Detalle de contrato — Comercial'
}

export default function ContractDetailPage() {
  return <ContractDetailView />
}
