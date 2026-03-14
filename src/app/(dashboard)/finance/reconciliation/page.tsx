import type { Metadata } from 'next'

import ReconciliationView from '@views/greenhouse/finance/ReconciliationView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Conciliación — Greenhouse'
}

const ReconciliationPage = () => {
  return <ReconciliationView />
}

export default ReconciliationPage
