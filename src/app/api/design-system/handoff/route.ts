import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { listAllowedDesignHandoffFiles } from '@/lib/design-system/handoff/allowlist'
import { DesignHandoffError } from '@/lib/design-system/handoff/state-machine'
import { createDesignHandoffEntry, listDesignHandoffEntries } from '@/lib/design-system/handoff/store'
import type { DesignHandoffKind } from '@/lib/design-system/handoff/types'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const READ_CAPABILITY = 'design_system.handoff.read' as const
const CREATE_CAPABILITY = 'design_system.handoff.create' as const

interface CreateBody {
  title?: unknown
  kind?: unknown
  url?: unknown
  nodeName?: unknown
}

const mapHandoffError = (error: DesignHandoffError) => {
  if (error.code === 'invalid_figma_url') return canonicalErrorResponse('invalid_figma_url')
  if (error.code === 'figma_file_not_allowed') return canonicalErrorResponse('figma_file_not_allowed')
  if (error.code === 'invalid_design_handoff_input') return canonicalErrorResponse('invalid_design_handoff_input')

  return canonicalErrorResponse('invalid_design_handoff_transition')
}

export async function GET() {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return unauthorizedResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, READ_CAPABILITY, 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden')
  }

  try {
    const [entries, allowedFiles] = await Promise.all([listDesignHandoffEntries(), listAllowedDesignHandoffFiles()])

    return NextResponse.json({ entries, allowedFiles })
  } catch (error) {
    captureWithDomain(error, 'platform', { tags: { source: 'design_handoff_list' } })

    return canonicalErrorResponse('internal_error')
  }
}

export async function POST(request: Request) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return unauthorizedResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, CREATE_CAPABILITY, 'create', 'tenant')) {
    return canonicalErrorResponse('forbidden')
  }

  let body: CreateBody = {}

  try {
    body = (await request.json()) as CreateBody
  } catch {
    return canonicalErrorResponse('invalid_figma_url')
  }

  if (typeof body.url !== 'string') {
    return canonicalErrorResponse('invalid_figma_url')
  }

  try {
    const entry = await createDesignHandoffEntry({
      title: typeof body.title === 'string' ? body.title : undefined,
      kind: body.kind === 'component' || body.kind === 'page' ? (body.kind as DesignHandoffKind) : undefined,
      url: body.url,
      nodeName: typeof body.nodeName === 'string' ? body.nodeName : null,
      actorUserId: tenant.userId
    })

    return NextResponse.json({ ok: true, entry })
  } catch (error) {
    if (error instanceof DesignHandoffError) {
      return mapHandoffError(error)
    }

    captureWithDomain(error, 'platform', { tags: { source: 'design_handoff_create' } })

    return canonicalErrorResponse('internal_error')
  }
}
