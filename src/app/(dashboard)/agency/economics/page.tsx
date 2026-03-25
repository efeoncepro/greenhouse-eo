import type { Metadata } from 'next'
import AgencyEconomicsView from '@/views/agency/AgencyEconomicsView'
export const metadata: Metadata = { title: 'Economía | Agencia | Greenhouse' }
export const dynamic = 'force-dynamic'
const Page = () => <AgencyEconomicsView />
export default Page
