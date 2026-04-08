import type { Metadata } from 'next'

import PaymentInstrumentsListView from '@/views/greenhouse/admin/payment-instruments/PaymentInstrumentsListView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Instrumentos de pago — Greenhouse'
}

const Page = () => <PaymentInstrumentsListView />

export default Page
