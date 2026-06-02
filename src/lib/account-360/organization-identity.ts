import 'server-only'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { generateOrganizationId, nextPublicId } from '@/lib/account-360/id-generation'
import {
  deriveOrganizationType,
  type OrganizationOrigin,
  type OrganizationType
} from '@/lib/account-360/organization-type'

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

/**
 * Resolves the issuer identity (legal name, tax id, address, country) of a SPECIFIC
 * organization by id — the Operating Entity that pays a contractor (TASK-960). Unlike
 * `getOperatingEntityIdentity` this does NOT assume the singleton flag, so the
 * remittance advice inherits multi-entity support for free (the issuer is the
 * engagement's `legal_entity_organization_id`). Not cached (low-volume, per-document).
 */
export const getOrganizationIssuerIdentityById = async (
  organizationId: string,
  client?: QueryableClient
): Promise<OperatingEntityIdentity | null> => {
  const rows = await queryRows<OperatingEntityRow & { legal_name: string | null }>(
    `SELECT organization_id,
            COALESCE(NULLIF(legal_name, ''), organization_name) AS legal_name,
            tax_id, tax_id_type, legal_address, country
     FROM greenhouse_core.organizations
     WHERE organization_id = $1 AND active = TRUE
     LIMIT 1`,
    [organizationId],
    client
  )

  if (rows.length === 0) return null

  const row = rows[0]

  return {
    organizationId: row.organization_id,
    legalName: row.legal_name ?? '',
    taxId: row.tax_id,
    taxIdType: row.tax_id_type,
    legalAddress: row.legal_address,
    country: row.country
  }
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

// ─── Canonical Organization Writer (SSOT) ───────────────────────────────

/**
 * TASK-991 Slice 1 — ÚNICO writer canónico de la fila `greenhouse_core.organizations`
 * para las puertas account-360 (client + supplier). Las puertas públicas
 * (`ensureOrganizationForClient`, `ensureOrganizationForSupplier`) resuelven la
 * org existente y delegan la escritura aquí. Garantiza:
 *  - `organization_type` derivado vía `deriveOrganizationType` (NUNCA hand-set
 *    inconsistente con el lifecycle).
 *  - `public_id` poblado en cada INSERT (la puerta party legacy lo dejaba NULL).
 *  - `origin` capturado.
 *  - UPDATE con COALESCE (nunca sobreescribe identidad existente no-vacía).
 *
 * NO impone default de `country` — el caller decide (Slice 2 deriva del origin;
 * hasta entonces los callers preservan su default histórico).
 */
export const upsertCanonicalOrganization = async (
  input: {
    /** Org existente ya resuelta por el caller (UPDATE path). Null ⇒ INSERT. */
    existingOrganizationId?: string | null
    /** Tipo actual de la org existente, para el merge de roles. */
    currentType?: string | null
    organizationName: string
    legalName?: string | null
    taxId?: string | null
    taxIdType?: string | null
    country?: string | null
    hubspotCompanyId?: string | null
    lifecycleStage?: string | null
    hasClientRole?: boolean
    hasSupplierRole?: boolean
    origin?: OrganizationOrigin
  },
  client?: QueryableClient
): Promise<{ organizationId: string; organizationType: OrganizationType }> => {
  const organizationType = deriveOrganizationType({
    lifecycleStage: input.lifecycleStage,
    hasClientRole: input.hasClientRole,
    hasSupplierRole: input.hasSupplierRole,
    currentType: input.currentType
  })

  const origin: OrganizationOrigin = input.origin ?? 'manual'

  if (input.existingOrganizationId?.trim()) {
    await queryRows(
      `UPDATE greenhouse_core.organizations
       SET organization_type = $2,
           organization_name = COALESCE(NULLIF(organization_name, ''), $3),
           legal_name = COALESCE(NULLIF(legal_name, ''), $4),
           hubspot_company_id = COALESCE(hubspot_company_id, $5),
           tax_id = COALESCE(tax_id, $6),
           tax_id_type = COALESCE(tax_id_type, $7),
           country = COALESCE(NULLIF(country, ''), $8),
           origin = COALESCE(origin, $9),
           updated_at = NOW()
       WHERE organization_id = $1`,
      [
        input.existingOrganizationId.trim(),
        organizationType,
        input.organizationName,
        input.legalName ?? null,
        input.hubspotCompanyId?.trim() || null,
        input.taxId?.trim() || null,
        input.taxIdType?.trim() || null,
        input.country?.trim() || null,
        origin
      ],
      client
    )

    return { organizationId: input.existingOrganizationId.trim(), organizationType }
  }

  const newOrganizationId = generateOrganizationId()
  const publicId = await nextPublicId('EO-ORG')

  await queryRows(
    `INSERT INTO greenhouse_core.organizations (
      organization_id, public_id, organization_name, legal_name,
      tax_id, tax_id_type, country, hubspot_company_id, organization_type, origin,
      status, active, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', TRUE, NOW(), NOW())`,
    [
      newOrganizationId,
      publicId,
      input.organizationName,
      input.legalName ?? null,
      input.taxId?.trim() || null,
      input.taxIdType?.trim() || null,
      input.country?.trim() || null,
      input.hubspotCompanyId?.trim() || null,
      organizationType,
      origin
    ],
    client
  )

  return { organizationId: newOrganizationId, organizationType }
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

  // Resolve existing org by tax_id; the canonical writer derives the type
  // (supplier, or `both` when the org already has a client role) and fills
  // public_id/origin on INSERT. TASK-991 Slice 1.
  const existing = await findOrganizationByTaxId(taxId)

  const { organizationId } = await upsertCanonicalOrganization({
    existingOrganizationId: existing?.organizationId ?? null,
    currentType: existing?.organizationType ?? null,
    organizationName: tradeName || legalName,
    legalName,
    taxId,
    taxIdType: taxIdType ?? null,
    country: country || 'CL',
    hasSupplierRole: true,
    origin: 'manual'
  })

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

  // Canonical write (SSOT): derives organization_type (client, or `both` when
  // the org already has a supplier role), fills public_id/origin on INSERT.
  // TASK-991 Slice 1.
  const { organizationId: resolvedOrganizationId } = await upsertCanonicalOrganization(
    {
      existingOrganizationId: existing?.organizationId ?? null,
      currentType: existing?.organizationType ?? null,
      organizationName: normalizedOrganizationName,
      legalName: normalizedLegalName,
      taxId: taxId?.trim() || null,
      taxIdType: taxIdType?.trim() || null,
      country: normalizedCountry,
      hubspotCompanyId: hubspotCompanyId?.trim() || null,
      hasClientRole: true,
      origin: 'manual'
    },
    client
  )

  return resolvedOrganizationId
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
