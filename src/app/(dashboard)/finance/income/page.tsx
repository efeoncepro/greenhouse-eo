import type { Metadata } from 'next'

import IncomeListView from '@views/greenhouse/finance/IncomeListView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Ingresos — Greenhouse'
}

const IncomePage = () => {
  return <IncomeListView />
}

export default IncomePage
