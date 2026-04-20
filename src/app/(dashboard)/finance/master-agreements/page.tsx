import type { Metadata } from 'next'

import MasterAgreementsListView from '@/views/greenhouse/finance/MasterAgreementsListView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Acuerdos marco - Finance'
}

export default function MasterAgreementsPage() {
  return <MasterAgreementsListView />
}
