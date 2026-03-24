import type { Metadata } from 'next'

import CostAllocationsView from '@/views/greenhouse/finance/CostAllocationsView'

export const metadata: Metadata = {
  title: 'Asignaciones de costos | Finance | Greenhouse'
}

export const dynamic = 'force-dynamic'

const Page = () => <CostAllocationsView />

export default Page
