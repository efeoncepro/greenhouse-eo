import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'

export interface InternalDashboardOverview {
  totals: {
    clientCount: number
    activeClientUsers: number
    invitedClientUsers: number
    internalAdmins: number
  }
  clients: Array<{
    clientId: string
    clientName: string
    primaryContactEmail: string
    authMode: string
    projectCount: number
    userCount: number
  }>
}

export const getInternalDashboardOverview = async (): Promise<InternalDashboardOverview> => {
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const [clientRows] = await bigQuery.query({
    query: `
      SELECT
        c.client_id,
        c.client_name,
        c.primary_contact_email,
        c.auth_mode,
        ARRAY_LENGTH(COALESCE(c.notion_project_ids, [])) AS project_count,
        COUNT(DISTINCT cu.user_id) AS user_count
      FROM \`${projectId}.greenhouse.clients\` AS c
      LEFT JOIN \`${projectId}.greenhouse.client_users\` AS cu
        ON cu.client_id = c.client_id
      WHERE c.active = TRUE
      GROUP BY c.client_id, c.client_name, c.primary_contact_email, c.auth_mode, c.notion_project_ids
      ORDER BY c.client_name
    `
  })

  const [totalRows] = await bigQuery.query({
    query: `
      SELECT
        COUNTIF(active = TRUE) AS client_count,
        COUNTIF(tenant_type = 'client' AND active = TRUE) AS active_client_users,
        COUNTIF(tenant_type = 'client' AND status = 'invited') AS invited_client_users,
        COUNTIF(tenant_type = 'efeonce_internal' AND active = TRUE) AS internal_admins
      FROM \`${projectId}.greenhouse.client_users\`
    `
  })

  const totalsRow = (totalRows[0] as
    | {
        client_count: number | string
        active_client_users: number | string
        invited_client_users: number | string
        internal_admins: number | string
      }
    | undefined) ?? {
    client_count: 0,
    active_client_users: 0,
    invited_client_users: 0,
    internal_admins: 0
  }

  return {
    totals: {
      clientCount: Number(totalsRow.client_count || 0),
      activeClientUsers: Number(totalsRow.active_client_users || 0),
      invitedClientUsers: Number(totalsRow.invited_client_users || 0),
      internalAdmins: Number(totalsRow.internal_admins || 0)
    },
    clients: (clientRows as Array<Record<string, unknown>>).map(row => ({
      clientId: String(row.client_id || ''),
      clientName: String(row.client_name || ''),
      primaryContactEmail: String(row.primary_contact_email || ''),
      authMode: String(row.auth_mode || ''),
      projectCount: Number(row.project_count || 0),
      userCount: Number(row.user_count || 0)
    }))
  }
}
