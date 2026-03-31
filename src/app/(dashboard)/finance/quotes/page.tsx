import type { Metadata } from 'next'

import QuotesListView from '@/views/greenhouse/finance/QuotesListView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Cotizaciones — Finance'
}

export default function QuotesPage() {
  return <QuotesListView />
}
