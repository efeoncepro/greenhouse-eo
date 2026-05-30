import type { Metadata } from 'next'

import ContractorSelfServiceMockupView from '@/views/greenhouse/contractors/mockup/ContractorSelfServiceMockupView'

export const metadata: Metadata = { title: 'Mockup contractor self-service | Greenhouse' }
export const dynamic = 'force-dynamic'

const Page = () => <ContractorSelfServiceMockupView />

export default Page
