import type { Metadata } from 'next'

import ClientsListView from '@views/greenhouse/finance/ClientsListView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Clientes — Greenhouse'
}

const ClientsPage = () => {
  return <ClientsListView />
}

export default ClientsPage
