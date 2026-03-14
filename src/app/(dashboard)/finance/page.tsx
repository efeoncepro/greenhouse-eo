import type { Metadata } from 'next'

import FinanceDashboardView from '@views/greenhouse/finance/FinanceDashboardView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Finanzas — Greenhouse'
}

const FinanceDashboardPage = () => {
  return <FinanceDashboardView />
}

export default FinanceDashboardPage
