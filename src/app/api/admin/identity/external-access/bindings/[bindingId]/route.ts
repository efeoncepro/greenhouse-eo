import { NextResponse } from 'next/server'

import {
  ExternalAccessError,
  getExternalOrganizationBinding,
  listExternalCapabilityGrants,
  listExternalMemberInvitations
} from '@/lib/identity/external-access'
import { externalAccessErrorResponse, requireExternalAccessOperator } from '@/lib/identity/external-access/http'

export const dynamic = 'force-dynamic'

/**
 * TASK-1631 — Detalle de un binding: grants + invitaciones/membership (sin token_hash).
 * `identity.external_binding.read`.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ bindingId: string }> }) {
  const { operator, response } = await requireExternalAccessOperator('identity.external_binding.read', 'read')

  if (!operator) return response

  try {
    const { bindingId } = await params
    const binding = await getExternalOrganizationBinding(bindingId)

    if (!binding) {
      throw new ExternalAccessError('not_found', 'binding not found', { bindingId })
    }

    const [grants, invitations] = await Promise.all([
      listExternalCapabilityGrants(bindingId),
      listExternalMemberInvitations(bindingId)
    ])

    return NextResponse.json({ binding, grants, invitations })
  } catch (error) {
    return externalAccessErrorResponse(error, 'admin.external-access.bindings.detail')
  }
}
