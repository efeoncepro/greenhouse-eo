import type { Metadata } from 'next'

import ContractorOnboardingMockupView from '@/views/greenhouse/contractors/mockup/ContractorOnboardingMockupView'

export const metadata: Metadata = { title: 'Mockup contractor onboarding | Greenhouse' }
export const dynamic = 'force-dynamic'

const Page = () => <ContractorOnboardingMockupView />

export default Page
