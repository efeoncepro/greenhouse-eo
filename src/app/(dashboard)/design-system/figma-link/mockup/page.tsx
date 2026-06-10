import type { Metadata } from 'next'

import FigmaNodeLinkMockupView from '@views/greenhouse/admin/design-system/figma-link/mockup/FigmaNodeLinkMockupView'

// Internal Design System mockup harness for the Figma node link affordance (TASK-1072).
// Lives under /design-system (inherits the plataforma.design_system layout guard).
// Mockup route — excluded from route-reachability; GVC harness only.

export const metadata: Metadata = {
  title: 'Vincular nodo Figma — mockup'
}

const Page = () => <FigmaNodeLinkMockupView />

export default Page
