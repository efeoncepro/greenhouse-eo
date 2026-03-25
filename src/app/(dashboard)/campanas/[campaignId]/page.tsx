import type { Metadata } from 'next'

import GreenhouseClientCampaignDetail from '@/views/greenhouse/GreenhouseClientCampaignDetail'

export const metadata: Metadata = {
  title: 'Detalle de campaña | Greenhouse'
}

export const dynamic = 'force-dynamic'

const Page = async ({ params }: { params: Promise<{ campaignId: string }> }) => {
  const { campaignId } = await params

  return <GreenhouseClientCampaignDetail campaignId={campaignId} />
}

export default Page
