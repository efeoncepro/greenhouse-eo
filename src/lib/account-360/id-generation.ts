import 'server-only'
import { randomUUID } from 'node:crypto'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

// ── Internal IDs (PKs) ─────────────────────────────────────────────────

export const generateOrganizationId = () => `org-${randomUUID()}`
export const generateSpaceId = () => `spc-${randomUUID()}`
export const generateMembershipId = () => `mbr-${randomUUID()}`
export const generateServiceId = () => `svc-${randomUUID()}`

// ── Public IDs (EO-IDs, human-readable, sequential) ────────────────────

const SEQUENCE_MAP = {
  'EO-ORG': 'greenhouse_core.seq_organization_public_id',
  'EO-SPC': 'greenhouse_core.seq_space_public_id',
  'EO-MBR': 'greenhouse_core.seq_membership_public_id',
  'EO-SVC': 'greenhouse_core.seq_service_public_id'
} as const

type PublicIdPrefix = keyof typeof SEQUENCE_MAP

/**
 * Generates the next sequential public ID for the given prefix.
 * Uses PostgreSQL sequences for concurrency-safe generation.
 *
 * @example
 *   await nextPublicId('EO-ORG') // 'EO-ORG-0001'
 *   await nextPublicId('EO-SPC') // 'EO-SPC-0001'
 */
export const nextPublicId = async (prefix: PublicIdPrefix): Promise<string> => {
  const sequenceName = SEQUENCE_MAP[prefix]

  const rows = await runGreenhousePostgresQuery<{ next_val: string }>(
    `SELECT nextval('${sequenceName}') AS next_val`
  )

  const seq = Number(rows[0]?.next_val ?? 1)

  return `${prefix}-${String(seq).padStart(4, '0')}`
}
