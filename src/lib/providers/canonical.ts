import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { ensureAiToolingInfrastructure } from '@/lib/ai-tools/schema'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'

type FinanceSupplierProviderRecord = {
  supplierId: string
  providerId?: string | null
  legalName: string
  tradeName?: string | null
  website?: string | null
  isActive?: boolean | null
}

type FinanceSupplierProviderRow = {
  supplier_id: string | null
  provider_id: string | null
  legal_name: string | null
  trade_name: string | null
  website: string | null
  is_active: boolean | null
}

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

const resolveCanonicalProviderId = ({
  providerId,
  tradeName,
  legalName,
  supplierId
}: FinanceSupplierProviderRecord) => {
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

export const syncProviderFromFinanceSupplier = async (record: FinanceSupplierProviderRecord) => {
  await ensureFinanceInfrastructure()
  await ensureAiToolingInfrastructure()

  const bigQuery = getBigQueryClient()
  const projectId = getBigQueryProjectId()
  const providerId = resolveCanonicalProviderId(record)

  if (!providerId) {
    return null
  }

  const providerName = normalizeString(record.tradeName) || normalizeString(record.legalName)

  if (!providerName) {
    return null
  }

  await bigQuery.query({
    query: `
      MERGE \`${projectId}.greenhouse.providers\` AS target
      USING (
        SELECT
          @providerId AS provider_id,
          @providerName AS provider_name,
          'financial_vendor' AS provider_category,
          'organization' AS provider_kind,
          NULLIF(@websiteUrl, '') AS website_url,
          @isActive AS is_active
      ) AS source
      ON target.provider_id = source.provider_id
      WHEN MATCHED THEN
        UPDATE SET
          provider_name = source.provider_name,
          provider_category = source.provider_category,
          provider_kind = source.provider_kind,
          website_url = COALESCE(source.website_url, target.website_url),
          is_active = source.is_active,
          updated_at = CURRENT_TIMESTAMP()
      WHEN NOT MATCHED THEN
        INSERT (
          provider_id,
          provider_name,
          provider_category,
          provider_kind,
          website_url,
          is_active,
          created_at,
          updated_at
        )
        VALUES (
          source.provider_id,
          source.provider_name,
          source.provider_category,
          source.provider_kind,
          source.website_url,
          source.is_active,
          CURRENT_TIMESTAMP(),
          CURRENT_TIMESTAMP()
        )
    `,
    params: {
      providerId,
      providerName,
      websiteUrl: normalizeString(record.website),
      isActive: record.isActive ?? true
    }
  })

  await bigQuery.query({
    query: `
      UPDATE \`${projectId}.greenhouse.fin_suppliers\`
      SET provider_id = @providerId,
          updated_at = CURRENT_TIMESTAMP()
      WHERE supplier_id = @supplierId
        AND COALESCE(provider_id, '') != @providerId
    `,
    params: {
      supplierId: normalizeString(record.supplierId),
      providerId
    }
  })

  return {
    providerId,
    providerName
  }
}

// Singleton promise — sync runs once per cold start, not per request.
// This prevents BigQuery DML quota exhaustion (10 ops/table/10s).
let syncPromise: Promise<void> | null = null

export const syncProviderRegistryFromFinanceSuppliers = async () => {
  if (syncPromise) {
    return syncPromise
  }

  syncPromise = (async () => {
    await ensureFinanceInfrastructure()
    await ensureAiToolingInfrastructure()

    const bigQuery = getBigQueryClient()
    const projectId = getBigQueryProjectId()

    const [rows] = await bigQuery.query({
      query: `
        SELECT
          supplier_id,
          provider_id,
          legal_name,
          trade_name,
          website,
          is_active
        FROM \`${projectId}.greenhouse.fin_suppliers\`
        WHERE COALESCE(is_active, TRUE) = TRUE
      `
    })

    for (const row of rows as FinanceSupplierProviderRow[]) {
      const supplierId = normalizeString(row.supplier_id)
      const legalName = normalizeString(row.legal_name)

      if (!supplierId || !legalName) {
        continue
      }

      try {
        await syncProviderFromFinanceSupplier({
          supplierId,
          providerId: normalizeNullableString(row.provider_id),
          legalName,
          tradeName: normalizeNullableString(row.trade_name),
          website: normalizeNullableString(row.website),
          isActive: row.is_active ?? true
        })
      } catch (err) {
        console.warn(`[providers/canonical] Failed to sync supplier ${supplierId} (${legalName}):`, err)
      }
    }
  })().catch(error => {
    syncPromise = null
    throw error
  })

  return syncPromise
}
