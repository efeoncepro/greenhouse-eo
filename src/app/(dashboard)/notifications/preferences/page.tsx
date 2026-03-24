import type { Metadata } from 'next'

import NotificationPreferencesView from '@/views/greenhouse/notifications/NotificationPreferencesView'

export const metadata: Metadata = {
  title: 'Preferencias de notificación | Greenhouse'
}

export const dynamic = 'force-dynamic'

const Page = () => <NotificationPreferencesView />

export default Page
