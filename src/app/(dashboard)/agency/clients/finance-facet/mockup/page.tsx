import type { Metadata } from 'next'

import FinanceFacetDrawerMockup from '@/views/greenhouse/agency/clients/mockup/FinanceFacetDrawerMockup'

export const metadata: Metadata = { title: 'Mockup perfil financiero | Greenhouse' }
export const dynamic = 'force-dynamic'

const Page = () => <FinanceFacetDrawerMockup />

export default Page
