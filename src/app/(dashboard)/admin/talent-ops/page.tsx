import type { Metadata } from 'next'

import TalentOpsDashboardView from '@/views/greenhouse/admin/TalentOpsDashboardView'

export const metadata: Metadata = { title: 'Salud del talento | Admin Center | Greenhouse' }
export const dynamic = 'force-dynamic'

const TalentOpsPage = () => <TalentOpsDashboardView />

export default TalentOpsPage
