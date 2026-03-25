import type { Metadata } from 'next'
import AgencyTeamView from '@/views/agency/AgencyTeamView'
export const metadata: Metadata = { title: 'Equipo | Agencia | Greenhouse' }
export const dynamic = 'force-dynamic'
const Page = () => <AgencyTeamView />
export default Page
