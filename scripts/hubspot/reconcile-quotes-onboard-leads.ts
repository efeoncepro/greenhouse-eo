import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { resolveSecretByRef } from '@/lib/secrets/secret-manager'
import { getHubSpotGreenhouseCompanyProfile } from '@/lib/integrations/hubspot-greenhouse-service'
import { createPartyFromHubSpotCompany } from '@/lib/commercial/party/commands/create-party-from-hubspot-company'
import { syncHubSpotQuotesForCompany } from '@/lib/hubspot/sync-hubspot-quotes'

/**
 * TASK-1222 Slice B — Reconciliación: onboardear las HubSpot companies que tienen
 * quotes pero NO existen como organization en Greenhouse, y luego importar sus
 * quotes con el sync existente per-company.
 *
 * Semántica de lifecycle (regla operador 2026-06-22, canónica):
 *   - lead = prospect (mismo concepto). Company cotizada SIN deal → `prospect`.
 *   - opportunity = organización que tiene AL MENOS un deal → `opportunity`.
 * Se realiza vía la PUERTA CANÓNICA `createPartyFromHubSpotCompany` (escribe
 * lifecycle_stage + lifecycle_stage_history + evento party.created, idempotente,
 * deriva organization_type='other' para no-cliente). NO se inventa enum ni se
 * hand-setea la fila. El stage se fuerza por la regla de deal pasando el token
 * HubSpot equivalente (`opportunity` | `lead`) al mapper canónico.
 *
 * El sync de quotes ya resuelve org por hubspot_company_id; basta con que la org
 * exista. Idempotente. Default DRY-RUN; requiere --apply para escribir.
 *
 * Uso:
 *   HUBSPOT_ACCESS_TOKEN=$(gcloud secrets versions access latest \
 *     --secret=hubspot-access-token --project=efeonce-group) \
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/hubspot/reconcile-quotes-onboard-leads.ts [--apply]
 */

const APPLY = process.argv.includes('--apply')
const HUBSPOT_API = 'https://api.hubapi.com'
const TOKEN_ENV_VAR = 'HUBSPOT_ACCESS_TOKEN'
const TOKEN_GCP_SECRET = 'gcp:hubspot-access-token'

interface AssocRef { id: string }
interface HubSpotQuote {
  id: string
  associations?: {
    companies?: { results?: AssocRef[] }
    deals?: { results?: AssocRef[] }
  }
}
interface ListPage { results: HubSpotQuote[]; paging?: { next?: { after?: string } } }
interface V4AssocResult { results: Array<{ toObjectId: number | string }> }

const fetchToken = async (): Promise<string> => {
  const envValue = process.env[TOKEN_ENV_VAR]?.trim()

  if (envValue) return envValue

  const token = await resolveSecretByRef(TOKEN_GCP_SECRET)

  if (!token) throw new Error(`HubSpot access token not found (env ${TOKEN_ENV_VAR} ni ${TOKEN_GCP_SECRET})`)

  return token
}

const listAllQuotes = async (token: string): Promise<HubSpotQuote[]> => {
  const all: HubSpotQuote[] = []
  let after: string | undefined

  do {
    const params = new URLSearchParams({ limit: '100', associations: 'companies,deals', properties: 'hs_title' })

    if (after) params.set('after', after)

    const r = await fetch(`${HUBSPOT_API}/crm/v3/objects/quotes?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(30000)
    })

    if (!r.ok) throw new Error(`HubSpot list quotes failed: ${r.status} ${(await r.text()).slice(0, 200)}`)

    const j = (await r.json()) as ListPage

    all.push(...j.results)
    after = j.paging?.next?.after
  } while (after)

  return all
}

const companyIdsForDeal = async (token: string, dealId: string): Promise<string[]> => {
  const r = await fetch(`${HUBSPOT_API}/crm/v4/objects/deals/${dealId}/associations/companies?limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000)
  })

  if (r.status === 404) return []

  if (!r.ok) throw new Error(`HubSpot deal->company failed: ${r.status} ${(await r.text()).slice(0, 200)}`)

  return ((await r.json()) as V4AssocResult).results.map(x => String(x.toObjectId))
}

