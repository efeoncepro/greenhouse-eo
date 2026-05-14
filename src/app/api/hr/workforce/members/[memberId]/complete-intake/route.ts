import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import {
  completeWorkforceMemberIntake,
  type CompleteWorkforceIntakeBody
} from '@/lib/workforce/intake/complete-intake'

export const dynamic = 'force-dynamic'

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) => {
  const session = await getServerAuthSession()

  if (!session?.user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const tenant = await getTenantContext()

  if (!tenant) {
    return NextResponse.json({ error: 'Sin contexto de tenant' }, { status: 403 })
  }

  const { memberId } = await params
  let body: CompleteWorkforceIntakeBody = {}

  try {
    body = ((await request.json().catch(() => ({}))) as CompleteWorkforceIntakeBody) ?? {}
  } catch {
    body = {}
  }

  return completeWorkforceMemberIntake({ memberId, tenant, body })
}
