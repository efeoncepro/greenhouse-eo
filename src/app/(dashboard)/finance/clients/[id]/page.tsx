import type { Metadata } from 'next'
import ClientDetailView from '@views/greenhouse/finance/ClientDetailView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Cliente — Greenhouse'
}

const ClientDetailPage = () => {
  return <ClientDetailView />
}

export default ClientDetailPage
