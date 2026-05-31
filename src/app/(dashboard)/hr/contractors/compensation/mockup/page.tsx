import type { Metadata } from 'next'

import ContractorCompensationMockupView from '@/views/greenhouse/contractors/mockup/ContractorCompensationMockupView'

export const metadata: Metadata = { title: 'Mockup compensación del contractor | Greenhouse' }
export const dynamic = 'force-dynamic'

const Page = () => <ContractorCompensationMockupView />

export default Page
