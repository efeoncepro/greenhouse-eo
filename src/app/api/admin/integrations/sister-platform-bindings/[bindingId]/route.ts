import { NextResponse } from 'next/server'

import {
  getSisterPlatformBinding,
  SisterPlatformBindingError,
  updateSisterPlatformBinding
} from '@/lib/sister-platforms/bindings'
import type { UpdateSisterPlatformBindingInput } from '@/lib/sister-platforms/types'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ bindingId: string }>
}

export async function GET(_: Request, context: RouteContext) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { bindingId } = await context.params

  try {
    const binding = await getSisterPlatformBinding({ bindingId, tenant })

    if (!binding) {
      return NextResponse.json({ error: 'Binding not found' }, { status: 404 })
    }

    return NextResponse.json({ binding })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)

  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { bindingId } = await context.params

  try {
    const binding = await updateSisterPlatformBinding({
      bindingId,
      input: body as UpdateSisterPlatformBindingInput,
      tenant
    })

    return NextResponse.json({ binding })
  } catch (error) {
    if (error instanceof SisterPlatformBindingError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    const message = error instanceof Error ? error.message : 'Internal server error'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
