import type { Metadata } from 'next'

import CampaignDetailView from '@/views/greenhouse/campaigns/CampaignDetailView'

export const metadata: Metadata = {
  title: 'Detalle de campaña | Greenhouse'
}

export const dynamic = 'force-dynamic'

const Page = async ({ params }: { params: Promise<{ campaignId: string }> }) => {
  const { campaignId } = await params

  return <CampaignDetailView campaignId={campaignId} />
}

export default Page
