import type { Metadata } from 'next'

import ProductCatalogView from '@/views/greenhouse/finance/ProductCatalogView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Productos — Comercial'
}

export default function FinanceProductsPage() {
  return <ProductCatalogView />
}
