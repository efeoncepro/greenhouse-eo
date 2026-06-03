import 'server-only'

import { fetchHubSpotCompanyContactsFromBridge } from '@/lib/hubspot/list-company-contacts'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * TASK-997 Slice 2 — read API de la primitiva canónica "External Reference
 * Association" (sub-pattern 2). Sugiere contactos de finanzas desde la proyección
 * ya sincronizada `greenhouse_crm.contacts` (NO una llamada externa runtime →
 * robusto + rápido). El operador elige uno y el wizard guarda el `hubspotContactId`
 * como provenance, en vez de tipear nombre/email/cargo a mano (data-quality drift).
 *
 * CQRS-lite: este es el read; el write (associate) vive en el composer del wizard
 * que persiste `client_profiles.finance_contacts` con la referencia.
 */
export type FinanceContactSuggestion = {
  hubspotContactId: string
  name: string
  email: string | null
  jobTitle: string | null
}

/**
 * Contactos asociados a la company HubSpot (primary o cualquiera de las associated).
 * Vacío si no hay `hubspotCompanyId` o no hay contactos → la UI cae a manual.
 */
export const listFinanceContactSuggestionsForCompany = async (
  hubspotCompanyId: string | null | undefined
): Promise<FinanceContactSuggestion[]> => {
  const id = hubspotCompanyId?.trim()

  if (!id) return []

  // 1. Fast path: la proyección ya sincronizada (sin llamada externa runtime).
  const projected = await runGreenhousePostgresQuery<FinanceContactSuggestion>(
    `SELECT hubspot_contact_id AS "hubspotContactId",
            COALESCE(NULLIF(TRIM(display_name), ''),
                     TRIM(CONCAT_WS(' ', first_name, last_name)),
                     email,
                     hubspot_contact_id) AS "name",
            email,
            job_title AS "jobTitle"
     FROM greenhouse_crm.contacts
     WHERE active = TRUE
       AND is_deleted = FALSE
       AND (hubspot_primary_company_id = $1 OR $1 = ANY(hubspot_associated_company_ids))
     ORDER BY (email IS NULL), "name" ASC
     LIMIT 50`,
    [id]
  )

  if (projected.length > 0) return projected

  // 2. Fallback en vivo: la company existe en HubSpot pero sus contactos aún no
  //    están en la proyección (caso Berel). Lee read-only del bridge HubSpot.
  //    Lanza si el bridge falla → el endpoint degrada honesto a "agregar manual".
  return fetchHubSpotCompanyContactsFromBridge(id)
}
