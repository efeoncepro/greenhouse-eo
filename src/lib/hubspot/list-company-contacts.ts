import 'server-only'

/**
 * TASK-997 Slice 2 (validación Berel) — fetch read-only de los contactos asociados
 * de una company HubSpot vía el bridge Cloud Run `hubspot-greenhouse-integration`
 * (que tiene el HubSpot API token). Fallback en vivo cuando la proyección
 * `greenhouse_crm.contacts` todavía no tiene los contactos del cliente (caso Berel:
 * la company existe pero sus contactos no se sincronizaron a la proyección aún).
 *
 * Read-only: NO escribe en crm.contacts (eso es `syncHubSpotCompanyById`). Lanza si
 * el bridge falla → el endpoint degrada honesto.
 */
const BRIDGE_URL = 'https://hubspot-greenhouse-integration-y6egnifl6a-uc.a.run.app'

export type HubSpotCompanyContact = {
  hubspotContactId: string
  name: string
  email: string | null
  jobTitle: string | null
}

type BridgeContact = {
  hubspotContactId?: string
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  displayName?: string | null
  jobTitle?: string | null
}

const contactName = (c: BridgeContact): string => {
  const display = c.displayName?.trim()

  if (display) return display

  const composed = [c.firstName, c.lastName].filter(Boolean).join(' ').trim()

  return composed || c.email?.trim() || String(c.hubspotContactId)
}

export const fetchHubSpotCompanyContactsFromBridge = async (
  companyId: string
): Promise<HubSpotCompanyContact[]> => {
  const id = companyId.trim()

  if (!id) return []

  const res = await fetch(`${BRIDGE_URL}/companies/${encodeURIComponent(id)}/contacts`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000)
  })

  if (!res.ok) throw new Error(`hubspot_bridge_contacts_failed_${res.status}`)

  const body = (await res.json()) as { contacts?: BridgeContact[] }

  return (body.contacts ?? [])
    .filter(c => typeof c.hubspotContactId === 'string' && c.hubspotContactId)
    .map(c => ({
      hubspotContactId: String(c.hubspotContactId),
      name: contactName(c),
      email: c.email?.trim() || null,
      jobTitle: c.jobTitle?.trim() || null
    }))
}
