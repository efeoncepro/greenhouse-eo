import 'server-only'

import { resolveAccountScope } from '@/lib/account-360/resolve-scope'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { listFinanceContactSuggestionsForCompany } from './finance-contact-suggestions'
import { suggestClientPortalRole, type ClientPortalRole } from './client-portal-roles'

/**
 * TASK-1001 — read API (CQRS-lite) de candidatos a usuario de portal cliente.
 *
 * Siembra desde los contactos HubSpot ya capturados (misma primitiva que el wizard,
 * TASK-997) + sugiere rol por cargo + marca quién ya fue invitado. El operador
 * confirma/ajusta el rol antes de invitar. Degradación honesta: si la org aún no
 * tiene Cliente o el bridge HubSpot cae, devuelve `degraded` con razón — NUNCA
 * lista vacía silenciosa.
 */
export type CandidateDegradedReason = 'client_not_ready' | 'hubspot_unavailable'

export interface ClientPortalPersonCandidate {
  hubspotContactId: string | null
  name: string
  email: string | null
  jobTitle: string | null
  suggestedRole: ClientPortalRole
  /** Ya tiene un client_user para este cliente (dedup por email) → no re-invitar. */
  alreadyInvited: boolean
}

export interface ClientPortalCandidatesResult {
  clientId: string | null
  candidates: ClientPortalPersonCandidate[]
  degraded: boolean
  degradedReason?: CandidateDegradedReason
}

export const listClientPortalPersonCandidates = async (
  organizationId: string
): Promise<ClientPortalCandidatesResult> => {
  const scope = await resolveAccountScope(organizationId)
  const clientId = scope?.clientIds?.[0] ?? null

  // Sin Cliente canónico no se puede invitar (client_users.client_id es FK NOT NULL en el INSERT).
  if (!clientId) {
    return { clientId: null, candidates: [], degraded: true, degradedReason: 'client_not_ready' }
  }

  let suggestions

  try {
    suggestions = await listFinanceContactSuggestionsForCompany(scope?.hubspotCompanyId)
  } catch {
    // El fallback en vivo del bridge HubSpot lanzó → degradar honesto (la UI cae a "agregar manual").
    return { clientId, candidates: [], degraded: true, degradedReason: 'hubspot_unavailable' }
  }

  // Set de emails ya invitados para este cliente (dedup → no ofrecer re-invitar).
  const invitedRows = await runGreenhousePostgresQuery<{ email: string }>(
    `SELECT LOWER(email) AS email
       FROM greenhouse_core.client_users
      WHERE client_id = $1 AND email IS NOT NULL`,
    [clientId]
  )

  const invitedEmails = new Set(invitedRows.map(r => r.email))

  const candidates: ClientPortalPersonCandidate[] = suggestions.map(s => ({
    hubspotContactId: s.hubspotContactId,
    name: s.name,
    email: s.email,
    jobTitle: s.jobTitle,
    suggestedRole: suggestClientPortalRole(s.jobTitle),
    alreadyInvited: s.email ? invitedEmails.has(s.email.trim().toLowerCase()) : false
  }))

  return { clientId, candidates, degraded: false }
}
