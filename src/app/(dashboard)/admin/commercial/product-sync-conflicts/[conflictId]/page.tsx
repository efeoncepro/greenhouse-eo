import type { Metadata } from 'next'

import ProductSyncConflictDetailView from '@/views/greenhouse/admin/product-sync-conflicts/ProductSyncConflictDetailView'

export const metadata: Metadata = { title: 'Product Sync Conflict Detail | Admin Center | Greenhouse' }
export const dynamic = 'force-dynamic'

const Page = async ({ params }: { params: Promise<{ conflictId: string }> }) => {
  const { conflictId } = await params

  return <ProductSyncConflictDetailView conflictId={conflictId} />
}

export default Page
