import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { generateOrganizationId, nextPublicId } from '@/lib/account-360/id-generation'

// ─── Types ──────────────────────────────────────────────────────────────

type OrgByTaxIdRow = {
  organization_id: string
  organization_type: string
}

type SpaceOrgRow = {
  organization_id: string
}

// ─── Operating Entity Identity ──────────────────────────────────────────

export interface OperatingEntityIdentity {
  organizationId: string
  legalName: string
  taxId: string
  taxIdType: string | null
  legalAddress: string | null
  country: string
}

type OperatingEntityRow = {
  organization_id: string
  legal_name: string
  tax_id: string
  tax_id_type: string | null
  legal_address: string | null
  country: string
}

let cachedOperatingEntity: OperatingEntityIdentity | null = null

/**
 * Resolves the operating entity — the legal organization that owns Greenhouse,
 * employs collaborators, signs payroll documents, and emits DTEs.
 *
 * Uses `is_operating_entity = TRUE` flag. Result is cached in memory since
 * the operating entity does not change between requests.
 */
export const getOperatingEntityIdentity = async (): Promise<OperatingEntityIdentity | null> => {
  if (cachedOperatingEntity) return cachedOperatingEntity

  const rows = await runGreenhousePostgresQuery<OperatingEntityRow>(
    `SELECT organization_id, legal_name, tax_id, tax_id_type, legal_address, country
     FROM greenhouse_core.organizations
     WHERE is_operating_entity = TRUE AND active = TRUE
     LIMIT 1`
  )

  if (rows.length === 0) return null

  const row = rows[0]

  cachedOperatingEntity = {
    organizationId: row.organization_id,
    legalName: row.legal_name,
    taxId: row.tax_id,
    taxIdType: row.tax_id_type,
    legalAddress: row.legal_address,
    country: row.country
  }

  return cachedOperatingEntity
}

// ─── Find Organization by Tax ID ────────────────────────────────────────

/**
 * Finds an existing organization by tax_id (RUT, RFC, EIN, VAT, etc.).
 * Returns null if no match found.
 */
export const findOrganizationByTaxId = async (
  taxId: string
): Promise<{ organizationId: string; organizationType: string } | null> => {
  const rows = await runGreenhousePostgresQuery<OrgByTaxIdRow>(
    `SELECT organization_id, COALESCE(organization_type, 'other') AS organization_type
     FROM greenhouse_core.organizations
     WHERE tax_id = $1 AND active = TRUE
     LIMIT 1`,
    [taxId]
  )

  if (rows.length === 0) return null

  return {
    organizationId: rows[0].organization_id,
    organizationType: rows[0].organization_type
  }
}

// ─── Ensure Organization for Supplier ───────────────────────────────────

/**
 * Finds or creates an organization for a supplier based on tax_id.
 *
 * - If an org with matching tax_id already exists:
 *   - If type is 'client', upgrades to 'both'
 *   - Returns existing organization_id
 * - If no match, creates a new org with type 'supplier'
 *
 * Supports international suppliers — tax_id_type and country are set
 * according to the supplier's origin (RUT for Chile, RFC for Mexico, etc.)
 */
export const ensureOrganizationForSupplier = async (params: {
  taxId: string
  taxIdType?: string // 'RUT', 'RFC', 'EIN', 'VAT', 'CUIT', 'NIT', etc.
  legalName: string
  tradeName?: string | null
  country?: string // 'CL', 'US', 'MX', 'AR', etc.
}): Promise<string> => {
  const { taxId, taxIdType, legalName, tradeName, country } = params

  // 1. Check for existing org by tax_id
  const existing = await findOrganizationByTaxId(taxId)

  if (existing) {
    // Upgrade type to 'both' if currently 'client'
    if (existing.organizationType === 'client') {
      await runGreenhousePostgresQuery(
        `UPDATE greenhouse_core.organizations
         SET organization_type = 'both', updated_at = NOW()
         WHERE organization_id = $1`,
        [existing.organizationId]
      )
    }

    return existing.organizationId
  }

  // 2. Create new organization for supplier
  const organizationId = generateOrganizationId()
  const publicId = await nextPublicId('EO-ORG')

  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_core.organizations (
      organization_id, public_id, organization_name, legal_name,
      tax_id, tax_id_type, country, organization_type,
      status, active, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'supplier', 'active', TRUE, NOW(), NOW())`,
    [
      organizationId,
      publicId,
      tradeName || legalName,
      legalName,
      taxId,
      taxIdType || null,
      country || 'CL'
    ]
  )

  return organizationId
}

// ─── Resolve Organization for Client ────────────────────────────────────

/**
 * Resolves organization_id for an income record from client_id via the
 * spaces bridge (client_id → spaces → organization_id).
 *
 * Returns null if the client has no active space with an organization.
 */
export const resolveOrganizationForClient = async (
  clientId: string
): Promise<string | null> => {
  const rows = await runGreenhousePostgresQuery<SpaceOrgRow>(
    `SELECT organization_id
     FROM greenhouse_core.spaces
     WHERE client_id = $1 AND organization_id IS NOT NULL AND active = TRUE
     LIMIT 1`,
    [clientId]
  )

  return rows.length > 0 ? rows[0].organization_id : null
}
