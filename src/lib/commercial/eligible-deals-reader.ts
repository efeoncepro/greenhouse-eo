import 'server-only'

import { query } from '@/lib/db'

/**
 * TASK-837 Slice 1 — Eligible Deal Source reader for Sample Sprint wizard.
 *
 * Lists HubSpot Deals from the local mirror (`greenhouse_commercial.deals`)
 * with company + contact context inherited via the canonical bridge
 * `clients ↔ greenhouse_crm.companies ↔ greenhouse_crm.contacts`.
 *
 * Eligibility rules (server-side):
 * - is_closed = FALSE (no won-final, no lost, no closed)
 * - is_deleted = FALSE
 * - has at least one company associated (resolved via deal.client_id ↔ companies.client_id)
 * - has at least one contact associated to the resolved company
 *
 * Cache: in-memory TTL 60s per subject (the auth subject is the cache key namespace).
 * The cache exists to debounce wizard polling. The submit-time revalidation in
 * Slice 3 (`declareSampleSprint`) does NOT consume this cache — it always reads
 * fresh from PG.
 *
 * Hard rules (TASK-837 Slice 1):
 * - NUNCA confiar en valores enviados por el cliente. La eligibility se computa
 *   server-side desde la mirror canónica.
 * - NUNCA filtrar deals por labels visibles HubSpot. Solo `is_closed`/`is_won`/
 *   stage IDs sincronizados.
 * - NUNCA cachear más de 60s — Deals que se cierran en HubSpot deben dejar de ser
 *   elegibles en menos de 1 minuto.
 */

export type DealIneligibilityReason =
  | 'closed'
  | 'deleted'
  | 'missing_company'
  | 'missing_contacts'

export interface EligibleDealCompany {
  companyRecordId: string
  hubspotCompanyId: string
  name: string
  legalName: string | null
}

export interface EligibleDealContact {
  contactRecordId: string
  hubspotContactId: string
  displayName: string
  email: string | null
  jobTitle: string | null
}

export interface EligibleDeal {
  hubspotDealId: string
  dealName: string
  dealstage: string
  dealstageLabel: string | null
  pipelineName: string | null
  amount: number | null
  amountClp: number | null
  currency: string
  organizationId: string | null
  spaceId: string | null
  clientId: string | null
  closeDate: string | null
  isClosed: boolean
  isDeleted: boolean
  company: EligibleDealCompany | null
  contacts: EligibleDealContact[]
  isEligible: boolean
  ineligibilityReasons: DealIneligibilityReason[]
}

export interface ListEligibleDealsParams {
  /**
   * Optional space filter. NOT used as a hard filter — only `space_id` populated
   * deals are rare (~27% of open deals). Use `clientId` or `organizationId` instead.
   * Kept for backwards compat / future use when deals consistently carry space_id.
   */
  spaceId?: string
  /**
   * Canonical filter — deals are at organization level (canonical 360). 100% of
   * synced deals carry organization_id. PREFER this filter over spaceId.
   */
  organizationId?: string
  /**
   * Canonical company resolver — passed from the SELECTED space's client_id
   * (always populated). The reader uses this to look up the matching crm.company
   * + contacts because deals.client_id is rarely populated (~27%).
   */
  clientId?: string
  search?: string
  limit?: number
  /**
   * Optional cache key namespace (typically subject userId or session id).
   * If omitted the cache is bypassed.
   */
  cacheKey?: string
}

interface DealRow extends Record<string, unknown> {
  hubspot_deal_id: string
  deal_name: string
  dealstage: string
  dealstage_label: string | null
  pipeline_name: string | null
  amount: string | null
  amount_clp: string | null
  currency: string
  close_date: string | Date | null
  is_closed: boolean
  is_deleted: boolean
  organization_id: string | null
  space_id: string | null
  client_id: string | null
}

interface CompanyRow extends Record<string, unknown> {
  company_record_id: string
  client_id: string
  hubspot_company_id: string
  company_name: string
  legal_name: string | null
}

interface ContactRow extends Record<string, unknown> {
  contact_record_id: string
  company_record_id: string
  hubspot_contact_id: string
  display_name: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  job_title: string | null
}

const CACHE_TTL_MS = 60_000

interface CacheEntry {
  expiresAt: number
  value: EligibleDeal[]
}

