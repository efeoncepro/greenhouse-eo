import 'server-only'

import type { PoolClient } from 'pg'

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

type SpaceClientRow = {
  space_id: string
  client_id: string | null
  client_name: string | null
}

type OrgByHubspotRow = {
  organization_id: string
  organization_type: string
}

type QueryableClient = Pick<PoolClient, 'query'>

const queryRows = async <T extends Record<string, unknown>>(
  text: string,
  values: unknown[] = [],
  client?: QueryableClient
) => {
  if (client) {
    const result = await client.query<T>(text, values)

    return result.rows
  }

  return runGreenhousePostgresQuery<T>(text, values)
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
  taxId: string,
  client?: QueryableClient
): Promise<{ organizationId: string; organizationType: string } | null> => {
  const rows = await queryRows<OrgByTaxIdRow>(
    `SELECT organization_id, COALESCE(organization_type, 'other') AS organization_type
     FROM greenhouse_core.organizations
     WHERE tax_id = $1 AND active = TRUE
     LIMIT 1`,
    [taxId],
    client
  )

  if (rows.length === 0) return null

  return {
    organizationId: rows[0].organization_id,
    organizationType: rows[0].organization_type
  }
}

const findOrganizationByHubspotCompanyId = async (
  hubspotCompanyId: string,
  client?: QueryableClient
): Promise<{ organizationId: string; organizationType: string } | null> => {
  const rows = await queryRows<OrgByHubspotRow>(
    `SELECT organization_id, COALESCE(organization_type, 'other') AS organization_type
     FROM greenhouse_core.organizations
     WHERE hubspot_company_id = $1 AND active = TRUE
     LIMIT 1`,
    [hubspotCompanyId],
    client
  )

  if (rows.length === 0) return null

  return {
    organizationId: rows[0].organization_id,
    organizationType: rows[0].organization_type
  }
}

const promoteToClientCapableType = (organizationType: string) => {
  switch (organizationType) {
    case 'supplier':
      return 'both'
    case 'other':
      return 'client'
    default:
      return organizationType
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

// ─── Ensure Organization for Client ─────────────────────────────────────

export const ensureOrganizationForClient = async (
  params: {
    organizationId?: string | null
    clientId?: string | null
    hubspotCompanyId?: string | null
    taxId?: string | null
    taxIdType?: string | null
    legalName: string
    organizationName?: string | null
    country?: string | null
  },
  client?: QueryableClient
): Promise<string> => {
  const {
    organizationId,
    clientId,
    hubspotCompanyId,
    taxId,
    taxIdType,
    legalName,
    organizationName,
    country
  } = params

  const normalizedLegalName = legalName.trim()
  const normalizedOrganizationName = organizationName?.trim() || normalizedLegalName
  const normalizedCountry = country?.trim() || 'CL'

  let existing: { organizationId: string; organizationType: string } | null = null

  if (organizationId?.trim()) {
    const rows = await queryRows<OrgByTaxIdRow>(
      `SELECT organization_id, COALESCE(organization_type, 'other') AS organization_type
       FROM greenhouse_core.organizations
       WHERE organization_id = $1 AND active = TRUE
       LIMIT 1`,
      [organizationId.trim()],
      client
    )

    if (rows.length > 0) {
      existing = {
        organizationId: rows[0].organization_id,
        organizationType: rows[0].organization_type
      }
    }
  }

  if (!existing && clientId?.trim()) {
    const rows = await queryRows<SpaceOrgRow>(
      `SELECT organization_id
       FROM greenhouse_core.spaces
       WHERE client_id = $1
         AND organization_id IS NOT NULL
         AND active = TRUE
       LIMIT 1`,
      [clientId.trim()],
      client
    )

    if (rows.length > 0) {
      existing = {
        organizationId: rows[0].organization_id,
        organizationType: 'client'
      }
    }
  }

  if (!existing && taxId?.trim()) {
    existing = await findOrganizationByTaxId(taxId.trim(), client)
  }

  if (!existing && hubspotCompanyId?.trim()) {
    existing = await findOrganizationByHubspotCompanyId(hubspotCompanyId.trim(), client)
  }

  if (existing) {
    const targetType = promoteToClientCapableType(existing.organizationType)

    await queryRows(
      `UPDATE greenhouse_core.organizations
       SET organization_type = $2,
           organization_name = COALESCE(NULLIF(organization_name, ''), $3),
           legal_name = COALESCE(NULLIF(legal_name, ''), $4),
           hubspot_company_id = COALESCE(hubspot_company_id, $5),
           tax_id = COALESCE(tax_id, $6),
           tax_id_type = COALESCE(tax_id_type, $7),
           country = COALESCE(NULLIF(country, ''), $8),
           updated_at = NOW()
       WHERE organization_id = $1`,
      [
        existing.organizationId,
        targetType,
        normalizedOrganizationName,
        normalizedLegalName,
        hubspotCompanyId?.trim() || null,
        taxId?.trim() || null,
        taxIdType?.trim() || null,
        normalizedCountry
      ],
      client
    )

    return existing.organizationId
  }

  const newOrganizationId = generateOrganizationId()
  const publicId = await nextPublicId('EO-ORG')

  await queryRows(
    `INSERT INTO greenhouse_core.organizations (
      organization_id, public_id, organization_name, legal_name,
      tax_id, tax_id_type, country, hubspot_company_id, organization_type,
      status, active, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'client', 'active', TRUE, NOW(), NOW())`,
    [
      newOrganizationId,
      publicId,
      normalizedOrganizationName,
      normalizedLegalName,
      taxId?.trim() || null,
      taxIdType?.trim() || null,
      normalizedCountry,
      hubspotCompanyId?.trim() || null
    ],
    client
  )

  return newOrganizationId
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

export const resolvePrimarySpaceForOrganization = async (
  organizationId: string
): Promise<{ spaceId: string | null; clientId: string | null; clientName: string | null }> => {
  const rows = await runGreenhousePostgresQuery<SpaceClientRow>(
    `SELECT s.space_id, s.client_id, c.client_name
     FROM greenhouse_core.spaces s
     LEFT JOIN greenhouse_core.clients c ON c.client_id = s.client_id
     WHERE s.organization_id = $1
       AND s.active = TRUE
     ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST, s.space_id ASC
     LIMIT 1`,
    [organizationId]
  )

  return {
    spaceId: rows[0]?.space_id ?? null,
    clientId: rows[0]?.client_id ?? null,
    clientName: rows[0]?.client_name ?? null
  }
}
