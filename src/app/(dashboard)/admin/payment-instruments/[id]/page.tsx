import type { Metadata } from 'next'

import PaymentInstrumentDetailView from '@/views/greenhouse/admin/payment-instruments/PaymentInstrumentDetailView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Instrumento de pago - Greenhouse'
}

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  return <PaymentInstrumentDetailView accountId={id} />
}

export default Page
