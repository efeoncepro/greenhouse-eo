import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const normalizeString = (value: unknown) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

const normalizeNullableString = (value: unknown) => {
  const normalized = normalizeString(value)

  return normalized ? normalized : null
}

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')

type FinanceSupplierProviderInput = {
  supplierId: string
  providerId?: string | null
  legalName: string
  tradeName?: string | null
  website?: string | null
  isActive?: boolean | null
}

type QueryableClient = Pick<PoolClient, 'query'>

const queryRows = async <T extends Record<string, unknown>>(text: string, values: unknown[], client?: QueryableClient) => {
  if (client) {
    const result = await client.query<T>(text, values)

    return result.rows
  }

  return runGreenhousePostgresQuery<T>(text, values)
}

export const resolveCanonicalProviderId = ({
  providerId,
  tradeName,
  legalName,
  supplierId
}: FinanceSupplierProviderInput) => {
  const explicitProviderId = normalizeNullableString(providerId)

  if (explicitProviderId) {
    return explicitProviderId
  }

  const candidateName = normalizeNullableString(tradeName) || normalizeNullableString(legalName)
  const derivedFromName = candidateName ? slugify(candidateName) : ''

  if (derivedFromName) {
    return derivedFromName
  }

  const normalizedSupplierId = slugify(normalizeString(supplierId))

  return normalizedSupplierId ? `supplier-${normalizedSupplierId}` : ''
}

export const upsertProviderFromFinanceSupplierInPostgres = async (
  input: FinanceSupplierProviderInput,
  client?: QueryableClient
) => {
  const providerId = resolveCanonicalProviderId(input)

  if (!providerId) {
    return null
  }

  const providerName = normalizeString(input.tradeName) || normalizeString(input.legalName)

  if (!providerName) {
    return null
  }

  const providerPublicId = `provider_${providerId}`

  await queryRows(
    `
      INSERT INTO greenhouse_core.providers (
        provider_id,
        public_id,
        provider_name,
        legal_name,
        provider_type,
        website_url,
        status,
        active,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        'financial_vendor',
        $5,
        CASE WHEN $6 THEN 'active' ELSE 'inactive' END,
        $6,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (provider_id) DO UPDATE
      SET
        public_id = EXCLUDED.public_id,
        provider_name = EXCLUDED.provider_name,
        legal_name = COALESCE(EXCLUDED.legal_name, greenhouse_core.providers.legal_name),
        provider_type = EXCLUDED.provider_type,
        website_url = COALESCE(EXCLUDED.website_url, greenhouse_core.providers.website_url),
        status = EXCLUDED.status,
        active = EXCLUDED.active,
        updated_at = CURRENT_TIMESTAMP
    `,
    [
      providerId,
      providerPublicId,
      providerName,
      normalizeNullableString(input.legalName),
      normalizeNullableString(input.website),
      input.isActive ?? true
    ],
    client
  )

  return {
    providerId,
    providerName
  }
}
