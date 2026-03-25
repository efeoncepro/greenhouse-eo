import type { Metadata } from 'next'
import MyPerformanceView from '@/views/greenhouse/my/MyPerformanceView'
export const metadata: Metadata = { title: 'Mi Desempeño | Greenhouse' }
export const dynamic = 'force-dynamic'
const Page = () => <MyPerformanceView />
export default Page
