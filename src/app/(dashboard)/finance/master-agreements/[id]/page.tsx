import type { Metadata } from 'next'

import MasterAgreementDetailView from '@/views/greenhouse/finance/MasterAgreementDetailView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Detalle de acuerdo marco - Finance'
}

export default function MasterAgreementDetailPage() {
  return <MasterAgreementDetailView />
}
