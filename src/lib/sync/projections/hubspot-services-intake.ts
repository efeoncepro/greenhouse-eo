import 'server-only'

import {
  batchReadServices,
  type HubSpotServiceObject
} from '@/lib/hubspot/list-services-for-company'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { resolveSecret } from '@/lib/webhooks/signing'
import { upsertServiceFromHubSpot } from '@/lib/services/upsert-service-from-hubspot'

import type { ProjectionDefinition } from '../projection-registry'

/**
 * TASK-813b — Reactive projection: HubSpot p_services intake async.
 *
 * Subscribe a `commercial.service_engagement.intake_requested` v1 (emitido
 * por el webhook handler hubspot-services en el path async). Hace los HTTP
 * fetch a HubSpot + UPSERT canónico fuera del request path del webhook,
 * cumpliendo la regla de TASK-771/773 (anti-pattern: fetch sincrono dentro
 * del webhook handler).
 *
 * **Por qué async**: el webhook HubSpot tiene timeout de 5s. Si el batch
 * tiene N services, el handler hace 1 batchRead + N association lookups
 * sincronos = N+1 calls HubSpot. Para batches grandes (50+) puede exceder
 * timeout → HubSpot reintenta → loop infinito. Este path async desacopla.
 *
 * **Flow**:
 * 1. Webhook hubspot-services recibe events → valida firma → emite
 *    `commercial.service_engagement.intake_requested` v1 al outbox + return.
 *    Latencia webhook < 100ms (sólo INSERT outbox).
 * 2. ops-reactive-finance cron (cada 5 min) drena el outbox + invoca esta
 *    projection per-event.
 * 3. Projection re-lee el batch HubSpot, resuelve company associations,
 *    UPSERT canónico per service, outbox event materialized v1 atomic.
 * 4. Failures rotean a retry (maxRetries=3) → dead-letter.
 *
 * **Domain**: 'finance' temporal hasta que TASK-807 introduzca 'commercial'
 * domain con su propio cron Cloud Scheduler.
 *
 * **Re-read pattern**: NO confiar en payload del outbox event como source
 * of truth. Re-fetch desde HubSpot al refresh-time garantiza consistencia
 * con HubSpot. Pattern TASK-771.
 *
 * **Idempotente**: UPSERT canónico por hubspot_service_id UNIQUE. Re-runs
 * safe.
 */

interface IntakePayload {
  serviceIds?: string[]
  source?: string
}

const SPACE_BY_HS_COMPANY_SQL = `
  SELECT s.space_id, s.client_id, s.organization_id
  FROM greenhouse_core.spaces s
  JOIN greenhouse_core.clients c ON c.client_id = s.client_id
  WHERE c.hubspot_company_id = $1
  LIMIT 1
`

interface SpaceLookup extends Record<string, unknown> {
  space_id: string
  client_id: string
  organization_id: string | null
}

const TOKEN_ENV = 'HUBSPOT_ACCESS_TOKEN'
const TOKEN_GCP = 'gcp:hubspot-access-token'

const fetchHubSpotToken = async (): Promise<string> => {
  const envValue = process.env[TOKEN_ENV]?.trim()

  if (envValue) return envValue

  const token = await resolveSecret(TOKEN_GCP)

  if (!token) {
    throw new Error('HubSpot access token not configured')
  }

  return token
}

const resolveCompanyForService = async (serviceId: string): Promise<string | null> => {
  const token = await fetchHubSpotToken()
  const url = `https://api.hubapi.com/crm/v4/objects/0-162/${serviceId}/associations/companies?limit=1`

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000)
  })

  if (response.status === 404) return null

  if (!response.ok) {
    const text = await response.text()

    throw new Error(`HubSpot association lookup failed: ${response.status} ${text.slice(0, 200)}`)
  }

  const json = (await response.json()) as { results: Array<{ toObjectId: string | number }> }
  const first = json.results[0]

  return first ? String(first.toObjectId) : null
}

