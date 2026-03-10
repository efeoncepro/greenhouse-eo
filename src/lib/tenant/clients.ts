import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'

export const updateTenantLastLogin = async (clientId: string) => {
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  await bigQuery.query({
    query: `
      UPDATE \`${projectId}.greenhouse.clients\`
      SET
        last_login_at = CURRENT_TIMESTAMP(),
        updated_at = CURRENT_TIMESTAMP()
      WHERE client_id = @clientId
    `,
    params: { clientId }
  })
}
