import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { resolveSecretByRef } from '@/lib/secrets/secret-manager'

/**
 * TASK-1222 Slice 1 — Dry-run READ-ONLY classifier para la reconciliacion
 * global de HubSpot quotes. NO escribe datos (ni PG ni HubSpot).
 *
 * Compara el universo real de HubSpot quotes (/crm/v3/objects/quotes con
 * associations companies+deals) contra lo que Greenhouse YA tiene, usando la
 * UNION de:
 *   - greenhouse_finance.quotes (source_system='hubspot')   ← mirror legacy
 *   - greenhouse_commercial.quotations.hubspot_quote_id      ← tabla canonica
 * (dedup cross-table anti split-brain — ver invariantes TASK-1222).
 *
 * Clasifica cada quote HubSpot en buckets de resolucion y reporta conteos +
 * una muestra. El landing target del backfill (V1 = finance legacy-compat) se
 * decide aparte; este script solo informa.
 *
 * Token: env `HUBSPOT_ACCESS_TOKEN` (CLI) o secret `gcp:hubspot-access-token`.
 *
 * Uso:
 *   HUBSPOT_ACCESS_TOKEN=$(gcloud secrets versions access latest \
 *     --secret=hubspot-access-token --project=efeonce-group) \
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/hubspot/reconcile-quotes-dryrun.ts
 */

const HUBSPOT_API = 'https://api.hubapi.com'
const TOKEN_ENV_VAR = 'HUBSPOT_ACCESS_TOKEN'
const TOKEN_GCP_SECRET = 'gcp:hubspot-access-token'

const QUOTE_PROPERTIES = [
  'hs_title',
  'hs_status',
  'hs_quote_amount',
  'hs_currency',
  'hs_expiration_date',
  'hs_createdate',
  'hs_quote_number',
  'hs_lastmodifieddate'
]

type Bucket =
  | 'already_present'
  | 'resolvable_direct_company'
  | 'resolvable_via_deal_company'
  | 'deal_without_company'
  | 'company_not_mapped_to_greenhouse_organization'
  | 'multiple_candidate_organizations'
  | 'no_company_or_deal_association'
  | 'hubspot_api_error'

interface AssocRef {
  id: string
}

interface HubSpotQuote {
  id: string
  properties: Record<string, string | null | undefined>
  associations?: {
    companies?: { results?: AssocRef[] }
    deals?: { results?: AssocRef[] }
  }
}

interface ListPage {
  results: HubSpotQuote[]
  paging?: { next?: { after?: string } }
}

interface V4AssocResult {
  results: Array<{ toObjectId: number | string }>
}

const fetchToken = async (): Promise<string> => {
  const envValue = process.env[TOKEN_ENV_VAR]?.trim()

  if (envValue) return envValue

  const token = await resolveSecretByRef(TOKEN_GCP_SECRET)

  if (!token) {
    throw new Error(`HubSpot access token not found (env ${TOKEN_ENV_VAR} ni ${TOKEN_GCP_SECRET})`)
  }

  return token
}

/** Lista TODAS las quotes HubSpot paginadas con associations inline. */
const listAllQuotes = async (token: string): Promise<HubSpotQuote[]> => {
  const all: HubSpotQuote[] = []
  let after: string | undefined

  do {
    const params = new URLSearchParams({
      limit: '100',
      properties: QUOTE_PROPERTIES.join(','),
      associations: 'companies,deals'
    })

    if (after) params.set('after', after)

    const url = `${HUBSPOT_API}/crm/v3/objects/quotes?${params.toString()}`

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(30000)
    })

    if (!response.ok) {
      const text = await response.text()

      throw new Error(`HubSpot list quotes failed: ${response.status} ${text.slice(0, 200)}`)
    }

    const json = (await response.json()) as ListPage

    all.push(...json.results)
    after = json.paging?.next?.after
  } while (after)

  return all
}

/** Resuelve company IDs asociadas a un deal (fallback quote->deal->company). */
const companyIdsForDeal = async (token: string, dealId: string): Promise<string[]> => {
  const url = `${HUBSPOT_API}/crm/v4/objects/deals/${dealId}/associations/companies?limit=100`

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000)
  })

  if (response.status === 404) return []

  if (!response.ok) {
    const text = await response.text()

    throw new Error(`HubSpot deal->company failed: ${response.status} ${text.slice(0, 200)}`)
  }

  const json = (await response.json()) as V4AssocResult

  return json.results.map(r => String(r.toObjectId))
}

