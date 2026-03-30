import type { Metadata } from 'next'

import AdminOperationalCalendarView from '@/views/greenhouse/admin/AdminOperationalCalendarView'
import { getAdminOperationalCalendarOverview } from '@/lib/calendar/get-admin-operational-calendar-overview'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Calendario operativo | Admin Center | Greenhouse'
}

export default async function Page({
  searchParams
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const data = await getAdminOperationalCalendarOverview(resolvedSearchParams.month)

  return <AdminOperationalCalendarView data={data} />
}
