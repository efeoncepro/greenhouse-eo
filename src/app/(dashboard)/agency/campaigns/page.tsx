import type { Metadata } from 'next'

import AgencyCampaignsView from '@/views/agency/AgencyCampaignsView'

export const metadata: Metadata = { title: 'Campañas | Agencia | Greenhouse' }
export const dynamic = 'force-dynamic'
const Page = () => <AgencyCampaignsView />

export default Page
