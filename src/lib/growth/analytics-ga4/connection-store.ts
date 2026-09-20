import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { Ga4Connection, Ga4ConnectionStatus } from './contracts'

type Row = Record<string, unknown>

const iso = (value: unknown): string | null => value ? new Date(String(value)).toISOString() : null

const map = (row: Row): Ga4Connection => ({
  organizationId: String(row.organization_id),
  propertyId: row.property_id == null ? null : String(row.property_id),
  propertyName: row.property_name == null ? null : String(row.property_name),
  status: String(row.status) as Ga4ConnectionStatus,
  scopes: Array.isArray(row.scopes) ? row.scopes as string[] : [],
  tokenSecretRef: row.token_secret_ref == null ? null : String(row.token_secret_ref),
  connectedByUserId: row.connected_by_user_id == null ? null : String(row.connected_by_user_id),
  connectedAt: iso(row.connected_at),
  lastVerifiedAt: iso(row.last_verified_at),
  lastErrorCode: row.last_error_code == null ? null : String(row.last_error_code)
})

const columns = `organization_id, property_id, property_name, status, scopes, token_secret_ref,
  connected_by_user_id, connected_at, last_verified_at, last_error_code`

export const getGa4Connection = async (organizationId: string): Promise<Ga4Connection | null> => {
  const rows = await runGreenhousePostgresQuery<Row>(
    `SELECT ${columns} FROM greenhouse_growth.ga4_connections WHERE organization_id = $1`,
    [organizationId]
  )

  return rows[0] ? map(rows[0]) : null
}

export const upsertPendingGa4Connection = async (input: {
  organizationId: string
  scopes: string[]
  tokenSecretRef: string
  connectedByUserId: string | null
}): Promise<Ga4Connection> => {
  const rows = await runGreenhousePostgresQuery<Row>(
    `INSERT INTO greenhouse_growth.ga4_connections
       (organization_id, property_id, property_name, status, scopes, token_secret_ref,
        connected_by_user_id, connected_at, last_verified_at, last_error_code)
     VALUES ($1, NULL, NULL, 'pending', $2, $3, $4, NOW(), NULL, NULL)
     ON CONFLICT (organization_id) DO UPDATE SET
       property_id = NULL, property_name = NULL, status = 'pending', scopes = EXCLUDED.scopes,
       token_secret_ref = EXCLUDED.token_secret_ref, connected_by_user_id = EXCLUDED.connected_by_user_id,
       connected_at = NOW(), last_verified_at = NULL, last_error_code = NULL, updated_at = NOW()
     RETURNING ${columns}`,
    [input.organizationId, input.scopes, input.tokenSecretRef, input.connectedByUserId]
  )

  return map(rows[0])
}

export const setGa4Property = async (organizationId: string, propertyId: string, propertyName: string): Promise<Ga4Connection | null> => {
  const rows = await runGreenhousePostgresQuery<Row>(
    `UPDATE greenhouse_growth.ga4_connections
        SET property_id = $2, property_name = $3, status = 'active',
            last_verified_at = NOW(), last_error_code = NULL, updated_at = NOW()
      WHERE organization_id = $1 AND token_secret_ref IS NOT NULL
      RETURNING ${columns}`,
    [organizationId, propertyId, propertyName]
  )

  return rows[0] ? map(rows[0]) : null
}

export const setGa4ConnectionStatus = async (organizationId: string, status: Ga4ConnectionStatus, errorCode: string | null) => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_growth.ga4_connections
        SET status = $2, last_error_code = $3, last_verified_at = NOW(), updated_at = NOW()
      WHERE organization_id = $1`,
    [organizationId, status, errorCode]
  )
}

export const disconnectGa4Connection = async (organizationId: string): Promise<boolean> => {
  const rows = await runGreenhousePostgresQuery<{ organization_id: string }>(
    `UPDATE greenhouse_growth.ga4_connections
        SET status = 'revoked', token_secret_ref = NULL, last_error_code = NULL, updated_at = NOW()
      WHERE organization_id = $1 RETURNING organization_id`,
    [organizationId]
  )

  return rows.length > 0
}
