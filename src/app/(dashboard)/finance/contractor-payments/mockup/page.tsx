import type { Metadata } from 'next'

import ContractorPaymentsMockupView from '@/views/greenhouse/finance/contractor-payments/mockup/ContractorPaymentsMockupView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Mockup · Pagos a contractors | Greenhouse'
}

const ContractorPaymentsMockupPage = () => <ContractorPaymentsMockupView />

export default ContractorPaymentsMockupPage
