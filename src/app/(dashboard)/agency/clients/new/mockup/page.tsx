import type { Metadata } from 'next'

import ClientOnboardingMockupView from '@/views/greenhouse/agency/clients/mockup/ClientOnboardingMockupView'

export const metadata: Metadata = { title: 'Mockup alta de cliente | Greenhouse' }
export const dynamic = 'force-dynamic'

const Page = () => <ClientOnboardingMockupView />

export default Page
