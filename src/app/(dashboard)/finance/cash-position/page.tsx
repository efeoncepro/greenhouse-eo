import type { Metadata } from 'next'

import CashPositionView from '@views/greenhouse/finance/CashPositionView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Posición de caja — Greenhouse'
}

const CashPositionPage = () => {
  return <CashPositionView />
}

export default CashPositionPage
