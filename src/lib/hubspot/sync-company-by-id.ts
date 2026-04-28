import { randomUUID } from 'node:crypto'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { syncHubSpotCompanies } from '@/lib/hubspot/sync-hubspot-companies'

/**
 * Sync a single HubSpot company (and its contacts) on demand.
 *
 * Flujo canónico:
 *   1. Fetch /companies/{id} y /companies/{id}/contacts del Cloud Run bridge
 *      hubspot-greenhouse-integration (que tiene HubSpot API token).
 *   2. UPSERT en greenhouse_crm.companies + greenhouse_crm.contacts (raw layer).
 *   3. Llama a syncHubSpotCompanies({ fullResync: false }) para promover a
 *      greenhouse_core.organizations + greenhouse_core.clients (cuando aplique).
 *
 * Reusable para cualquier company nuevo que aparezca en HubSpot y necesite
 * estar en el portal de inmediato (no esperar al cron diario).
 */

const BRIDGE_URL = 'https://hubspot-greenhouse-integration-y6egnifl6a-uc.a.run.app'

interface BridgeCompanyProfile {
  hubspotCompanyId: string
  identity: {
    name: string | null
    domain: string | null
    website: string | null
    industry: string | null
    country: string | null
    state?: string | null
    city?: string | null
  }
  lifecycle: {
    lifecyclestage: string | null
    [key: string]: unknown
  }
  owner: {
    hubspotOwnerId: string | null
  }
  [key: string]: unknown
}

interface BridgeContactProfile {
  hubspotContactId: string
  email: string | null
  firstName: string | null
  lastName: string | null
  displayName: string | null
  jobTitle: string | null
  phone: string | null
  mobilePhone: string | null
  lifecyclestage: string | null
  hsLeadStatus: string | null
  company?: string | null
  [key: string]: unknown
}

export interface SyncCompanyByIdResult {
  hubspotCompanyId: string
  companyRecordId: string
  companyUpserted: boolean
  contactsUpserted: number
  promotedSummary: {
    processed: number
    created: number
    promoted: number
    clientsInstantiated: number
  } | null
}

const fetchFromBridge = async <T>(path: string): Promise<T> => {
  const url = `${BRIDGE_URL}${path}`

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(30_000)
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')

    throw new Error(`Bridge ${path} returned ${response.status}: ${body.slice(0, 200)}`)
  }

  return response.json() as Promise<T>
}

const buildPayloadHash = (payload: unknown): string => {
  const str = JSON.stringify(payload)
  let hash = 0

  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }

  return `hash-${Math.abs(hash).toString(36)}`
}

