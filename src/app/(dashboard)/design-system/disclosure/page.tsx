import type { Metadata } from 'next'

import DisclosureLabView from '@views/greenhouse/admin/design-system/DisclosureLabView'

// Internal Design System Lab — GreenhouseDisclosureTrigger + GreenhouseAnchoredDisclosure (TASK-1072).
// Lives under /design-system (inherits the plataforma.design_system layout guard).

export const metadata: Metadata = {
  title: 'Disclosure — Design System'
}

const Page = () => <DisclosureLabView />

export default Page
