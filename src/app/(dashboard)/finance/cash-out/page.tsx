import type { Metadata } from 'next'

import CashOutListView from '@views/greenhouse/finance/CashOutListView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Pagos — Greenhouse'
}

const CashOutPage = () => {
  return <CashOutListView />
}

export default CashOutPage