const cache = new Map<string, CacheEntry>()

const buildCacheKey = (subjectKey: string, params: ListEligibleDealsParams): string =>
  JSON.stringify({
    s: subjectKey,
    sp: params.spaceId ?? null,
    org: params.organizationId ?? null,
    q: params.search ?? null,
    l: params.limit ?? null
  })

const toNumberOrNull = (value: string | number | null): number | null => {
  if (value === null || value === undefined) return null
  const n = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(n) ? n : null
}

const toIsoDateString = (value: string | Date | null): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'string') return value.slice(0, 10)

  return null
}

const trimmedOrNull = (value: string | null): string | null => {
  if (!value) return null
  const t = value.trim()

  return t || null
}

const buildContactDisplayName = (row: ContactRow): string => {
  const candidates = [
    row.display_name,
    row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : null,
    row.first_name,
    row.last_name,
    row.email
  ]

  for (const candidate of candidates) {
    const trimmed = trimmedOrNull(candidate)

    if (trimmed) return trimmed
  }

  return 'Contacto sin nombre'
}

const computeIneligibility = (
  deal: Omit<EligibleDeal, 'isEligible' | 'ineligibilityReasons'>
): { isEligible: boolean; reasons: DealIneligibilityReason[] } => {
  const reasons: DealIneligibilityReason[] = []

  if (deal.isClosed) reasons.push('closed')
  if (deal.isDeleted) reasons.push('deleted')
  if (!deal.company) reasons.push('missing_company')
  if (deal.contacts.length === 0) reasons.push('missing_contacts')

  return { isEligible: reasons.length === 0, reasons }
}

/**
 * Internal: fetch deals from PG mirror without cache.
 *
 * Filters applied:
 * - is_closed = FALSE
 * - is_deleted = FALSE
 * - optional spaceId / organizationId / search (deal_name ILIKE)
 *
 * Then enriches each deal with company + contacts via two batch queries.
 * Idempotent and side-effect-free.
 */
