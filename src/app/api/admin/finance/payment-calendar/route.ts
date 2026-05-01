import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import {
  listPaymentCalendarItems,
  type PaymentCalendarItemKind,
  type PaymentCalendarItemState
} from '@/lib/finance/payment-calendar/list-calendar-items'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)

  try {
    const calendarStatesRaw = searchParams.get('calendarStates')
    const itemKindsRaw = searchParams.get('itemKinds')

    const items = await listPaymentCalendarItems({
      spaceId: searchParams.get('spaceId') || undefined,
      periodId: searchParams.get('periodId') || undefined,
      fromDate: searchParams.get('fromDate') || undefined,
      toDate: searchParams.get('toDate') || undefined,
      currency: (searchParams.get('currency') as 'CLP' | 'USD' | null) || undefined,
      beneficiaryType: searchParams.get('beneficiaryType') || undefined,
      calendarStates: calendarStatesRaw
        ? (calendarStatesRaw.split(',') as PaymentCalendarItemState[])
        : undefined,
      itemKinds: itemKindsRaw
        ? (itemKindsRaw.split(',') as PaymentCalendarItemKind[])
        : undefined
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error('GET payment-calendar failed', error)

    return NextResponse.json(
      { error: 'No fue posible cargar el calendario de pagos.' },
      { status: 500 }
    )
  }
}
