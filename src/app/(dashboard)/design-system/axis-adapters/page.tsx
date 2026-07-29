import type { Metadata } from 'next'

import AxisAdaptersLabView from '@views/greenhouse/admin/design-system/AxisAdaptersLabView'

export const metadata: Metadata = {
  title: 'AXIS adapters Lab — Design System | Greenhouse'
}

export default function Page() {
  return <AxisAdaptersLabView />
}
