import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

type SpaceScopeRow = {
  space_id: string
  client_id: string | null
  organization_id: string | null
}

export const resolveExpenseSpaceScope = async ({
  requestedSpaceId,
  requestedOrganizationId,
  requestedClientId,
  allocatedClientId
}: {
  requestedSpaceId?: string | null
  requestedOrganizationId?: string | null
  requestedClientId?: string | null
  allocatedClientId?: string | null
}) => {
  const normalizedSpaceId = requestedSpaceId?.trim() || null
  const normalizedOrganizationId = requestedOrganizationId?.trim() || null
  const preferredClientId = requestedClientId?.trim() || allocatedClientId?.trim() || null

  if (normalizedSpaceId) {
    const rows = await runGreenhousePostgresQuery<SpaceScopeRow>(
      `
        SELECT space_id, client_id, organization_id
        FROM greenhouse_core.spaces
        WHERE space_id = $1
          AND active = TRUE
        LIMIT 1
      `,
      [normalizedSpaceId]
    )

    return {
      spaceId: rows[0]?.space_id ?? null,
      clientId: rows[0]?.client_id ?? preferredClientId ?? null,
      organizationId: rows[0]?.organization_id ?? normalizedOrganizationId ?? null
    }
  }

  if (preferredClientId) {
    const rows = await runGreenhousePostgresQuery<SpaceScopeRow>(
      `
        SELECT space_id, client_id, organization_id
        FROM greenhouse_core.spaces
        WHERE client_id = $1
          AND active = TRUE
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, space_id ASC
        LIMIT 1
      `,
      [preferredClientId]
    )

    return {
      spaceId: rows[0]?.space_id ?? null,
      clientId: rows[0]?.client_id ?? preferredClientId,
      organizationId: rows[0]?.organization_id ?? normalizedOrganizationId ?? null
    }
  }

  if (normalizedOrganizationId) {
    const rows = await runGreenhousePostgresQuery<SpaceScopeRow>(
      `
        SELECT space_id, client_id, organization_id
        FROM greenhouse_core.spaces
        WHERE organization_id = $1
          AND active = TRUE
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, space_id ASC
        LIMIT 1
      `,
      [normalizedOrganizationId]
    )

    return {
      spaceId: rows[0]?.space_id ?? null,
      clientId: rows[0]?.client_id ?? null,
      organizationId: rows[0]?.organization_id ?? normalizedOrganizationId
    }
  }

  return {
    spaceId: null,
    clientId: null,
    organizationId: null
  }
}
