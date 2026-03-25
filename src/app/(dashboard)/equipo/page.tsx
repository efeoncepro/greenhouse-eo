import type { Metadata } from 'next'

import GreenhouseClientTeam from '@/views/greenhouse/GreenhouseClientTeam'

export const metadata: Metadata = {
  title: 'Mi Equipo | Greenhouse'
}

export const dynamic = 'force-dynamic'

const Page = () => <GreenhouseClientTeam />

export default Page
