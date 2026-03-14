import type { Metadata } from 'next'

import ExpensesListView from '@views/greenhouse/finance/ExpensesListView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Egresos — Greenhouse'
}

const ExpensesPage = () => {
  return <ExpensesListView />
}

export default ExpensesPage
