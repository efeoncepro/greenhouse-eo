import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * TASK-708 — Commercial Cost Attribution V2 reader.
 *
 * Lee de la VIEW canónica `greenhouse_serving.commercial_cost_attribution_v2`
 * que une 3 dimensiones de costo atribuible a clientes:
 *   - labor: costo laboral por staffing % FTE (TASK-536/PreviousArch).
 *   - expense_direct_client: gastos directos a un cliente (TASK-705 rules).
 *   - expense_direct_member_via_fte: gastos directos a un miembro
 *     prorrateados a sus clientes vía staffing % FTE.
 *
 * Anti-projection-drift: la VIEW deriva de tablas autoritativas — cualquier
 * cambio en regla, staffing, o atribución refleja al instante.
 *
 * Degradación honesta: si labor allocation está vacía para el período, el
 * helper devuelve solo dimensions disponibles + flag `hasLaborData=false`
 * para que la UI muestre warning explícito en lugar de silent zero.
 */

export type CostDimension = 'labor' | 'expense_direct_client' | 'expense_direct_member_via_fte'

interface AttributionRowDb extends Record<string, unknown> {
  period_year: number
  period_month: number
  client_id: string
  member_id: string | null
  amount_clp: string
  cost_dimension: CostDimension
  fte_contribution: string | null
}

export interface ClientCostAttributionV2 {
  clientId: string
  clientName: string
  totalClp: number
  byDimension: {
    labor: number
    expenseDirectClient: number
    expenseDirectMemberViaFte: number
  }
  members: Array<{
    memberId: string
    laborClp: number
    expenseMemberClp: number
    fteContribution: number | null
  }>
}

export interface CommercialCostAttributionV2Period {
  periodYear: number
  periodMonth: number
  clients: ClientCostAttributionV2[]
  totals: {
    grandTotalClp: number
    laborClp: number
    expenseDirectClientClp: number
    expenseDirectMemberViaFteClp: number
  }
  /**
   * Honest degradation flags. UI uses them to decide whether to show
   * warnings about missing dimensions.
   */
  coverage: {
    hasLaborData: boolean
    hasDirectClientData: boolean
    hasDirectMemberViaFteData: boolean
  }
}

const num = (v: string | null | undefined): number => {
  if (v == null) return 0
  const parsed = Number(v)

  return Number.isFinite(parsed) ? parsed : 0
}

const round = (n: number): number => Math.round(n * 100) / 100

export const readCommercialCostAttributionByClientForPeriodV2 = async (
  year: number,
  month: number
): Promise<CommercialCostAttributionV2Period> => {
  const rows = await runGreenhousePostgresQuery<AttributionRowDb>(
    `SELECT period_year, period_month, client_id, member_id,
            amount_clp::text, cost_dimension, fte_contribution::text
     FROM greenhouse_serving.commercial_cost_attribution_v2
     WHERE period_year = $1 AND period_month = $2`,
    [year, month]
  )

  // Hydrate client names in a single batch lookup against the canonical
  // clients table — works for any client_id (HubSpot-prefixed, Nubox,
  // internal, etc.). Falls back to client_id if no row found.
  const distinctClientIds = Array.from(new Set(rows.map(r => r.client_id)))
  const clientNames = new Map<string, string>()

  if (distinctClientIds.length > 0) {
    const clientsRows = await runGreenhousePostgresQuery<{ client_id: string; client_name: string | null }>(
      `SELECT client_id, client_name FROM greenhouse_core.clients WHERE client_id = ANY($1::text[])`,
      [distinctClientIds]
    )

    for (const c of clientsRows) {
      if (c.client_name) clientNames.set(c.client_id, c.client_name)
    }
  }

  const byClient = new Map<string, ClientCostAttributionV2>()
  let laborTotal = 0
  let directClientTotal = 0
  let directMemberTotal = 0

  for (const row of rows) {
    const clientId = row.client_id
    const amount = num(row.amount_clp)
    let entry = byClient.get(clientId)

    if (!entry) {
      entry = {
        clientId,
        clientName: clientNames.get(clientId) ?? clientId,
        totalClp: 0,
        byDimension: {
          labor: 0,
          expenseDirectClient: 0,
          expenseDirectMemberViaFte: 0
        },
        members: []
      }
      byClient.set(clientId, entry)
    }

    entry.totalClp = round(entry.totalClp + amount)

    if (row.cost_dimension === 'labor') {
      entry.byDimension.labor = round(entry.byDimension.labor + amount)
      laborTotal += amount
    } else if (row.cost_dimension === 'expense_direct_client') {
      entry.byDimension.expenseDirectClient = round(entry.byDimension.expenseDirectClient + amount)
      directClientTotal += amount
    } else if (row.cost_dimension === 'expense_direct_member_via_fte') {
      entry.byDimension.expenseDirectMemberViaFte = round(entry.byDimension.expenseDirectMemberViaFte + amount)
      directMemberTotal += amount
    }

    if (row.member_id) {
      let member = entry.members.find(m => m.memberId === row.member_id)

      if (!member) {
        member = {
          memberId: row.member_id,
          laborClp: 0,
          expenseMemberClp: 0,
          fteContribution: row.fte_contribution != null ? num(row.fte_contribution) : null
        }
        entry.members.push(member)
      }

      if (row.cost_dimension === 'labor') {
        member.laborClp = round(member.laborClp + amount)
      } else if (row.cost_dimension === 'expense_direct_member_via_fte') {
        member.expenseMemberClp = round(member.expenseMemberClp + amount)
      }
    }
  }

  return {
    periodYear: year,
    periodMonth: month,
    clients: Array.from(byClient.values()).sort((a, b) => b.totalClp - a.totalClp),
    totals: {
      grandTotalClp: round(laborTotal + directClientTotal + directMemberTotal),
      laborClp: round(laborTotal),
      expenseDirectClientClp: round(directClientTotal),
      expenseDirectMemberViaFteClp: round(directMemberTotal)
    },
    coverage: {
      hasLaborData: rows.some(r => r.cost_dimension === 'labor'),
      hasDirectClientData: rows.some(r => r.cost_dimension === 'expense_direct_client'),
      hasDirectMemberViaFteData: rows.some(r => r.cost_dimension === 'expense_direct_member_via_fte')
    }
  }
}
