import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { resolveSecretByRef } from '@/lib/secrets/secret-manager'
import { getHubSpotGreenhouseCompanyProfile } from '@/lib/integrations/hubspot-greenhouse-service'
import { upsertCanonicalOrganization } from '@/lib/account-360/organization-identity'
import { syncHubSpotQuotesForCompany } from '@/lib/hubspot/sync-hubspot-quotes'

/**
 * TASK-1222 Slice B — Reconciliación: onboardear como organizations tipo "lead"
 * (canónico: organization_type='other' + lifecycle_stage='prospect', default del
 * writer SSOT) las HubSpot companies que tienen quotes pero NO existen como org en
 * Greenhouse, y luego importar sus quotes con el sync existente per-company.
 *
 * "Lead" NO es un organization_type (CHECK admite client/supplier/both/other).
 * Se realiza como prospect/other vía upsertCanonicalOrganization (puerta canónica,
 * no se inventa enum). El sync de quotes ya resuelve org por hubspot_company_id;
 * por eso basta con que la org exista.
 *
 * Idempotente. Default DRY-RUN; requiere --apply para escribir.
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

const main = async () => {
  const token = await fetchToken()
  const quotes = await listAllQuotes(token)

  const orgRows = await runGreenhousePostgresQuery<{ hubspot_company_id: string }>(
    `SELECT DISTINCT hubspot_company_id FROM greenhouse_core.organizations
     WHERE hubspot_company_id IS NOT NULL AND hubspot_company_id != '' AND active = TRUE`
  )

  const mapped = new Set(orgRows.map(r => r.hubspot_company_id))

  // companies (resueltas direct o via deal) que tienen quotes pero NO son org → onboardear
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
  console.log(`[onboard-leads] companies con quotes SIN org en GH (a onboardear como lead/prospect): ${targetCompanies.length}`)

  // Resolver nombres HubSpot (para el plan + el write)
  const plan: Array<{ companyId: string; name: string; country: string | null; industry: string | null; quotes: number }> = []

  for (const companyId of targetCompanies) {
    try {
      const profile = await getHubSpotGreenhouseCompanyProfile(companyId)

      plan.push({
        companyId,
        name: profile.identity.name ?? `HubSpot company ${companyId}`,
        country: profile.identity.country,
        industry: profile.identity.industry,
        quotes: companyQuoteCount.get(companyId) ?? 0
      })
    } catch (err) {
      plan.push({ companyId, name: `(perfil no resoluble: ${err instanceof Error ? err.message : String(err)})`, country: null, industry: null, quotes: companyQuoteCount.get(companyId) ?? 0 })
    }
  }

  console.log('\n=== Plan de onboarding (company → org prospect/other) ===')
  plan.forEach(p => console.log(`  ${p.companyId} | ${p.name} | country=${p.country ?? '—'} | quotes=${p.quotes}`))
  console.log(`\n  Total orgs a crear: ${plan.length} | quotes a importar (aprox): ${plan.reduce((a, p) => a + p.quotes, 0)}`)

  if (!APPLY) {
    console.log('\n[onboard-leads] DRY-RUN (sin escribir). Re-correr con --apply para onboardear + importar.')

    return
  }

  let orgsCreated = 0
  let quotesImported = 0
  const errors: string[] = []

  for (const p of plan) {
    try {
      await upsertCanonicalOrganization({
        organizationName: p.name,
        hubspotCompanyId: p.companyId,
        country: p.country,
        industry: p.industry,
        origin: 'hubspot_sync'
        // sin hasClientRole/hasSupplierRole → organization_type='other';
        // lifecycle_stage cae al default 'prospect' = lead canónico.
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
