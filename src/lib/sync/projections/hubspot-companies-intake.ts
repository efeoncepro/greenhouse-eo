import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { syncHubSpotCompanyById } from '@/lib/hubspot/sync-company-by-id'
import { syncTenantCapabilitiesFromIntegration } from '@/lib/integrations/greenhouse-integration'

import type { ProjectionDefinition } from '../projection-registry'

/**
 * TASK-878 — Reactive projection: HubSpot companies + contacts intake async.
 *
 * Subscribe a `commercial.hubspot_company.sync_requested v1` (emitido por el
 * webhook handler hubspot-companies en el path async). Hace los HTTP fetch al
 * Cloud Run bridge + UPSERT canónico + promote (crm → core) fuera del request
 * path del webhook, cumpliendo la regla canónica TASK-771/773 (anti-pattern:
 * sync sincrono blocking dentro del webhook handler que excede el 5s timeout
 * de HubSpot y dispara retries → race conditions).
 *
 * **Por qué async** (root cause histórico, Sentry JAVASCRIPT-NEXTJS-5T):
 *  - `syncHubSpotCompanyById` toma 3-10s por company (2 bridge fetches + N
 *    contact UPSERTs + promote `syncHubSpotCompanies({fullResync:false})`).
 *  - HubSpot tiene 5s timeout por POST. Cuando el sync excede 5s, HubSpot
 *    reintenta → dos webhook deliveries concurrentes para el mismo company.
 *  - Bajo concurrencia con local PK generation (pre TASK-878 Slice 1), el
 *    `verify` defensivo lanzaba `Company X was not persisted (FK would fail)`.
 *  - Slice 1 cerró la race condition estructural (RETURNING canónico).
 *  - Slice 2 (esta projection) cierra la causa arquitectónica: el webhook
 *    responde <100ms, el sync corre async, los retries son innecesarios.
 *
 * **Flow**:
 * 1. Webhook hubspot-companies recibe events → valida firma → extrae
 *    `companyIds` únicos del batch → emite N events
 *    `commercial.hubspot_company.sync_requested v1` (uno por company) → return.
 *    Latencia webhook < 100ms (solo INSERT outbox por company id).
 * 2. ops-reactive-finance cron (cada 5 min) drena el outbox + invoca esta
 *    projection per-event. El dispatcher V2 agrupa por `aggregateId` (= el
 *    `hubspotCompanyId` único) y serializa per-scope, eliminando duplicate
 *    bridge fetches cuando HubSpot dispara N events para el mismo company.
 * 3. Projection re-lee el company desde HubSpot via bridge, UPSERT canónico
 *    en greenhouse_crm.companies + greenhouse_crm.contacts (race-safe vía
 *    RETURNING canónico TASK-878 Slice 1), promote a greenhouse_core.
 * 4. Capability sync (business_lines + service_modules) corre dentro del
 *    refresh — antes vivía inline en el webhook handler.
 * 5. Failures rotean a retry exponencial (maxRetries=3) → dead-letter.
 *    Reliability signal `commercial.hubspot_company.intake_dead_letter`
 *    escala humano si emergen entries persistentes.
 *
 * **Domain**: 'finance' alineado con `hubspot_services_intake` (TASK-813b)
 * hasta que TASK-807 introduzca el domain 'commercial' con su propio cron.
 *
 * **Re-read pattern (TASK-771)**: NO confiar en payload como source of truth.
 * `syncHubSpotCompanyById` re-fetches el bridge al refresh-time, garantizando
 * consistencia con HubSpot. Si el payload del outbox event es stale (e.g.
 * dedup window agrupa 3 propertyChange events del mismo company), el sync
 * corre una vez con datos frescos.
 *
 * **Idempotente**: UPSERT canónico por hubspot_company_id UNIQUE + RETURNING.
 * Re-runs safe. La promote step (`syncHubSpotCompanies`) también es idempotent.
 */

interface CompanyIntakePayload {
  hubspotCompanyId?: string
  source?: string
}

export const hubspotCompaniesIntakeProjection: ProjectionDefinition = {
  name: 'hubspot_companies_intake',
  description:
    'Async intake de companies + contacts HubSpot — bridge fetch + UPSERT + promote fuera del webhook handler request path. Cierra causa arquitectónica del Sentry JAVASCRIPT-NEXTJS-5T (race condition por inline sync que excedía 5s timeout HubSpot).',
  domain: 'finance', // Mirror TASK-813b; TODO TASK-807 migrar a 'commercial'
  triggerEvents: ['commercial.hubspot_company.sync_requested'],
  extractScope: payload => {
    const intake = payload as unknown as CompanyIntakePayload

    const hubspotCompanyId = typeof intake.hubspotCompanyId === 'string'
      ? intake.hubspotCompanyId.trim()
      : ''

    if (!hubspotCompanyId) return null

    // entityId = hubspotCompanyId → el dispatcher V2 agrupa por scope, así N
    // events concurrentes para el mismo company colapsan en una sola refresh
    // call. Mata el bug class "duplicate bridge fetches under burst".
    return {
      entityType: 'hubspot_company',
      entityId: hubspotCompanyId
    }
  },
  refresh: async (scope, payload) => {
    const intake = payload as unknown as CompanyIntakePayload
    const source = typeof intake.source === 'string' ? intake.source : 'unknown'
    const hubspotCompanyId = scope.entityId

    if (!hubspotCompanyId) {
      return 'hubspot_companies_intake skipped: empty hubspotCompanyId'
    }

    try {
      const result = await syncHubSpotCompanyById(hubspotCompanyId, {
        promote: true,
        triggeredBy: `hubspot-webhook-async:${source}`
      })

      // Capability sync inline en la projection (mirror del path inline que
      // vivía en el webhook handler pre-TASK-878 Slice 2). Failures aquí NO
      // abortan la projection — el sync principal ya commiteó.
      if (
        result.capabilities.businessLines.length > 0 ||
        result.capabilities.serviceModules.length > 0
      ) {
        try {
          await syncTenantCapabilitiesFromIntegration({
            selector: {
              clientId: null,
              publicId: null,
              sourceSystem: 'hubspot_crm',
              sourceObjectType: 'company',
              sourceObjectId: hubspotCompanyId
            },
            sourceSystem: 'hubspot_crm',
            sourceObjectType: 'company',
            sourceObjectId: hubspotCompanyId,
            confidence: 'high',
            businessLines: result.capabilities.businessLines,
            serviceModules: result.capabilities.serviceModules
          })
        } catch (err) {
          captureWithDomain(err, 'integrations.hubspot', {
            level: 'warning',
            tags: { source: 'hubspot_companies_intake', stage: 'capability_sync' },
            extra: { hubspotCompanyId }
          })
        }
      }

      return `hubspot_companies_intake: companyRecordId=${result.companyRecordId} contacts=${result.contactsUpserted} promoted=${result.promotedSummary?.promoted ?? 0} source=${source}`
    } catch (err) {
      captureWithDomain(err, 'integrations.hubspot', {
        level: 'error',
        tags: { source: 'hubspot_companies_intake', stage: 'sync_company_by_id' },
        extra: { hubspotCompanyId, payloadSource: source }
      })

      // Re-throw para que el reactive consumer rotee a retry exponencial.
      // Tras maxRetries el dispatcher marca dead-letter y el reliability
      // signal `commercial.hubspot_company.intake_dead_letter` lo escala.
      throw err
    }
  },
  maxRetries: 3
}
