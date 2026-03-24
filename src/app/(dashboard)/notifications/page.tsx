import type { Metadata } from 'next'

import NotificationsPageView from '@/views/greenhouse/notifications/NotificationsPageView'

export const metadata: Metadata = {
  title: 'Notificaciones | Greenhouse'
}

export const dynamic = 'force-dynamic'

const Page = () => <NotificationsPageView />

export default Page
