import 'server-only'

import { query } from '@/lib/db'
import { refreshServiceSlaCompliance } from '@/lib/agency/sla-compliance'
import type { ProjectionDefinition } from '../projection-registry'

type ScopedServiceRow = {
  service_id: string
  space_id: string
}

const listServicesForOrganization = async (organizationId: string) => {
  const rows = await query<ScopedServiceRow>(
    `
      SELECT DISTINCT s.service_id, s.space_id
      FROM greenhouse_core.services s
      INNER JOIN greenhouse_core.service_sla_definitions d
        ON d.service_id = s.service_id
       AND d.space_id = s.space_id
       AND d.active = TRUE
      WHERE s.organization_id = $1
        AND s.active = TRUE
    `,
    [organizationId]
  )

  return rows
}

const listServicesForSpace = async (spaceId: string) => {
  const rows = await query<ScopedServiceRow>(
    `
      SELECT DISTINCT s.service_id, s.space_id
      FROM greenhouse_core.services s
      INNER JOIN greenhouse_core.service_sla_definitions d
        ON d.service_id = s.service_id
       AND d.space_id = s.space_id
       AND d.active = TRUE
      WHERE s.space_id = $1
        AND s.active = TRUE
    `,
    [spaceId]
  )

  return rows
}

export const serviceSlaComplianceProjection: ProjectionDefinition = {
  name: 'service_sla_compliance',
  description: 'Materialize SLA compliance snapshots per service from ICO Engine and conformed delivery sources',
  domain: 'delivery',
  triggerEvents: [
    'service.created',
    'service.updated',
    'service.sla_definition.created',
    'service.sla_definition.updated',
    'service.sla_definition.deleted',
    'ico.performance_report.materialized',
    'ico.materialization.completed'
  ],
  extractScope: payload => {
    const serviceId = typeof payload.serviceId === 'string' && payload.serviceId.trim()
      ? payload.serviceId.trim()
      : null

    const spaceId = typeof payload.spaceId === 'string' && payload.spaceId.trim()
      ? payload.spaceId.trim()
      : null

    const organizationId = typeof payload.organizationId === 'string' && payload.organizationId.trim()
      ? payload.organizationId.trim()
      : null

    if (serviceId && spaceId) {
      return {
        entityType: 'service_sla',
        entityId: `${spaceId}:${serviceId}`
      }
    }

    if (organizationId) {
      return {
        entityType: 'organization_service_sla',
        entityId: organizationId
      }
    }

    if (spaceId) {
      return {
        entityType: 'space_service_sla',
        entityId: spaceId
      }
    }

    return null
  },
  refresh: async scope => {
    if (scope.entityType === 'service_sla') {
      const [spaceId, serviceId] = scope.entityId.split(':')

      if (!serviceId || !spaceId) return null

      const report = await refreshServiceSlaCompliance({ serviceId, spaceId })

      return `refreshed ${serviceId} (${report.overallStatus})`
    }

    if (scope.entityType === 'organization_service_sla') {
      const services = await listServicesForOrganization(scope.entityId)

      if (services.length === 0) {
        return `no SLA-bound services for organization ${scope.entityId}`
      }

      await Promise.all(
        services.map(service =>
          refreshServiceSlaCompliance({
            serviceId: service.service_id,
            spaceId: service.space_id
          })
        )
      )

      return `refreshed ${services.length} services for organization ${scope.entityId}`
    }

    if (scope.entityType === 'space_service_sla') {
      const services = await listServicesForSpace(scope.entityId)

      if (services.length === 0) {
        return `no SLA-bound services for space ${scope.entityId}`
      }

      await Promise.all(
        services.map(service =>
          refreshServiceSlaCompliance({
            serviceId: service.service_id,
            spaceId: service.space_id
          })
        )
      )

      return `refreshed ${services.length} services for space ${scope.entityId}`
    }

    return `ignored unsupported SLA scope ${scope.entityType}`
  },
  maxRetries: 1
}