const fetchEligibleDealsFresh = async (
  params: ListEligibleDealsParams
): Promise<EligibleDeal[]> => {
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 200)
  const filters: string[] = ['is_closed = FALSE', 'is_deleted = FALSE']
  const args: unknown[] = []

  // PRIMARY filter: organization_id (canonical 360, 100% populated). Live audit
  // 2026-05-09: 11/11 open deals carry organization_id, only 3/11 carry space_id
  // and 3/11 carry client_id. Filtering by space_id excludes 73% of valid deals.
  if (params.organizationId) {
    args.push(params.organizationId)
    filters.push(`organization_id = $${args.length}`)
  }

  // SECONDARY filter: spaceId only when explicitly populated — deals at space
  // level are rare. We DO NOT skip deals where space_id IS NULL because the
  // organization filter is the canonical anchor.
  if (params.spaceId) {
    args.push(params.spaceId)
    filters.push(`(space_id IS NULL OR space_id = $${args.length})`)
  }

  if (params.search) {
    args.push(`%${params.search.trim()}%`)
    filters.push(`deal_name ILIKE $${args.length}`)
  }

  args.push(limit)
  const limitParam = args.length

  const dealRows = await query<DealRow>(
    `SELECT hubspot_deal_id, deal_name, dealstage, dealstage_label, pipeline_name,
            amount, amount_clp, currency, close_date, is_closed, is_deleted,
            organization_id, space_id, client_id
       FROM greenhouse_commercial.deals
      WHERE ${filters.join(' AND ')}
      ORDER BY updated_at DESC NULLS LAST, deal_name ASC
      LIMIT $${limitParam}`,
    args
  )

  if (dealRows.length === 0) return []

  // Resolve company via the SELECTED space's client_id (always populated when
  // the wizard provides it). Falls back to deal.client_id only when caller did
  // not pass clientId (e.g., admin global listing).
  // Live audit 2026-05-09: deals.client_id is populated in only 27% of rows;
  // relying solely on deal.client_id breaks 8/11 lookups for Aguas Andinas.
  const clientIdsToLookup = new Set<string>()

  if (params.clientId) {
    clientIdsToLookup.add(params.clientId)
  }

  for (const deal of dealRows) {
    if (deal.client_id) clientIdsToLookup.add(deal.client_id)
  }

  const companyByClientId = new Map<string, CompanyRow>()

  if (clientIdsToLookup.size > 0) {
    const companyRows = await query<CompanyRow>(
      `SELECT company_record_id, client_id, hubspot_company_id, company_name, legal_name
         FROM greenhouse_crm.companies
        WHERE client_id = ANY($1::text[])
          AND active = TRUE
          AND is_deleted = FALSE`,
      [Array.from(clientIdsToLookup)]
    )

    for (const row of companyRows) {
      // First-write wins; multi-company per client_id flagged by the reliability
      // signal `commercial.sample_sprint.multi_company_unresolved` (Slice 6).
      if (!companyByClientId.has(row.client_id)) {
        companyByClientId.set(row.client_id, row)
      }
    }
  }

  const companyRecordIds = Array.from(
    new Set(Array.from(companyByClientId.values()).map(c => c.company_record_id))
  )

  const contactsByCompanyRecordId = new Map<string, ContactRow[]>()

  if (companyRecordIds.length > 0) {
    const contactRows = await query<ContactRow>(
      `SELECT contact_record_id, company_record_id, hubspot_contact_id,
              display_name, first_name, last_name, email, job_title
         FROM greenhouse_crm.contacts
        WHERE company_record_id = ANY($1::text[])
          AND active = TRUE
          AND is_deleted = FALSE
        ORDER BY display_name ASC NULLS LAST, last_name ASC NULLS LAST`,
      [companyRecordIds]
    )

    for (const row of contactRows) {
      const list = contactsByCompanyRecordId.get(row.company_record_id) ?? []

      list.push(row)
      contactsByCompanyRecordId.set(row.company_record_id, list)
    }
  }

  return dealRows.map(row => {
    // Prefer the wizard-supplied clientId (space anchor, always populated)
    // over deal.client_id (may be NULL, only 27% of deals carry it).
    const resolveClientId = params.clientId ?? row.client_id
    const companyRow = resolveClientId ? companyByClientId.get(resolveClientId) : null

    const company: EligibleDealCompany | null = companyRow
      ? {
          companyRecordId: companyRow.company_record_id,
          hubspotCompanyId: companyRow.hubspot_company_id,
          name: companyRow.company_name,
          legalName: trimmedOrNull(companyRow.legal_name)
        }
      : null

    const contactRows = companyRow
      ? (contactsByCompanyRecordId.get(companyRow.company_record_id) ?? [])
      : []

    const contacts: EligibleDealContact[] = contactRows.map(contact => ({
      contactRecordId: contact.contact_record_id,
      hubspotContactId: contact.hubspot_contact_id,
      displayName: buildContactDisplayName(contact),
      email: trimmedOrNull(contact.email),
      jobTitle: trimmedOrNull(contact.job_title)
    }))

    const dealCore = {
      hubspotDealId: row.hubspot_deal_id,
      dealName: row.deal_name,
      dealstage: row.dealstage,
      dealstageLabel: trimmedOrNull(row.dealstage_label),
      pipelineName: trimmedOrNull(row.pipeline_name),
      amount: toNumberOrNull(row.amount),
      amountClp: toNumberOrNull(row.amount_clp),
      currency: row.currency,
      closeDate: toIsoDateString(row.close_date),
      isClosed: row.is_closed,
      isDeleted: row.is_deleted,
      organizationId: row.organization_id,
      spaceId: row.space_id,
      clientId: row.client_id,
      company,
      contacts
    }

    const eligibility = computeIneligibility(dealCore)

    return {
      ...dealCore,
      isEligible: eligibility.isEligible,
      ineligibilityReasons: eligibility.reasons
    }
  })
}

/**
 * Public: list eligible deals for the Sample Sprint wizard.
 *
 * Cache: optional. When `cacheKey` is provided, results are cached in-memory
 * for 60s keyed by `(cacheKey, params)`. The cache is per-process; in a
 * Vercel serverless deployment this is per-function-instance, which is fine
 * since the wizard polls within the same invocation cluster typically.
 */
export const listEligibleDealsForSampleSprint = async (
  params: ListEligibleDealsParams = {}
): Promise<EligibleDeal[]> => {
  if (params.cacheKey) {
    const key = buildCacheKey(params.cacheKey, params)
    const hit = cache.get(key)
    const now = Date.now()

    if (hit && hit.expiresAt > now) {
      return hit.value
    }

    const fresh = await fetchEligibleDealsFresh(params)

    cache.set(key, { value: fresh, expiresAt: now + CACHE_TTL_MS })

    return fresh
  }

  return fetchEligibleDealsFresh(params)
}

