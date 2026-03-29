import type { Metadata } from 'next'

import MyPayrollView from '@/views/greenhouse/my/MyPayrollView'

export const metadata: Metadata = { title: 'Mi Nómina | Greenhouse' }
export const dynamic = 'force-dynamic'
const Page = () => <MyPayrollView />

export default Page
