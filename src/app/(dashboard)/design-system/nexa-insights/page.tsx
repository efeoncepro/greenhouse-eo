import type { Metadata } from 'next'

import NexaInsightsLabView from '@views/greenhouse/admin/design-system/NexaInsightsLabView'

// Internal Design System Lab — Nexa Insights pattern (TASK-1075 follow-up).
// Lives under /design-system (inherits the plataforma.design_system layout guard).

export const metadata: Metadata = {
  title: 'Nexa Insights — Design System'
}

const Page = () => <NexaInsightsLabView />

export default Page
