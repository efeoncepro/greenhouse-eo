import type { Metadata } from 'next'

import SupplierDetailView from '@views/greenhouse/finance/SupplierDetailView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Proveedor — Greenhouse'
}

const SupplierDetailPage = () => {
  return <SupplierDetailView />
}

export default SupplierDetailPage