const upsertCompany = async (
  syncRunId: string,
  profile: BridgeCompanyProfile
): Promise<{ companyRecordId: string }> => {
  const existing = await runGreenhousePostgresQuery<{ company_record_id: string }>(
    `SELECT company_record_id FROM greenhouse_crm.companies WHERE hubspot_company_id = $1`,
    [profile.hubspotCompanyId]
  )

  const companyRecordId = existing[0]?.company_record_id ?? `crm-company-${randomUUID()}`
  const payloadHash = buildPayloadHash(profile)

  const websiteOrDomain = profile.identity.website ?? profile.identity.domain ?? null

  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_crm.companies (
       company_record_id, hubspot_company_id, company_name, legal_name,
       lifecycle_stage, industry, country_code, website_url,
       active, is_deleted, source_updated_at, synced_at, sync_run_id, payload_hash,
       created_at, updated_at
     ) VALUES (
       $1, $2, $3, $4,
       $5, $6, $7, $8,
       TRUE, FALSE, NOW(), NOW(), $9, $10,
       NOW(), NOW()
     )
     ON CONFLICT (hubspot_company_id) DO UPDATE SET
       company_name = EXCLUDED.company_name,
       legal_name = COALESCE(EXCLUDED.legal_name, greenhouse_crm.companies.legal_name),
       lifecycle_stage = EXCLUDED.lifecycle_stage,
       industry = COALESCE(EXCLUDED.industry, greenhouse_crm.companies.industry),
       country_code = COALESCE(EXCLUDED.country_code, greenhouse_crm.companies.country_code),
       website_url = COALESCE(EXCLUDED.website_url, greenhouse_crm.companies.website_url),
       active = TRUE,
       is_deleted = FALSE,
       source_updated_at = NOW(),
       synced_at = NOW(),
       sync_run_id = EXCLUDED.sync_run_id,
       payload_hash = EXCLUDED.payload_hash,
       updated_at = NOW()`,
    [
      companyRecordId, profile.hubspotCompanyId, profile.identity.name, null,
      profile.lifecycle.lifecyclestage, profile.identity.industry, profile.identity.country, websiteOrDomain,
      syncRunId, payloadHash
    ]
  )

  return { companyRecordId }
}

const upsertContact = async (
  syncRunId: string,
  companyRecordId: string,
  hubspotCompanyId: string,
  contact: BridgeContactProfile
): Promise<void> => {
  const existing = await runGreenhousePostgresQuery<{ contact_record_id: string }>(
    `SELECT contact_record_id FROM greenhouse_crm.contacts WHERE hubspot_contact_id = $1`,
    [contact.hubspotContactId]
  )

  const contactRecordId = existing[0]?.contact_record_id ?? `crm-contact-${randomUUID()}`

  const displayName = contact.displayName
    ?? [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim()
    ?? contact.email
    ?? contact.hubspotContactId

  const payloadHash = buildPayloadHash(contact)

  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_crm.contacts (
       contact_record_id, company_record_id, hubspot_contact_id,
       hubspot_primary_company_id, hubspot_associated_company_ids,
       email, first_name, last_name, display_name,
       job_title, phone, mobile_phone, lifecycle_stage, lead_status,
       active, is_deleted, source_updated_at, synced_at, sync_run_id, payload_hash,
       created_at, updated_at
     ) VALUES (
       $1, $2, $3,
       $4, $5,
       $6, $7, $8, $9,
       $10, $11, $12, $13, $14,
       TRUE, FALSE, NOW(), NOW(), $15, $16,
       NOW(), NOW()
     )
     ON CONFLICT (hubspot_contact_id) DO UPDATE SET
       company_record_id = EXCLUDED.company_record_id,
       hubspot_primary_company_id = EXCLUDED.hubspot_primary_company_id,
       hubspot_associated_company_ids = EXCLUDED.hubspot_associated_company_ids,
       email = COALESCE(EXCLUDED.email, greenhouse_crm.contacts.email),
       first_name = COALESCE(EXCLUDED.first_name, greenhouse_crm.contacts.first_name),
       last_name = COALESCE(EXCLUDED.last_name, greenhouse_crm.contacts.last_name),
       display_name = EXCLUDED.display_name,
       job_title = COALESCE(EXCLUDED.job_title, greenhouse_crm.contacts.job_title),
       phone = COALESCE(EXCLUDED.phone, greenhouse_crm.contacts.phone),
       mobile_phone = COALESCE(EXCLUDED.mobile_phone, greenhouse_crm.contacts.mobile_phone),
       lifecycle_stage = EXCLUDED.lifecycle_stage,
       lead_status = COALESCE(EXCLUDED.lead_status, greenhouse_crm.contacts.lead_status),
       active = TRUE,
       is_deleted = FALSE,
       source_updated_at = NOW(),
       synced_at = NOW(),
       sync_run_id = EXCLUDED.sync_run_id,
       payload_hash = EXCLUDED.payload_hash,
       updated_at = NOW()`,
    [
      contactRecordId, companyRecordId, contact.hubspotContactId,
      hubspotCompanyId, [hubspotCompanyId],
      contact.email, contact.firstName, contact.lastName, displayName,
      contact.jobTitle, contact.phone, contact.mobilePhone, contact.lifecyclestage, contact.hsLeadStatus,
      syncRunId, payloadHash
    ]
  )
}

