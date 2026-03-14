import type { Metadata } from 'next'

import IncomeDetailView from '@views/greenhouse/finance/IncomeDetailView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Ingreso — Greenhouse'
}

const IncomeDetailPage = () => {
  return <IncomeDetailView />
}

export default IncomeDetailPage
