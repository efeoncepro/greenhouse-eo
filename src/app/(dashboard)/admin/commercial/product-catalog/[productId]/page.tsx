import { notFound } from 'next/navigation'

import type { Metadata } from 'next'


import ProductCatalogDetailView from '@/views/greenhouse/admin/product-catalog/ProductCatalogDetailView'
import { getProductCatalogDetailData } from '@/views/greenhouse/admin/product-catalog/detail-data'

export const metadata: Metadata = {
  title: 'Producto | Catálogo | Admin Center | Greenhouse'
}

export const dynamic = 'force-dynamic'

export default async function Page({
  params
}: {
  params: Promise<{ productId: string }>
}) {
  const { productId } = await params
  const data = await getProductCatalogDetailData(decodeURIComponent(productId))

  if (!data) notFound()

  return <ProductCatalogDetailView data={data} />
}
