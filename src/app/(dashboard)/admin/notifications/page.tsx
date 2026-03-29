import type { Metadata } from 'next'

import { getAdminNotificationsOverview } from '@/lib/admin/get-admin-notifications-overview'
import AdminNotificationsView from '@/views/greenhouse/admin/AdminNotificationsView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Notificaciones — Admin Center'
}

export default async function AdminNotificationsPage() {
  const data = await getAdminNotificationsOverview()

  return <AdminNotificationsView data={data} />
}
