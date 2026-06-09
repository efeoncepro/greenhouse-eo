import type { Metadata } from 'next'

import MyPerformanceMockupView from '@/views/greenhouse/my/performance/mockup/MyPerformanceMockupView'

export const metadata: Metadata = { title: 'Mockup Mi desempeño | Greenhouse' }
export const dynamic = 'force-dynamic'

const Page = () => <MyPerformanceMockupView />

export default Page
