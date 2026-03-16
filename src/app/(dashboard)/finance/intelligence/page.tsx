import type { Metadata } from 'next'

import ClientEconomicsView from '@views/greenhouse/finance/ClientEconomicsView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Inteligencia financiera — Greenhouse'
}

const IntelligencePage = () => {
  return <ClientEconomicsView />
}

export default IntelligencePage
