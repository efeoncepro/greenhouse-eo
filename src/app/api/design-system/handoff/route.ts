import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { listAllowedDesignHandoffFiles } from '@/lib/design-system/handoff/allowlist'
import { DesignHandoffError } from '@/lib/design-system/handoff/state-machine'
import { createDesignHandoffEntry, listDesignHandoffEntries } from '@/lib/design-system/handoff/store'
import type { DesignHandoffKind } from '@/lib/design-system/handoff/types'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireTenantContext } from '@/lib/tenant/authorization'

import { mapDesignHandoffError, runDesignHandoffCommand } from './api-helpers'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const READ_CAPABILITY = 'design_system.handoff.read' as const
const CREATE_CAPABILITY = 'design_system.handoff.create' as const

interface CreateBody {
  title?: unknown
  kind?: unknown
  url?: unknown
  nodeName?: unknown
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

  const url = body.url

  try {
    return await runDesignHandoffCommand({
      tenant,
      request,
      routeKey: 'design_system.handoff.create',
      body,
      run: async () => ({
        ok: true,
        entry: await createDesignHandoffEntry({
          title: typeof body.title === 'string' ? body.title : undefined,
          kind: body.kind === 'component' || body.kind === 'page' ? (body.kind as DesignHandoffKind) : undefined,
          url,
          nodeName: typeof body.nodeName === 'string' ? body.nodeName : null,
          actorUserId: tenant.userId
        })
      })
    })
  } catch (error) {
    if (error instanceof DesignHandoffError) {
      return mapDesignHandoffError(error)
    }

    captureWithDomain(error, 'platform', { tags: { source: 'design_handoff_create' } })

    return canonicalErrorResponse('internal_error')
  }
}