const main = async () => {
  const token = await fetchToken()

  console.log('[dry-run] Listando HubSpot quotes (global, con associations)…')
  const quotes = await listAllQuotes(token)

  console.log(`[dry-run] HubSpot total quotes: ${quotes.length}`)

  // ── Universo "ya en Greenhouse" = UNION finance ∪ commercial (dedup cross-table) ──
  const financeRows = await runGreenhousePostgresQuery<{ hubspot_quote_id: string | null }>(
    `SELECT hubspot_quote_id FROM greenhouse_finance.quotes
     WHERE source_system = 'hubspot' AND hubspot_quote_id IS NOT NULL`
  )

  const commercialRows = await runGreenhousePostgresQuery<{ hubspot_quote_id: string | null }>(
    `SELECT hubspot_quote_id FROM greenhouse_commercial.quotations
     WHERE hubspot_quote_id IS NOT NULL`
  )

  const inFinance = new Set(financeRows.map(r => r.hubspot_quote_id).filter(Boolean) as string[])
  const inCommercial = new Set(commercialRows.map(r => r.hubspot_quote_id).filter(Boolean) as string[])
  const alreadyPresent = new Set<string>([...inFinance, ...inCommercial])

  // ── Companies mapeadas a una organization canonica activa ──
  const orgRows = await runGreenhousePostgresQuery<{ hubspot_company_id: string }>(
    `SELECT DISTINCT hubspot_company_id FROM greenhouse_core.organizations
     WHERE hubspot_company_id IS NOT NULL AND hubspot_company_id != '' AND active = TRUE`
  )

  const mappedCompanies = new Set(orgRows.map(r => r.hubspot_company_id))

  console.log(
    `[dry-run] Greenhouse ya tiene: finance=${inFinance.size}, commercial=${inCommercial.size}, UNION=${alreadyPresent.size}`
  )
  console.log(`[dry-run] Companies mapeadas a organization activa: ${mappedCompanies.size}`)

  const buckets: Record<Bucket, string[]> = {
    already_present: [],
    resolvable_direct_company: [],
    resolvable_via_deal_company: [],
    deal_without_company: [],
    company_not_mapped_to_greenhouse_organization: [],
    multiple_candidate_organizations: [],
    no_company_or_deal_association: [],
    hubspot_api_error: []
  }

  // Conflictos direct≠deal company (para decidir prioridad resolver, Open Question)
  let directVsDealConflict = 0

  for (const q of quotes) {
    if (alreadyPresent.has(q.id)) {
      buckets.already_present.push(q.id)
      continue
    }

    const directCompanies = (q.associations?.companies?.results ?? []).map(r => String(r.id))
    const dealIds = (q.associations?.deals?.results ?? []).map(r => String(r.id))

    try {
      // Resolver via deal->company (para fallback + deteccion de conflicto)
      const dealCompanies = new Set<string>()
      const anyDeal = dealIds.length > 0

      for (const dealId of dealIds) {
        const cids = await companyIdsForDeal(token, dealId)

        cids.forEach(c => dealCompanies.add(c))
      }

      const directMapped = directCompanies.filter(c => mappedCompanies.has(c))
      const dealMapped = [...dealCompanies].filter(c => mappedCompanies.has(c))

      // Conflicto: direct company y deal company mapean a orgs distintas
      if (directMapped.length > 0 && dealMapped.length > 0) {
        const union = new Set([...directMapped, ...dealMapped])

        if (union.size > 1) directVsDealConflict++
      }

      const candidateOrgsCompanies = new Set<string>([...directMapped, ...dealMapped])

      if (candidateOrgsCompanies.size > 1) {
        buckets.multiple_candidate_organizations.push(q.id)
      } else if (directMapped.length === 1) {
        buckets.resolvable_direct_company.push(q.id)
      } else if (dealMapped.length === 1) {
        buckets.resolvable_via_deal_company.push(q.id)
      } else if (directCompanies.length > 0 || dealCompanies.size > 0) {
        // Tiene company/deal pero ninguna mapea a organization Greenhouse
        buckets.company_not_mapped_to_greenhouse_organization.push(q.id)
      } else if (anyDeal && dealCompanies.size === 0) {
        buckets.deal_without_company.push(q.id)
      } else {
        buckets.no_company_or_deal_association.push(q.id)
      }
    } catch (err) {
      buckets.hubspot_api_error.push(q.id)
      console.error(`[dry-run] error en quote ${q.id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  console.log('\n=== TASK-1222 dry-run — buckets de reconciliacion ===')
  ;(Object.keys(buckets) as Bucket[]).forEach(b => {
    console.log(`  ${b.padEnd(48)} ${buckets[b].length}`)
  })

  const resolvable = buckets.resolvable_direct_company.length + buckets.resolvable_via_deal_company.length

  console.log('\n=== Resumen ===')
  console.log(`  HubSpot total:                 ${quotes.length}`)
  console.log(`  Ya en Greenhouse (UNION):      ${buckets.already_present.length}`)
  console.log(`  Resolubles a importar:         ${resolvable}`)
  console.log(`  Unresolved (requieren accion): ${
    buckets.deal_without_company.length +
    buckets.company_not_mapped_to_greenhouse_organization.length +
    buckets.multiple_candidate_organizations.length +
    buckets.no_company_or_deal_association.length
  }`)
  console.log(`  Errores upstream:              ${buckets.hubspot_api_error.length}`)
  console.log(`  Conflictos direct≠deal company: ${directVsDealConflict} (señal para prioridad resolver)`)
  console.log(`  Target esperado finance source=hubspot ≈ ${inFinance.size} + ${resolvable} = ${inFinance.size + resolvable}`)

  // Muestra acotada por bucket (primeros 5 ids)
  console.log('\n=== Muestra (≤5 ids por bucket) ===')
  ;(Object.keys(buckets) as Bucket[]).forEach(b => {
    if (buckets[b].length > 0) console.log(`  ${b}: ${buckets[b].slice(0, 5).join(', ')}`)
  })
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('[dry-run] FATAL:', err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
