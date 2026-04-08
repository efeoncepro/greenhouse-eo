import type { Metadata } from 'next'

import CashInListView from '@views/greenhouse/finance/CashInListView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Cobros — Greenhouse'
}

const CashInPage = () => {
  return <CashInListView />
}

export default CashInPage
