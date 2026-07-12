import { can } from '@/lib/entitlements/runtime'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'

/**
 * TASK-1392 — Autorización de los documentos de una Proposal (RFPs + deliverables).
 *
 * Un RFP y una oferta son documentos comerciales CONFIDENCIALES: los internos llevan loaded cost y
 * piso de negociación. El predicado es capability real (`commercial.proposal.read`), no routeGroup —
 * y los `client_*` NUNCA ven documentos de propuestas (defensa en profundidad: aunque un grant
 * futuro mal escrito les diera la capability, esta puerta no se abre).
 *
 * Nota de capas: esta función autoriza la DESCARGA del binario vía el asset store. El scope por
 * organización (owner_org_id) lo enforcean los readers/commands del dominio; el entitlement
 * per-ORG (`proposal_studio_v1`) gatea la operación de la capability a nivel de API/command.
 */
export const canAccessProposalDocument = (subject: TenantEntitlementSubject): boolean => {
  if (subject.tenantType === 'client') return false

  return can(subject, 'commercial.proposal.read', 'read')
}
