import type { Metadata } from 'next'

import ContractorEngagementDetailMockupView from '@/views/greenhouse/contractors/mockup/ContractorEngagementDetailMockupView'

export const metadata: Metadata = { title: 'Mockup contractor engagement detail | Greenhouse' }
export const dynamic = 'force-dynamic'

const Page = () => <ContractorEngagementDetailMockupView />

export default Page
