import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { isGreenhousePostgresConfigured, runGreenhousePostgresQuery } from '@/lib/postgres/client'

const toOptionalString = (value: unknown) => {
  if (!value) return null
  if (typeof value === 'string') return value

  return null
}

const toGsAssetPath = (value: unknown) => {
  const normalized = toOptionalString(value)?.trim()

  return normalized?.startsWith('gs://') ? normalized : null
}

export const ensureTenantLogoColumn = async () => {
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  await bigQuery.query({
    query: `
      ALTER TABLE \`${projectId}.greenhouse.clients\`
      ADD COLUMN IF NOT EXISTS logo_url STRING OPTIONS(description = "Optional tenant logo asset path")
    `
  })
}

export const getTenantLogoAssetPath = async (clientId: string) => {
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const [rows] = await bigQuery.query({
    query: `
      SELECT
        JSON_VALUE(TO_JSON_STRING(c), '$.logo_url') AS logo_url
      FROM \`${projectId}.greenhouse.clients\` AS c
      WHERE c.client_id = @clientId
      LIMIT 1
    `,
    params: { clientId }
  })

  return toOptionalString((rows[0] as { logo_url?: unknown } | undefined)?.logo_url)
}

export const setTenantLogoAssetPath = async ({ clientId, assetPath }: { clientId: string; assetPath: string }) => {
  await ensureTenantLogoColumn()

  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  await bigQuery.query({
    query: `
      UPDATE \`${projectId}.greenhouse.clients\`
      SET
        logo_url = @assetPath,
        updated_at = CURRENT_TIMESTAMP()
      WHERE client_id = @clientId
    `,
    params: {
      clientId,
      assetPath
    }
  })
}

export const getUserAvatarAssetPath = async (userId: string) => {
  if (isGreenhousePostgresConfigured()) {
    try {
      const rows = await runGreenhousePostgresQuery<{ avatar_url: string | null }>(
        `
          SELECT
            COALESCE(
              NULLIF(cu.avatar_url, ''),
              NULLIF(p360.resolved_avatar_url, '')
            ) AS avatar_url
          FROM greenhouse_core.client_users cu
          LEFT JOIN greenhouse_serving.person_360 p360
            ON p360.user_id = cu.user_id
            OR (
              cu.identity_profile_id IS NOT NULL
              AND p360.identity_profile_id = cu.identity_profile_id
            )
          WHERE cu.user_id = $1
          LIMIT 1
        `,
        [userId]
      )

      const postgresAssetPath = toGsAssetPath(rows[0]?.avatar_url)

      if (postgresAssetPath) return postgresAssetPath
    } catch (error) {
      console.warn(
        '[media-assets] Unable to resolve user avatar from Postgres; falling back to legacy BigQuery mirror:',
        error instanceof Error ? error.message : error
      )
    }
  }

  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const [rows] = await bigQuery.query({
    query: `
      SELECT
        avatar_url
      FROM \`${projectId}.greenhouse.client_users\`
      WHERE user_id = @userId
      LIMIT 1
    `,
    params: { userId }
  })

  return toGsAssetPath((rows[0] as { avatar_url?: unknown } | undefined)?.avatar_url)
}

export const setUserAvatarAssetPath = async ({ userId, assetPath }: { userId: string; assetPath: string }) => {
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  await bigQuery.query({
    query: `
      UPDATE \`${projectId}.greenhouse.client_users\`
      SET
        avatar_url = @assetPath,
        updated_at = CURRENT_TIMESTAMP()
      WHERE user_id = @userId
    `,
    params: {
      userId,
      assetPath
    }
  })
}
