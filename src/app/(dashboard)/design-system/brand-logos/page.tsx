import type { Metadata } from 'next'

import BrandLogoLabView from '@views/greenhouse/admin/design-system/BrandLogoLabView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Brand Logo Variations — Design System | Greenhouse'
}

export default function Page() {
  return <BrandLogoLabView />
}
