import type { Metadata } from 'next'

import BankView from '@views/greenhouse/finance/BankView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Banco — Greenhouse'
}

const BankPage = () => {
  return <BankView />
}

export default BankPage
