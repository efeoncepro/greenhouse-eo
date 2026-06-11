import type { Metadata } from 'next'

import MyPerformanceEnterpriseMockupView from '@/views/greenhouse/my/performance/mockup/enterprise/MyPerformanceEnterpriseMockupView'

export const metadata: Metadata = { title: 'Mockup Mi desempeño (enterprise) | Greenhouse' }
export const dynamic = 'force-dynamic'

const Page = () => <MyPerformanceEnterpriseMockupView />

export default Page
