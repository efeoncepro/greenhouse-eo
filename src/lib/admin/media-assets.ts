import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'

const toOptionalString = (value: unknown) => {
  if (!value) return null
  if (typeof value === 'string') return value

  return null
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

  return toOptionalString((rows[0] as { avatar_url?: unknown } | undefined)?.avatar_url)
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
