import { can } from '@/lib/entitlements/runtime'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'

/**
 * TASK-1362 — Autorización de los documentos de un candidato.
 *
 * Sobre "ownership": la spec pedía autorizar "por capability hiring + ownership
 * del candidato". Un candidato NO es un tenant — no tiene `member_id` ni
 * `client_id`, se ancla por `identity_profile_id`/`candidate_facet_id`/
 * `application_id` — así que no hay un owner contra quien comparar. El ownership
 * se reduce a lo único que significa acá: quien opera Hiring en el tenant interno
 * ve los documentos de sus candidatos, y nadie más. Ese es el predicado.
 *
 * Cambio de comportamiento deliberado vs TASK-354: antes bastaba el routeGroup
 * `hr` para descargar el CV de un candidato, lo que le daba acceso a roles como
 * `hr_payroll`, que no operan Hiring ni tienen ninguna capability del módulo.
 * Ahora se exige la capability real. Es un cierre de over-exposure, no una
 * regresión — pero es la razón por la que un usuario de nómina deja de ver CVs.
 */
export const canAccessHiringCandidateDocument = (subject: TenantEntitlementSubject): boolean => {
  // Defensa en profundidad: los `client_*` NUNCA operan Hiring. La capability ya
  // lo garantiza (ningún rol cliente la tiene granteada), pero un grant futuro
  // mal escrito no puede convertirse en fuga de PII de candidatos.
  if (subject.tenantType === 'client') return false

  return can(subject, 'hiring.application.read', 'read', 'tenant')
}
