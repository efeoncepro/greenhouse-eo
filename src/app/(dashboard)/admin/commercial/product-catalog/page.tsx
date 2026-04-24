import type { Metadata } from 'next'

import ProductCatalogListView from '@/views/greenhouse/admin/product-catalog/ProductCatalogListView'
import { getProductCatalogListData } from '@/views/greenhouse/admin/product-catalog/data'

export const metadata: Metadata = {
  title: 'Catálogo de productos | Admin Center | Greenhouse'
}

export const dynamic = 'force-dynamic'

export default async function Page() {
  const data = await getProductCatalogListData()

  return <ProductCatalogListView data={data} />
}
