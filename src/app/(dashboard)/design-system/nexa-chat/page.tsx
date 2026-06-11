import type { Metadata } from 'next'

import NexaChatLabView from '@views/greenhouse/admin/design-system/NexaChatLabView'

// Internal Design System — Nexa Chat pattern (composición conversacional canónica, TASK-1078).
// Lives under /design-system (inherits the plataforma.design_system layout guard).

export const metadata: Metadata = {
  title: 'Nexa Chat — Design System'
}

const Page = () => <NexaChatLabView />

export default Page
