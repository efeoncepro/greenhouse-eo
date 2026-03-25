import type { Metadata } from 'next'
import AgencyOperationsView from '@/views/agency/AgencyOperationsView'
export const metadata: Metadata = { title: 'Operaciones | Agencia | Greenhouse' }
export const dynamic = 'force-dynamic'
const Page = () => <AgencyOperationsView />
export default Page
