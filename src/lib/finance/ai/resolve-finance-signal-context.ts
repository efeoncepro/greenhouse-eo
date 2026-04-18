import 'server-only'

import { getDb } from '@/lib/db'

import type { FinanceSignalRecord } from './finance-signal-types'

export interface ResolvedFinanceSignalContext {
  clients: Map<string, string>
  organizations: Map<string, string>
  spaces: Map<string, string>
}

export const resolveFinanceSignalContext = async (
  signals: FinanceSignalRecord[]
): Promise<ResolvedFinanceSignalContext> => {
  const clientIds = [...new Set(signals.map(s => s.clientId).filter((id): id is string => id !== null))]

  const organizationIds = [
    ...new Set(signals.map(s => s.organizationId).filter((id): id is string => id !== null))
  ]

  const spaceIds = [...new Set(signals.map(s => s.spaceId).filter((id): id is string => id !== null))]

  const [clients, organizations, spaces] = await Promise.all([
    resolveClients(clientIds),
    resolveOrganizations(organizationIds),
    resolveSpaces(spaceIds)
  ])

  return { clients, organizations, spaces }
}

const resolveClients = async (clientIds: string[]): Promise<Map<string, string>> => {
  if (clientIds.length === 0) return new Map()

  const db = await getDb()

  const rows = await db
    .selectFrom('greenhouse_core.clients')
    .select(['client_id', 'client_name'])
    .where('client_id', 'in', clientIds)
    .execute()

  return new Map(rows.map(row => [row.client_id, row.client_name]))
}

const resolveOrganizations = async (organizationIds: string[]): Promise<Map<string, string>> => {
  if (organizationIds.length === 0) return new Map()

  const db = await getDb()

  const rows = await db
    .selectFrom('greenhouse_core.organizations')
    .select(['organization_id', 'organization_name'])
    .where('organization_id', 'in', organizationIds)
    .execute()

  return new Map(rows.map(row => [row.organization_id, row.organization_name]))
}

const resolveSpaces = async (spaceIds: string[]): Promise<Map<string, string>> => {
  if (spaceIds.length === 0) return new Map()

  const db = await getDb()

  const rows = await db
    .selectFrom('greenhouse_core.spaces')
    .select(['space_id', 'space_name'])
    .where('space_id', 'in', spaceIds)
    .execute()

  return new Map(rows.map(row => [row.space_id, row.space_name]))
}
