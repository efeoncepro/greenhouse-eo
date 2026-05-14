import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import {
  listMemberExternalIdentityCandidates,
  resolveMemberExternalIdentity
} from '@/lib/identity/reconciliation/member-scoped'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const dynamic = 'force-dynamic'

type ExternalIdentityBody = {
  action?: 'approve' | 'reject'
  sourceObjectId?: string
  note?: string
}

const requireExternalIdentityAccess = async (action: 'read' | 'update') => {
  const session = await getServerAuthSession()

  if (!session?.user) {
    return {
      session: null,
      response: NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
  }

  const tenant = await getTenantContext()

  if (!tenant) {
    return {
      session,
      response: NextResponse.json({ error: 'Sin contexto de tenant' }, { status: 403 })
    }
  }

  const subject = buildTenantEntitlementSubject(tenant)

  if (!can(subject, 'workforce.member.external_identity.resolve', action, 'tenant')) {
    return {
      session,
      response: NextResponse.json({ error: 'Forbidden — capability workforce.member.external_identity.resolve required' }, { status: 403 })
    }
  }

  return { session, response: null }
}

export const GET = async (_request: Request, { params }: { params: Promise<{ memberId: string }> }) => {
  const { response } = await requireExternalIdentityAccess('read')

  if (response) return response

  const { memberId } = await params

  try {
    return NextResponse.json(await listMemberExternalIdentityCandidates(memberId))
  } catch (error) {
    captureWithDomain(error instanceof Error ? error : new Error(String(error)), 'identity', {
      tags: { source: 'hr_workforce_member_external_identity_notion', stage: 'api_get' },
      extra: { memberId }
    })

    return NextResponse.json({ error: redactErrorForResponse(error) }, { status: 500 })
  }
}

export const POST = async (request: Request, { params }: { params: Promise<{ memberId: string }> }) => {
  const { session, response } = await requireExternalIdentityAccess('update')

  if (response) return response

  const { memberId } = await params
  const body = ((await request.json().catch(() => ({}))) as ExternalIdentityBody) ?? {}

  if (body.action !== 'approve' && body.action !== 'reject') {
    return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 })
  }

  if (!body.sourceObjectId) {
    return NextResponse.json({ error: 'sourceObjectId is required' }, { status: 400 })
  }

  try {
    const proposal = await resolveMemberExternalIdentity({
      memberId,
      sourceObjectId: body.sourceObjectId,
      decision: body.action,
      actor: session?.user?.email ?? 'unknown',
      note: body.note ?? null
    })

    return NextResponse.json({ proposal })
  } catch (error) {
    captureWithDomain(error instanceof Error ? error : new Error(String(error)), 'identity', {
      tags: { source: 'hr_workforce_member_external_identity_notion', stage: 'api_post' },
      extra: { memberId, sourceObjectId: body.sourceObjectId, action: body.action }
    })

    return NextResponse.json({ error: redactErrorForResponse(error) }, { status: 500 })
  }
}
