import type { Metadata } from 'next'

import GreenhouseDeliveryAnalytics from '@/views/greenhouse/GreenhouseDeliveryAnalytics'

export const metadata: Metadata = {
  title: 'Analytics | Greenhouse'
}

export const dynamic = 'force-dynamic'

const Page = () => <GreenhouseDeliveryAnalytics />

export default Page