/** True si la company tiene ≥1 deal asociado (regla operador: deal ⇒ opportunity). */
const companyHasDeal = async (token: string, companyId: string): Promise<boolean> => {
  const r = await fetch(`${HUBSPOT_API}/crm/v4/objects/companies/${companyId}/associations/deals?limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000)
  })

  if (r.status === 404) return false

  if (!r.ok) throw new Error(`HubSpot company->deals failed: ${r.status} ${(await r.text()).slice(0, 200)}`)

  return (((await r.json()) as V4AssocResult).results.length) > 0
}

const main = async () => {
  const token = await fetchToken()
  const quotes = await listAllQuotes(token)

  const orgRows = await runGreenhousePostgresQuery<{ hubspot_company_id: string }>(
    `SELECT DISTINCT hubspot_company_id FROM greenhouse_core.organizations
     WHERE hubspot_company_id IS NOT NULL AND hubspot_company_id != '' AND active = TRUE`
  )

  const mapped = new Set(orgRows.map(r => r.hubspot_company_id))

  const companyQuoteCount = new Map<string, number>()
  let noAssociation = 0

  for (const q of quotes) {
    const direct = (q.associations?.companies?.results ?? []).map(r => String(r.id))
    const dealIds = (q.associations?.deals?.results ?? []).map(r => String(r.id))
    const companies = new Set<string>(direct)

    for (const d of dealIds) {
      for (const c of await companyIdsForDeal(token, d)) companies.add(c)
    }

    if (companies.size === 0) {
      noAssociation++
      continue
    }

    for (const c of companies) {
      if (!mapped.has(c)) companyQuoteCount.set(c, (companyQuoteCount.get(c) ?? 0) + 1)
    }
  }

  const targetCompanies = [...companyQuoteCount.keys()]

  console.log(`[onboard-leads] HubSpot quotes: ${quotes.length} | quotes sin asociación: ${noAssociation}`)
  console.log(`[onboard-leads] companies con quotes SIN org en GH: ${targetCompanies.length}`)

  // Plan: nombre HubSpot + has-deal (⇒ opportunity vs prospect/lead)
  const plan: Array<{
    companyId: string
    name: string
    country: string | null
    quotes: number
    stage: 'opportunity' | 'prospect'
  }> = []

  for (const companyId of targetCompanies) {
    let name = `HubSpot Company ${companyId}`
    let country: string | null = null

    try {
      const profile = await getHubSpotGreenhouseCompanyProfile(companyId)

      name = profile.identity.name ?? name
      country = profile.identity.country
    } catch {
      // perfil no resoluble — se onboardea igual con nombre default
    }

    const hasDeal = await companyHasDeal(token, companyId)

    plan.push({
      companyId,
      name,
      country,
      quotes: companyQuoteCount.get(companyId) ?? 0,
      stage: hasDeal ? 'opportunity' : 'prospect'
    })
  }

  const opp = plan.filter(p => p.stage === 'opportunity').length
  const prospect = plan.filter(p => p.stage === 'prospect').length

  console.log('\n=== Plan de onboarding (company → org) ===')
  plan.forEach(p => console.log(`  ${p.companyId} | ${p.name} | ${p.stage} | country=${p.country ?? '—'} | quotes=${p.quotes}`))
  console.log(`\n  Total orgs a crear: ${plan.length} (opportunity=${opp}, prospect/lead=${prospect}) | quotes a importar (aprox): ${plan.reduce((a, p) => a + p.quotes, 0)}`)

  if (!APPLY) {
    console.log('\n[onboard-leads] DRY-RUN (sin escribir). Re-correr con --apply para onboardear + importar.')

    return
  }

  let orgsCreated = 0
  let quotesImported = 0
  const errors: string[] = []

  for (const p of plan) {
    try {
      // El mapper canónico: 'opportunity'→opportunity, 'lead'→prospect.
      await createPartyFromHubSpotCompany({
        hubspotCompanyId: p.companyId,
        hubspotLifecycleStage: p.stage === 'opportunity' ? 'opportunity' : 'lead',
        defaultName: p.name,
        country: p.country,
        actor: { system: true }
      })
      orgsCreated++

      const result = await syncHubSpotQuotesForCompany(p.companyId)

      quotesImported += result.created + result.updated

      if (result.errors.length > 0) errors.push(`${p.companyId}: ${result.errors.slice(0, 2).join('; ')}`)
    } catch (err) {
      errors.push(`${p.companyId}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  console.log(`\n[onboard-leads] orgs onboardeadas: ${orgsCreated}/${plan.length} | quotes importadas (created+updated): ${quotesImported}`)
  errors.forEach(e => console.error('  WARN', e))
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('[onboard-leads] FATAL:', err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
