import type { Metadata } from 'next'
import AgencyDeliveryView from '@/views/agency/AgencyDeliveryView'
export const metadata: Metadata = { title: 'Delivery | Agencia | Greenhouse' }
export const dynamic = 'force-dynamic'
const Page = () => <AgencyDeliveryView />
export default Page
