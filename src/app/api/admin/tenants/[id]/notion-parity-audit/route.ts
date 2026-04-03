import { NextResponse } from 'next/server'

import { getDb } from '@/lib/db'
import { auditDeliveryNotionParity, type NotionParityPeriodField } from '@/lib/space-notion/notion-parity-audit'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const parsePositiveInteger = (value: string | null, fallback: number) => {
  if (!value) {
    return fallback
  }

  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

const parsePeriodField = (value: string | null): NotionParityPeriodField => (
  value === 'created_at' ? 'created_at' : 'due_date'
)

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const { id: clientId } = await params
  const year = parsePositiveInteger(searchParams.get('year'), new Date().getUTCFullYear())
  const month = parsePositiveInteger(searchParams.get('month'), new Date().getUTCMonth() + 1)
  const sampleLimit = parsePositiveInteger(searchParams.get('sampleLimit'), 50)
  const periodField = parsePeriodField(searchParams.get('periodField'))
  const assigneeSourceId = searchParams.get('assigneeSourceId')
  const db = await getDb()

  const space = await db
    .selectFrom('greenhouse_core.spaces')
    .select(['space_id', 'space_name', 'client_id'])
    .where('client_id', '=', clientId)
    .where('active', '=', true)
    .orderBy('created_at', 'asc')
    .executeTakeFirst()

  if (!space) {
    return NextResponse.json({ error: 'No active space found for this client' }, { status: 404 })
  }

  try {
    const audit = await auditDeliveryNotionParity({
      spaceId: space.space_id,
      year,
      month,
      periodField,
      assigneeSourceId,
      sampleLimit
    })

    return NextResponse.json({
      clientId,
      space: {
        spaceId: space.space_id,
        spaceName: space.space_name
      },
      audit
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to run Notion parity audit'

    return NextResponse.json({ error: message }, { status: 422 })
  }
}
