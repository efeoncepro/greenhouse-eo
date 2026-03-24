import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { ensureCampaignSchema } from './campaign-store'

// ── Budget & Financial Attribution ──

export interface CampaignFinancials {
  campaignId: string
  budgetClp: number | null
  actualCostClp: number
  revenueClp: number
  laborCostClp: number
  directCostsClp: number
  marginClp: number
  marginPercent: number | null
  budgetUsedPercent: number | null
}

export const getCampaignFinancials = async (campaignId: string): Promise<CampaignFinancials> => {
  await ensureCampaignSchema()

  // Get budget from campaign
  const budgetRows = await runGreenhousePostgresQuery<{ budget_clp: string | number | null } & Record<string, unknown>>(
    `SELECT budget_clp FROM greenhouse_core.campaigns WHERE campaign_id = $1`,
    [campaignId]
  )

  const budgetClp = budgetRows[0]?.budget_clp ? Number(budgetRows[0].budget_clp) : null

  // Get linked project source IDs
  const links = await runGreenhousePostgresQuery<{ project_source_id: string; space_id: string } & Record<string, unknown>>(
    `SELECT project_source_id, space_id FROM greenhouse_core.campaign_project_links WHERE campaign_id = $1`,
    [campaignId]
  )

  if (links.length === 0) {
    return {
      campaignId, budgetClp, actualCostClp: 0, revenueClp: 0,
      laborCostClp: 0, directCostsClp: 0, marginClp: 0,
      marginPercent: null, budgetUsedPercent: null
    }
  }

  const spaceId = links[0].space_id

  // Get client_id from space for finance queries
  const spaceRows = await runGreenhousePostgresQuery<{ client_id: string } & Record<string, unknown>>(
    `SELECT client_id FROM greenhouse_core.spaces WHERE space_id = $1`,
    [spaceId]
  )

  const clientId = spaceRows[0]?.client_id

  if (!clientId) {
    return {
      campaignId, budgetClp, actualCostClp: 0, revenueClp: 0,
      laborCostClp: 0, directCostsClp: 0, marginClp: 0,
      marginPercent: null, budgetUsedPercent: null
    }
  }

  // Revenue: income attributed to this client during campaign period
  const revenueRows = await runGreenhousePostgresQuery<{ total: string } & Record<string, unknown>>(
    `SELECT COALESCE(SUM(total_amount_clp), 0) AS total
     FROM greenhouse_finance.income
     WHERE COALESCE(client_id, client_profile_id) = $1`,
    [clientId]
  )

  const revenueClp = Number(revenueRows[0]?.total ?? 0)

  // Direct costs: expenses allocated to this client
  const costRows = await runGreenhousePostgresQuery<{ total: string } & Record<string, unknown>>(
    `SELECT COALESCE(SUM(allocated_amount_clp), 0) AS total
     FROM greenhouse_finance.cost_allocations
     WHERE client_id = $1`,
    [clientId]
  )

  const directCostsClp = Number(costRows[0]?.total ?? 0)

  // Labor costs from client economics (latest snapshot)
  const laborRows = await runGreenhousePostgresQuery<{ direct_costs_clp: string } & Record<string, unknown>>(
    `SELECT COALESCE(direct_costs_clp, 0) AS direct_costs_clp
     FROM greenhouse_finance.client_economics
     WHERE client_id = $1
     ORDER BY period_year DESC, period_month DESC
     LIMIT 1`,
    [clientId]
  )

  const laborCostClp = Number(laborRows[0]?.direct_costs_clp ?? 0)

  const actualCostClp = Math.round((directCostsClp + laborCostClp) * 100) / 100
  const marginClp = Math.round((revenueClp - actualCostClp) * 100) / 100
  const marginPercent = revenueClp > 0 ? Math.round((marginClp / revenueClp) * 10000) / 100 : null
  const budgetUsedPercent = budgetClp && budgetClp > 0 ? Math.round((actualCostClp / budgetClp) * 10000) / 100 : null

  return {
    campaignId, budgetClp, actualCostClp, revenueClp,
    laborCostClp, directCostsClp, marginClp,
    marginPercent, budgetUsedPercent
  }
}

// ── Derived Roster (team members from linked projects) ──

export interface CampaignTeamMember {
  memberId: string
  memberName: string
  role: string | null
  email: string | null
  projectCount: number
}

export const getCampaignRoster = async (campaignId: string): Promise<CampaignTeamMember[]> => {
  await ensureCampaignSchema()

  const links = await runGreenhousePostgresQuery<{ project_source_id: string } & Record<string, unknown>>(
    `SELECT project_source_id FROM greenhouse_core.campaign_project_links WHERE campaign_id = $1`,
    [campaignId]
  )

  const projectSourceIds = links.map(l => l.project_source_id).filter(Boolean)

  if (projectSourceIds.length === 0) return []

  // Query BigQuery for unique assignees across linked project tasks
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const [rows] = await bigQuery.query({
    query: `
      SELECT
        t.assignee_member_id AS member_id,
        ANY_VALUE(t.assignee_name) AS member_name,
        ANY_VALUE(t.assignee_role) AS role,
        ANY_VALUE(t.assignee_email) AS email,
        COUNT(DISTINCT t.project_source_id) AS project_count
      FROM \`${projectId}.greenhouse_conformed.delivery_tasks\` t
      WHERE t.project_source_id IN UNNEST(@projectSourceIds)
        AND t.assignee_member_id IS NOT NULL
      GROUP BY t.assignee_member_id
      ORDER BY project_count DESC, member_name
    `,
    params: { projectSourceIds }
  })

  return (rows as Array<Record<string, unknown>>).map(r => ({
    memberId: String(r.member_id ?? ''),
    memberName: String(r.member_name ?? 'Sin nombre'),
    role: r.role ? String(r.role) : null,
    email: r.email ? String(r.email) : null,
    projectCount: Number(r.project_count ?? 0)
  }))
}

// ── Campaign 360 Summary (full detail for UI) ──

export interface Campaign360 {
  campaignId: string
  financials: CampaignFinancials
  team: CampaignTeamMember[]
  teamCount: number
}

export const getCampaign360 = async (campaignId: string): Promise<Campaign360> => {
  const [financials, team] = await Promise.all([
    getCampaignFinancials(campaignId),
    getCampaignRoster(campaignId)
  ])

  return {
    campaignId,
    financials,
    team,
    teamCount: team.length
  }
}
