import { NextResponse } from 'next/server'

import { listLeaveCalendar, listLeaveRequests } from '@/lib/hr-core/service'
import { requireMyTenantContext } from '@/lib/tenant/authorization'
import { getPersonHrContext } from '@/lib/person-360/get-person-hr'

export const dynamic = 'force-dynamic'

const pad2 = (value: number) => String(value).padStart(2, '0')

const getDefaultCalendarWindow = () => {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() + 1

  return {
    from: `${year}-${pad2(month)}-01`,
    to: new Date(Date.UTC(year, month + 2, 0)).toISOString().slice(0, 10),
    year
  }
}

export async function GET(request: Request) {
  const { tenant, memberId, errorResponse } = await requireMyTenantContext()

  if (!tenant || !memberId) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const defaults = getDefaultCalendarWindow()
    const from = searchParams.get('from') ?? defaults.from
    const to = searchParams.get('to') ?? defaults.to
    const year = Number(searchParams.get('year') ?? defaults.year)

    const [hr, requests, calendar] = await Promise.all([
      getPersonHrContext(memberId),
      listLeaveRequests({
        tenant,
        memberId,
        year
      }),
      listLeaveCalendar({
        tenant,
        memberId,
        from,
        to
      })
    ])

    return NextResponse.json({
      leave: hr?.leave ?? null,
      memberId,
      requests,
      calendar
    })
  } catch (error) {
    console.error('GET /api/my/leave failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
