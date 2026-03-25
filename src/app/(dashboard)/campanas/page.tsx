import type { Metadata } from 'next'

import GreenhouseClientCampaigns from '@/views/greenhouse/GreenhouseClientCampaigns'

export const metadata: Metadata = {
  title: 'Campañas | Greenhouse'
}

export const dynamic = 'force-dynamic'

const Page = () => <GreenhouseClientCampaigns />

export default Page
