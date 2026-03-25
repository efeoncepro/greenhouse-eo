import type { Metadata } from 'next'
import MyDashboardView from '@/views/greenhouse/my/MyDashboardView'
export const metadata: Metadata = { title: 'Mi Greenhouse | Greenhouse' }
export const dynamic = 'force-dynamic'
const Page = () => <MyDashboardView />
export default Page
