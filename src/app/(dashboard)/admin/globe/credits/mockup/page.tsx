import type { Metadata } from 'next'

import { requireServerSession } from '@/lib/auth/require-server-session'
import GlobeCreditsOperationsWorkbenchView from '@/views/greenhouse/admin/globe/credits/GlobeCreditsOperationsWorkbenchView'
import { globeCreditsWorkbenchFixture } from '@/views/greenhouse/admin/globe/credits/globe-credits-workbench-fixture'

export const metadata: Metadata = { title: 'Mockup créditos Globe | Greenhouse' }
export const dynamic = 'force-dynamic'

export default async function Page() {
  await requireServerSession()

  return <GlobeCreditsOperationsWorkbenchView model={globeCreditsWorkbenchFixture} />
}
