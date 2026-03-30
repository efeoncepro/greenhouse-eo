import { NextResponse } from 'next/server'

import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import { saveRoleViewAssignments, ViewAccessStoreError } from '@/lib/admin/view-access-store'

type SaveAssignmentsBody = {
  assignments?: Array<{
    roleCode?: string
    viewCode?: string
    granted?: boolean
  }>
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json().catch(() => null)) as SaveAssignmentsBody | null

    const assignments =
      body?.assignments
        ?.filter(
          assignment =>
            typeof assignment.roleCode === 'string' &&
            assignment.roleCode.trim().length > 0 &&
            typeof assignment.viewCode === 'string' &&
            assignment.viewCode.trim().length > 0 &&
            typeof assignment.granted === 'boolean'
        )
        .map(assignment => ({
          roleCode: assignment.roleCode!.trim(),
          viewCode: assignment.viewCode!.trim(),
          granted: assignment.granted as boolean
        })) ?? []

    if (assignments.length === 0) {
      return NextResponse.json({ error: 'Assignments payload is required.' }, { status: 400 })
    }

    const result = await saveRoleViewAssignments({
      assignments,
      actorUserId: tenant.userId
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ViewAccessStoreError && error.code === 'SCHEMA_NOT_READY') {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }

    console.error('Unable to save role view assignments.', error)

    return NextResponse.json({ error: 'Unable to save role view assignments.' }, { status: 500 })
  }
}
