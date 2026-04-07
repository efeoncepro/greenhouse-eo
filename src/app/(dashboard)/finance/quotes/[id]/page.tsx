import type { Metadata } from 'next'

import QuoteDetailView from '@views/greenhouse/finance/QuoteDetailView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Cotizacion — Greenhouse'
}

const QuoteDetailPage = () => {
  return <QuoteDetailView />
}

export default QuoteDetailPage
