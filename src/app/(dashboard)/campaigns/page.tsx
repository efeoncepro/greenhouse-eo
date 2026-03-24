import type { Metadata } from 'next'

import CampaignListView from '@/views/greenhouse/campaigns/CampaignListView'

export const metadata: Metadata = {
  title: 'Campañas | Greenhouse'
}

export const dynamic = 'force-dynamic'

const Page = () => <CampaignListView />

export default Page
