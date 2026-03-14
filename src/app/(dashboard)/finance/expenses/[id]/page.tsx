import type { Metadata } from 'next'

import ExpenseDetailView from '@views/greenhouse/finance/ExpenseDetailView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Egreso — Greenhouse'
}

const ExpenseDetailPage = () => {
  return <ExpenseDetailView />
}

export default ExpenseDetailPage
