import type { Metadata } from 'next'

import ContractDetailView from '@/views/greenhouse/finance/ContractDetailView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Detalle de contrato - Finance'
}

export default function ContractDetailPage() {
  return <ContractDetailView />
}
