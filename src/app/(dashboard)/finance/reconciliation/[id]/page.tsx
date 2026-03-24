import type { Metadata } from 'next'

import ReconciliationDetailView from '@views/greenhouse/finance/ReconciliationDetailView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Conciliación — Greenhouse'
}

const ReconciliationDetailPage = () => {
  return <ReconciliationDetailView />
}

export default ReconciliationDetailPage
