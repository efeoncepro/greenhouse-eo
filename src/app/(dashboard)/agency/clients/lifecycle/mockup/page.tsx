import type { Metadata } from 'next'

import LifecycleTimelineMockup from '@/views/greenhouse/agency/clients/mockup/LifecycleTimelineMockup'

export const metadata: Metadata = { title: 'Mockup recorrido del cliente | Greenhouse' }
export const dynamic = 'force-dynamic'

const Page = () => <LifecycleTimelineMockup />

export default Page
