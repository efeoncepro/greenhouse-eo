import type { Metadata } from 'next'
import MyOrganizationView from '@/views/greenhouse/my/MyOrganizationView'
export const metadata: Metadata = { title: 'Mi Organización | Greenhouse' }
export const dynamic = 'force-dynamic'
const Page = () => <MyOrganizationView />
export default Page
