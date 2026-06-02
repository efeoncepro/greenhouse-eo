import type { Metadata } from 'next'

import ContractorAdminWorkbenchMockupView from '@/views/greenhouse/contractors/mockup/ContractorAdminWorkbenchMockupView'

export const metadata: Metadata = { title: 'Mockup contractor admin workbench | Greenhouse' }
export const dynamic = 'force-dynamic'

const Page = () => <ContractorAdminWorkbenchMockupView />

export default Page
