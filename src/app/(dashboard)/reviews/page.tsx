import { redirect } from 'next/navigation'

import type { Metadata } from 'next'


import GreenhouseReviewQueue from '@/views/greenhouse/GreenhouseReviewQueue'
import { requireViewCodeAccess } from '@/lib/client-portal/guards/require-view-code-access'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const metadata: Metadata = {
  title: 'Revisiones | Greenhouse'
}

export const dynamic = 'force-dynamic'

const Page = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  // TASK-827 Slice 4 — Page guard canonical resolver-based.
  await requireViewCodeAccess('cliente.revisiones')

  return <GreenhouseReviewQueue />
}

export default Page
