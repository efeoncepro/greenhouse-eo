import type { Metadata } from 'next'

import NotificationsPageView from '@/views/greenhouse/notifications/NotificationsPageView'
import { requireViewCodeAccess } from '@/lib/client-portal/guards/require-view-code-access'

export const metadata: Metadata = {
  title: 'Notificaciones | Greenhouse'
}

export const dynamic = 'force-dynamic'

const Page = async () => {
  // TASK-827 Slice 4 — Page guard canonical resolver-based (closing gap: pre-Slice 4
  // /notifications NO tenía guard, vulnerable a navegación directa).
  await requireViewCodeAccess('cliente.notificaciones')

  return <NotificationsPageView />
}

export default Page
