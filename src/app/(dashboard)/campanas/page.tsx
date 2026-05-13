import type { Metadata } from 'next'

import GreenhouseClientCampaigns from '@/views/greenhouse/GreenhouseClientCampaigns'
import { requireViewCodeAccess } from '@/lib/client-portal/guards/require-view-code-access'

export const metadata: Metadata = {
  title: 'Campañas | Greenhouse'
}

export const dynamic = 'force-dynamic'

const Page = async () => {
  // TASK-827 Slice 4 — Page guard canonical resolver-based (closing gap: pre-Slice 4
  // /campanas NO tenía guard, vulnerable a navegación directa).
  await requireViewCodeAccess('cliente.campanas')

  return <GreenhouseClientCampaigns />
}

export default Page
