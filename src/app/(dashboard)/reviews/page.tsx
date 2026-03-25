import type { Metadata } from 'next'

import GreenhouseReviewQueue from '@/views/greenhouse/GreenhouseReviewQueue'

export const metadata: Metadata = {
  title: 'Revisiones | Greenhouse'
}

export const dynamic = 'force-dynamic'

const Page = () => <GreenhouseReviewQueue />

export default Page
