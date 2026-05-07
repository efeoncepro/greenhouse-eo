import type { Metadata } from 'next'

import ContractsListView from '@/views/greenhouse/finance/ContractsListView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Contratos — Comercial'
}

export default function ContractsPage() {
  return <ContractsListView />
}
