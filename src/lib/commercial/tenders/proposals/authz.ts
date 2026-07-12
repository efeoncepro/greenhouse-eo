import 'server-only'

/**
 * Proposal Studio F0 — LA PUERTA de acceso (TASK-1392 Slice 4).
 *
 * Dos capas, en este orden y SIEMPRE juntas:
 *   1. ENTITLEMENT PER-ORG (`module_assignments`: proposal_studio_v1) — la capability se CONTRATA
 *      por organización; un rol no se factura, un módulo sí. Sin assignment activo, ningún rol
 *      abre nada (default OFF en todos los ambientes).
 *   2. CAPABILITY del actor (`can()`) — autoriza la operación DENTRO de una org habilitada.
 *
 * TODO consumer (API route, CLI, tools del intake agent, futuros UI/Nexa/MCP) pasa por acá antes
 * de tocar un primitive. Los `client_*` nunca operan propuestas en F0 (defensa en profundidad
 * además de las capabilities, que ningún rol cliente tiene).
 */

import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { can } from '@/lib/entitlements/runtime'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

import { ProposalEntitlementError, ProposalForbiddenError } from './errors'
import type { ProposalActor } from './types'

export const PROPOSAL_STUDIO_MODULE_KEY = 'proposal_studio_v1'

export type ProposalAccessNeed = 'read' | 'create' | 'update' | 'execute' | 'approve'

const NEED_TO_CAPABILITY: Record<ProposalAccessNeed, { capability: 'commercial.proposal.read' | 'commercial.proposal.manage' | 'commercial.proposal.gate'; action: 'read' | 'create' | 'update' | 'execute' | 'approve' }> = {
  read: { capability: 'commercial.proposal.read', action: 'read' },
  create: { capability: 'commercial.proposal.manage', action: 'create' },
  update: { capability: 'commercial.proposal.manage', action: 'update' },
  execute: { capability: 'commercial.proposal.manage', action: 'execute' },
  approve: { capability: 'commercial.proposal.gate', action: 'approve' }
}

export const assertProposalStudioAccess = async (input: {
  tenant: TenantContext
  ownerOrgId: string
  need: ProposalAccessNeed
}): Promise<{ actor: ProposalActor }> => {
  const { tenant, ownerOrgId, need } = input

  if (tenant.tenantType === 'client') {
    throw new ProposalForbiddenError(need)
  }

  const { capability, action } = NEED_TO_CAPABILITY[need]
  const subject = buildTenantEntitlementSubject(tenant)

  if (!can(subject, capability, action)) {
    throw new ProposalForbiddenError(need)
  }

  // La puerta que se factura: el módulo debe estar asignado a la org DUEÑA de la propuesta.
  // SQL directo a module_assignments (patrón AI Visibility resolveAeoEntitlement): client_portal
  // es hoja del DAG y un dominio producer no puede importar su resolver (lint del repo).
  const assignments = await runGreenhousePostgresQuery<{ assignment_id: string }>(
    `SELECT assignment_id
       FROM greenhouse_client_portal.module_assignments
      WHERE organization_id = $1
        AND module_key = $2
        AND effective_to IS NULL
        AND status IN ('active', 'pilot')
        AND (expires_at IS NULL OR expires_at > now())
      LIMIT 1`,
    [ownerOrgId, PROPOSAL_STUDIO_MODULE_KEY]
  )

  if (!assignments[0]) {
    throw new ProposalEntitlementError(ownerOrgId)
  }

  return {
    actor: tenant.memberId ? { kind: 'member', memberId: tenant.memberId } : { kind: 'system' }
  }
}
