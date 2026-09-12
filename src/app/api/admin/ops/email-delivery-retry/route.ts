import { NextResponse } from 'next/server'

import { processFailedEmailDeliveries, reviveDeadLetterEmailDeliveries } from '@/lib/email/delivery'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const parseStringArray = (value: unknown): string[] | undefined =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0) : undefined

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // ISSUE-172 — cuerpo opcional `{ reviveDeadLetter: { reason, deliveryIds?, emailTypes?, sinceHours?, limit? } }`:
    // revive entregas `dead_letter` por el camino gobernado (motivo forense en la fila) y luego corre
    // el ciclo normal de reintento, que es quien reenvía. Sin cuerpo, se comporta como siempre.
    const body = await request.json().catch(() => ({})) as Record<string, unknown>

    const revive = body.reviveDeadLetter && typeof body.reviveDeadLetter === 'object'
      ? body.reviveDeadLetter as Record<string, unknown>
      : null

    const revived = revive
      ? await reviveDeadLetterEmailDeliveries({
          reason: typeof revive.reason === 'string' ? revive.reason : '',
          deliveryIds: parseStringArray(revive.deliveryIds),
          emailTypes: parseStringArray(revive.emailTypes),
          sinceHours: typeof revive.sinceHours === 'number' ? revive.sinceHours : undefined,
          limit: typeof revive.limit === 'number' ? revive.limit : undefined
        })
      : null

    const result = await processFailedEmailDeliveries(25)

    return NextResponse.json(revived ? { ...result, revived } : result)
  } catch (error) {
    console.error('[email-delivery-retry] Error:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 502 }
    )
  }
}