const startSyncRun = async (
  syncRunId: string,
  hubspotCompanyId: string,
  triggeredBy: string | null
): Promise<void> => {
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_sync.source_sync_runs (
       sync_run_id, source_system, source_object_type, sync_mode, status,
       triggered_by, notes, started_at
     ) VALUES (
       $1, 'hubspot', 'company', 'incremental', 'running',
       $2, $3, NOW()
     )`,
    [syncRunId, triggeredBy ?? 'manual', `On-demand sync for HubSpot company ${hubspotCompanyId}`]
  )
}

const finishSyncRun = async (
  syncRunId: string,
  status: 'succeeded' | 'failed',
  recordsWritten: number,
  errorMessage?: string
): Promise<void> => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_sync.source_sync_runs
     SET status = $1,
         records_read = $2,
         records_written_raw = $2,
         finished_at = NOW(),
         notes = COALESCE(notes, '') || COALESCE($3, '')
     WHERE sync_run_id = $4`,
    [status, recordsWritten, errorMessage ? ` | error: ${errorMessage}` : null, syncRunId]
  )
}

export const syncHubSpotCompanyById = async (
  hubspotCompanyId: string,
  options: { promote?: boolean; triggeredBy?: string | null } = {}
): Promise<SyncCompanyByIdResult> => {
  const trimmed = hubspotCompanyId.trim()

  if (!trimmed) {
    throw new Error('hubspotCompanyId is required')
  }

  const promote = options.promote ?? true
  const syncRunId = `manual-company-${randomUUID()}`

  // Pre-create sync_run row so FK constraints in greenhouse_crm.* succeed.
  await startSyncRun(syncRunId, trimmed, options.triggeredBy ?? null)

  let companyRecordId = ''
  let contactsCount = 0
  let promotedSummary: SyncCompanyByIdResult['promotedSummary'] = null

  try {
    // 1. Fetch company profile from bridge
    const profile = await fetchFromBridge<BridgeCompanyProfile>(`/companies/${trimmed}`)

    // 2. Fetch contacts from bridge
    let contacts: BridgeContactProfile[] = []

    try {
      const contactsBody = await fetchFromBridge<{ contacts?: BridgeContactProfile[] }>(
        `/companies/${trimmed}/contacts`
      )

      contacts = contactsBody.contacts ?? []
    } catch (err) {
      console.warn(`[sync-company-by-id] Failed to fetch contacts for ${trimmed}:`, err instanceof Error ? err.message : err)
    }

    contactsCount = contacts.length

    // 3. Upsert company first (autocommit), then contacts (FK to company).
    const r = await upsertCompany(syncRunId, profile)

    companyRecordId = r.companyRecordId
    console.log(`[sync-company-by-id] Company upserted: ${companyRecordId}`)

    // Verify company exists before linking contacts (defensive)
    const verify = await runGreenhousePostgresQuery<{ company_record_id: string }>(
      `SELECT company_record_id FROM greenhouse_crm.companies WHERE company_record_id = $1`,
      [companyRecordId]
    )

    if (verify.length === 0) {
      throw new Error(`Company ${companyRecordId} was not persisted (FK would fail).`)
    }

    for (const contact of contacts) {
      console.log(`[sync-company-by-id] Upserting contact ${contact.hubspotContactId} (company=${companyRecordId})...`)
      await upsertContact(syncRunId, companyRecordId, trimmed, contact)
    }

    // 4. Promote crm → core (organization + client)
    if (promote) {
      const summary = await syncHubSpotCompanies({ dryRun: false, fullResync: false })

      promotedSummary = {
        processed: summary.processed,
        created: summary.created,
        promoted: summary.promoted,
        clientsInstantiated: summary.clientsInstantiated
      }
    }

    await finishSyncRun(syncRunId, 'succeeded', 1 + contactsCount)
  } catch (err) {
    await finishSyncRun(syncRunId, 'failed', 0, err instanceof Error ? err.message : String(err))
    throw err
  }

  return {
    hubspotCompanyId: trimmed,
    companyRecordId,
    companyUpserted: true,
    contactsUpserted: contactsCount,
    promotedSummary
  }
}
