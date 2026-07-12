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
 * TODO consumer (API route, CLI, tools del intake agent, Nexa, futuros UI/MCP) pasa por acá antes
 * de tocar un primitive. Los `client_*` nunca operan propuestas en F0 (defensa en profundidad
 * además de las capabilities, que ningún rol cliente tiene).
 *
 * ⚠️ TASK-1399 — DOS entradas, UNA puerta. El núcleo (`assertProposalStudioAccessForSubject`) opera
 * sobre el `TenantEntitlementSubject` canónico; `assertProposalStudioAccess` es el adapter para
 * quien ya tiene un `TenantContext` (las rutas). Nexa entra por el núcleo con el subject derivado de
 * su sesión. **NUNCA** escribas un segundo gate para un consumer nuevo: una puerta duplicada es
 * exactamente el drift que termina dejando pasar una org sin módulo contratado.
 */

import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { can } from '@/lib/entitlements/runtime'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

import { ProposalEntitlementError, ProposalForbiddenError } from './errors'
import type { ProposalActor } from './types'

export const PROPOSAL_STUDIO_MODULE_KEY = 'proposal_studio_v1'

export type ProposalAccessNeed = 'read' | 'create' | 'update' | 'execute' | 'approve' | 'render_propose' | 'render_execute' | 'render_read' | 'render_retry'

const NEED_TO_CAPABILITY: Record<
  ProposalAccessNeed,
  {
    capability: 'commercial.proposal.read' | 'commercial.proposal.manage' | 'commercial.proposal.gate' | 'commercial.proposal.render'
    action: 'read' | 'create' | 'update' | 'execute' | 'approve'
  }
> = {
  read: { capability: 'commercial.proposal.read', action: 'read' },
  create: { capability: 'commercial.proposal.manage', action: 'create' },
  update: { capability: 'commercial.proposal.manage', action: 'update' },
  execute: { capability: 'commercial.proposal.manage', action: 'execute' },
  approve: { capability: 'commercial.proposal.gate', action: 'approve' },
  // `propose` no escribe (el agente solo lee para proponer) y `retry` ES re-ejecutar:
  // se mapean a los verbos canónicos sin extender el vocabulario de plataforma.
  render_propose: { capability: 'commercial.proposal.render', action: 'read' },
  render_execute: { capability: 'commercial.proposal.render', action: 'execute' },
  render_read: { capability: 'commercial.proposal.render', action: 'read' },
  render_retry: { capability: 'commercial.proposal.render', action: 'execute' }
}

/**
 * EL NÚCLEO. Recibe el subject canónico de entitlements — el mismo que produce una ruta desde su
 * `TenantContext` y el mismo que produce Nexa desde su sesión. Cualquier consumer nuevo entra por acá.
 */
export const assertProposalStudioAccessForSubject = async (input: {
  subject: TenantEntitlementSubject
  ownerOrgId: string
  need: ProposalAccessNeed
}): Promise<{ actor: ProposalActor }> => {
  const { subject, ownerOrgId, need } = input

  if (subject.tenantType === 'client') {
    throw new ProposalForbiddenError(need)
  }

  const { capability, action } = NEED_TO_CAPABILITY[need]

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
    actor: subject.memberId ? { kind: 'member', memberId: subject.memberId } : { kind: 'system' }
  }
}

/** Adapter para consumers que ya tienen `TenantContext` (las API routes). Misma puerta, misma lógica. */
export const assertProposalStudioAccess = async (input: {
  tenant: TenantContext
  ownerOrgId: string
  need: ProposalAccessNeed
}): Promise<{ actor: ProposalActor }> =>
  assertProposalStudioAccessForSubject({
    subject: buildTenantEntitlementSubject(input.tenant),
    ownerOrgId: input.ownerOrgId,
    need: input.need
  })