/**
 * Public: fetch a single deal by hubspot_deal_id for server-side revalidation
 * at declare-time (Slice 3). NEVER consults the cache — always reads fresh.
 *
 * Returns the EligibleDeal shape including `isEligible` flag + `ineligibilityReasons`.
 * Returns `null` only when the deal does not exist locally; otherwise returns
 * the deal with eligibility computed (caller decides whether to reject based
 * on `isEligible`).
 */
export const getEligibleDealForRevalidation = async (
  hubspotDealId: string,
  options: { clientIdHint?: string } = {}
): Promise<EligibleDeal | null> => {
  const trimmed = hubspotDealId.trim()

  if (!trimmed) return null

  const dealRows = await query<DealRow>(
    `SELECT hubspot_deal_id, deal_name, dealstage, dealstage_label, pipeline_name,
            amount, amount_clp, currency, close_date, is_closed, is_deleted,
            organization_id, space_id, client_id
       FROM greenhouse_commercial.deals
      WHERE hubspot_deal_id = $1
      LIMIT 1`,
    [trimmed]
  )

  if (dealRows.length === 0) return null

  const dealRow = dealRows[0]

  // Resolve company + contacts. Prefer the wizard-supplied clientId hint
  // (always populated when caller has space context) over deal.client_id
  // (NULL in 73% of synced deals — see live audit 2026-05-09).
  const resolveClientId = options.clientIdHint?.trim() || dealRow.client_id || null

  let company: EligibleDealCompany | null = null
  let contacts: EligibleDealContact[] = []

  if (resolveClientId) {
    const companyRows = await query<CompanyRow>(
      `SELECT company_record_id, client_id, hubspot_company_id, company_name, legal_name
         FROM greenhouse_crm.companies
        WHERE client_id = $1 AND active = TRUE AND is_deleted = FALSE
        LIMIT 1`,
      [resolveClientId]
    )

    if (companyRows.length > 0) {
      const companyRow = companyRows[0]

      company = {
        companyRecordId: companyRow.company_record_id,
        hubspotCompanyId: companyRow.hubspot_company_id,
        name: companyRow.company_name,
        legalName: trimmedOrNull(companyRow.legal_name)
      }

      const contactRows = await query<ContactRow>(
        `SELECT contact_record_id, company_record_id, hubspot_contact_id,
                display_name, first_name, last_name, email, job_title
           FROM greenhouse_crm.contacts
          WHERE company_record_id = $1
            AND active = TRUE
            AND is_deleted = FALSE
          ORDER BY display_name ASC NULLS LAST, last_name ASC NULLS LAST`,
        [companyRow.company_record_id]
      )

      contacts = contactRows.map(contact => ({
        contactRecordId: contact.contact_record_id,
        hubspotContactId: contact.hubspot_contact_id,
        displayName: buildContactDisplayName(contact),
        email: trimmedOrNull(contact.email),
        jobTitle: trimmedOrNull(contact.job_title)
      }))
    }
  }

  const dealCore = {
    hubspotDealId: dealRow.hubspot_deal_id,
    dealName: dealRow.deal_name,
    dealstage: dealRow.dealstage,
    dealstageLabel: trimmedOrNull(dealRow.dealstage_label),
    pipelineName: trimmedOrNull(dealRow.pipeline_name),
    amount: toNumberOrNull(dealRow.amount),
    amountClp: toNumberOrNull(dealRow.amount_clp),
    currency: dealRow.currency,
    closeDate: toIsoDateString(dealRow.close_date),
    isClosed: dealRow.is_closed,
    isDeleted: dealRow.is_deleted,
    organizationId: dealRow.organization_id,
    spaceId: dealRow.space_id,
    clientId: dealRow.client_id,
    company,
    contacts
  }

  const eligibility = computeIneligibility(dealCore)

  return {
    ...dealCore,
    isEligible: eligibility.isEligible,
    ineligibilityReasons: eligibility.reasons
  }
}

/** Test-only: clear the in-memory cache. */
export const __clearEligibleDealsCache = () => {
  cache.clear()
}
