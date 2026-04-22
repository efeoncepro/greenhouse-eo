import type { Metadata } from 'next'

import ProductSyncConflictsListView from '@/views/greenhouse/admin/product-sync-conflicts/ProductSyncConflictsListView'
import {
  PRODUCT_SYNC_CONFLICT_RESOLUTIONS,
  PRODUCT_SYNC_CONFLICT_TYPES,
  type ProductSyncConflictResolution,
  type ProductSyncConflictType
} from '@/views/greenhouse/admin/product-sync-conflicts/types'

export const metadata: Metadata = { title: 'Product Sync Conflicts | Admin Center | Greenhouse' }
export const dynamic = 'force-dynamic'

const pickSingle = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

const Page = async ({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) => {
  const params = await searchParams
  const query = pickSingle(params.q) ?? ''
  const type = pickSingle(params.type)
  const status = pickSingle(params.status)

  const initialType =
    type && PRODUCT_SYNC_CONFLICT_TYPES.includes(type as ProductSyncConflictType)
      ? (type as ProductSyncConflictType)
      : 'all'

  const initialStatus =
    status && PRODUCT_SYNC_CONFLICT_RESOLUTIONS.includes(status as ProductSyncConflictResolution)
      ? (status as ProductSyncConflictResolution)
      : 'all'

  return <ProductSyncConflictsListView initialQuery={query} initialType={initialType} initialStatus={initialStatus} />
}

export default Page
