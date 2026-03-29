import type { Metadata } from 'next'

import MyDeliveryView from '@/views/greenhouse/my/MyDeliveryView'

export const metadata: Metadata = { title: 'Mi Delivery | Greenhouse' }
export const dynamic = 'force-dynamic'
const Page = () => <MyDeliveryView />

export default Page