export const hubspotServicesIntakeProjection: ProjectionDefinition = {
  name: 'hubspot_services_intake',
  description:
    'Async intake de p_services HubSpot — fetch + UPSERT fuera del webhook handler request path',
  domain: 'finance', // TODO TASK-807: migrar a 'commercial' cuando exista
  triggerEvents: ['commercial.service_engagement.intake_requested'],
  extractScope: payload => {
    const serviceIds = Array.isArray(payload.serviceIds)
      ? (payload.serviceIds as unknown[]).filter((s): s is string => typeof s === 'string')
      : []

    if (serviceIds.length === 0) return null

    // El scope.entityId es la primera serviceId del batch — usado solo para
    // dedup/audit en el reactive consumer log. El refresh re-procesa todo
    // el batch desde el payload.
    return {
      entityType: 'hubspot_services_batch',
      entityId: serviceIds[0]
    }
  },
  refresh: async (_scope, payload) => {
    const intake = payload as unknown as IntakePayload
    const serviceIds = Array.isArray(intake.serviceIds) ? intake.serviceIds : []
    const source = typeof intake.source === 'string' ? intake.source : 'unknown'

    if (serviceIds.length === 0) {
      return 'hubspot_services_intake skipped: empty serviceIds'
    }

    let serviceObjects: HubSpotServiceObject[]

    try {
      serviceObjects = await batchReadServices(serviceIds)
    } catch (err) {
      captureWithDomain(err, 'integrations.hubspot', {
        tags: { source: 'hubspot_services_intake', stage: 'batch_read' },
        extra: { serviceCount: serviceIds.length }
      })

      throw err
    }

    const failures: string[] = []
    let materialized = 0

    // Memoize company lookups dentro del batch — si N services del mismo
    // company llegan, hacer N calls a HubSpot es desperdicio. Anti N+1.
    const companyCache = new Map<string, string | null>()

    for (const svc of serviceObjects) {
      try {
        let hubspotCompanyId: string | null

        if (companyCache.has(svc.id)) {
          hubspotCompanyId = companyCache.get(svc.id) ?? null
        } else {
          hubspotCompanyId = await resolveCompanyForService(svc.id)
          companyCache.set(svc.id, hubspotCompanyId)
        }

        if (!hubspotCompanyId) {
          failures.push(`organization_unresolved:${svc.id}`)
          captureWithDomain(
            new Error(`organization_unresolved:${svc.id}`),
            'integrations.hubspot',
            {
              level: 'warning',
              tags: { source: 'hubspot_services_intake', reason: 'no_company_association' },
              extra: { hubspotServiceId: svc.id }
            }
          )
          continue
        }

        const spaceRows = await runGreenhousePostgresQuery<SpaceLookup>(
          SPACE_BY_HS_COMPANY_SQL,
          [hubspotCompanyId]
        )

        if (spaceRows.length === 0) {
          failures.push(`organization_unresolved:${svc.id}:${hubspotCompanyId}`)
          captureWithDomain(
            new Error(`organization_unresolved:${svc.id}:${hubspotCompanyId}`),
            'integrations.hubspot',
            {
              level: 'warning',
              tags: { source: 'hubspot_services_intake', reason: 'no_greenhouse_space' },
              extra: { hubspotServiceId: svc.id, hubspotCompanyId }
            }
          )
          continue
        }

        await upsertServiceFromHubSpot({
          hubspotServiceId: svc.id,
          hubspotCompanyId,
          space: spaceRows[0],
          properties: svc.properties,
          source: `hubspot_services_intake:${source}`
        })

        materialized++
      } catch (err) {
        captureWithDomain(err, 'integrations.hubspot', {
          tags: { source: 'hubspot_services_intake' },
          extra: { hubspotServiceId: svc.id }
        })
        failures.push(`${svc.id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    const summary = `hubspot_services_intake: materialized=${materialized}/${serviceObjects.length} failures=${failures.length} source=${source}`

    if (failures.length === serviceObjects.length && failures.length > 0) {
      // Si TODOS fallaron, el reactive consumer enruta a retry. Si todos
      // son organization_unresolved, retry NO va a resolver (es estado
      // del operador HubSpot). Pero el TODO es resolverlo manual via UI
      // admin endpoint — el retry agotará y caerá a dead-letter, donde
      // el reliability signal lo expone.
      throw new Error(summary)
    }

    return summary
  },
  maxRetries: 3
}
