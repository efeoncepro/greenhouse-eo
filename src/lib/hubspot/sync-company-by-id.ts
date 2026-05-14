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
  capabilities?: {
    businessLines?: string[]
    serviceModules?: string[]
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
  capabilities: {
    businessLines: string[]
    serviceModules: string[]
  }
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
  const payloadHash = buildPayloadHash(profile)
  const websiteOrDomain = profile.identity.website ?? profile.identity.domain ?? null

  // Race-safe UPSERT canónico. El `candidateRecordId` solo se materializa cuando
  // la fila no existe; bajo ON CONFLICT DO UPDATE la fila conserva su PK original
  // y RETURNING devuelve el `company_record_id` realmente persistido (winner-take-all).
  // Eliminamos pre-SELECT + post-verify que generaban un bug class de race condition
  // cuando HubSpot dispara webhooks concurrentes para el mismo hubspot_company_id.
  const candidateRecordId = `crm-company-${randomUUID()}`

  const rows = await runGreenhousePostgresQuery<{ company_record_id: string }>(
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
       updated_at = NOW()
     RETURNING company_record_id`,
    [
      candidateRecordId, profile.hubspotCompanyId, profile.identity.name, null,
      profile.lifecycle.lifecyclestage, profile.identity.industry, profile.identity.country, websiteOrDomain,
      syncRunId, payloadHash
    ]
  )

  if (rows.length === 0) {
    // Estructuralmente imposible con ON CONFLICT DO UPDATE — RETURNING siempre devuelve
    // la fila persistida. Si llegamos aquí algo patológico ocurre (trigger BEFORE que
    // aborta, RLS bloqueando lectura, DDL inesperado). Escalar a humano vía Sentry.
    throw new Error(
      `INSERT...ON CONFLICT DO UPDATE on greenhouse_crm.companies for hubspot_company_id=${profile.hubspotCompanyId} returned no row. ` +
      'Check for BEFORE triggers, RLS, or DDL changes suppressing RETURNING.'
    )
  }

  return { companyRecordId: rows[0].company_record_id }
}

const upsertContact = async (
  syncRunId: string,
  companyRecordId: string,
  hubspotCompanyId: string,
  contact: BridgeContactProfile
): Promise<void> => {
  const displayName = contact.displayName
    ?? [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim()
    ?? contact.email
    ?? contact.hubspotContactId

  const payloadHash = buildPayloadHash(contact)

  // Race-safe UPSERT canónico (mismo patrón que upsertCompany). El candidate
  // contact_record_id solo se materializa cuando la fila no existe; ON CONFLICT
  // DO UPDATE preserva el PK original. Eliminamos el pre-SELECT que generaba
  // bug class de race condition con webhooks concurrentes para el mismo contact.
  const candidateContactId = `crm-contact-${randomUUID()}`

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
      candidateContactId, companyRecordId, contact.hubspotContactId,
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
  let businessLines: string[] = []
  let serviceModules: string[] = []

  try {
    // 1. Fetch company profile from bridge
    const profile = await fetchFromBridge<BridgeCompanyProfile>(`/companies/${trimmed}`)

    businessLines = Array.isArray(profile.capabilities?.businessLines) ? profile.capabilities!.businessLines : []
    serviceModules = Array.isArray(profile.capabilities?.serviceModules) ? profile.capabilities!.serviceModules : []

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
    // companyRecordId proviene de RETURNING — es el PK canónico persistido
    // (winner-take-all bajo concurrencia). No requiere verify defensivo: el
    // race condition que motivaba la verificación está estructuralmente cerrado.
    const r = await upsertCompany(syncRunId, profile)

    companyRecordId = r.companyRecordId
    console.log(`[sync-company-by-id] Company upserted: ${companyRecordId}`)

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
    promotedSummary,
    capabilities: { businessLines, serviceModules }
  }
}
