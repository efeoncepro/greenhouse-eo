import type { Metadata } from 'next'

import SuppliersListView from '@views/greenhouse/finance/SuppliersListView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Proveedores — Greenhouse'
}

const SuppliersPage = () => {
  return <SuppliersListView />
}

export default SuppliersPage
