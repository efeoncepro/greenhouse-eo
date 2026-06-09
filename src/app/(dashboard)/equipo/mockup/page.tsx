import type { Metadata } from 'next'

import AssignedTeamCommandPortfolioMockupView from '@/views/greenhouse/assigned-team/mockup/AssignedTeamCommandPortfolioMockupView'

export const metadata: Metadata = { title: 'Mockup Equipo asignado | Greenhouse' }
export const dynamic = 'force-dynamic'

const Page = () => <AssignedTeamCommandPortfolioMockupView />

export default Page
