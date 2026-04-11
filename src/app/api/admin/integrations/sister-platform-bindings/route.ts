import { NextResponse } from 'next/server'

import {
  createSisterPlatformBinding,
  listSisterPlatformBindings,
  SisterPlatformBindingError
} from '@/lib/sister-platforms/bindings'
import type { CreateSisterPlatformBindingInput, SisterPlatformBindingStatus } from '@/lib/sister-platforms/types'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const sisterPlatformKey = searchParams.get('sisterPlatformKey')
  const bindingStatus = searchParams.get('bindingStatus')
  const limit = Number(searchParams.get('limit') || '50')

  try {
    const bindings = await listSisterPlatformBindings({
      tenant,
      sisterPlatformKey,
      bindingStatus: bindingStatus as SisterPlatformBindingStatus | null,
      limit
    })

    return NextResponse.json({ bindings })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)

  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const binding = await createSisterPlatformBinding({
      input: body as CreateSisterPlatformBindingInput,
      tenant
    })

    return NextResponse.json({ binding }, { status: 201 })
  } catch (error) {
    if (error instanceof SisterPlatformBindingError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    const message = error instanceof Error ? error.message : 'Internal server error'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
