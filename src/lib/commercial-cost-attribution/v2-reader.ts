import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * TASK-708 — Commercial Cost Attribution V2 reader.
 *
 * Lee de la VIEW canónica `greenhouse_serving.commercial_cost_attribution_v2`
 * que une dimensiones de costo atribuible a clientes:
 *   - labor: costo laboral por staffing % FTE (TASK-536/PreviousArch).
 *   - expense_direct_client: gastos directos a un cliente (TASK-705 rules).
 *   - expense_direct_service: gastos directos con allocation aprobada a service_id.
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

export type CostDimension = 'labor' | 'expense_direct_client' | 'expense_direct_service' | 'expense_direct_member_via_fte'

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
    expenseDirectService: number
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
    expenseDirectServiceClp: number
    expenseDirectMemberViaFteClp: number
  }
  /**
   * Honest degradation flags. UI uses them to decide whether to show
   * warnings about missing dimensions.
   */
  coverage: {
    hasLaborData: boolean
    hasDirectClientData: boolean
    hasDirectServiceData: boolean
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
  let directServiceTotal = 0
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
          expenseDirectService: 0,
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
    } else if (row.cost_dimension === 'expense_direct_service') {
      entry.byDimension.expenseDirectService = round(entry.byDimension.expenseDirectService + amount)
      directServiceTotal += amount
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
      grandTotalClp: round(laborTotal + directClientTotal + directServiceTotal + directMemberTotal),
      laborClp: round(laborTotal),
      expenseDirectClientClp: round(directClientTotal),
      expenseDirectServiceClp: round(directServiceTotal),
      expenseDirectMemberViaFteClp: round(directMemberTotal)
    },
    coverage: {
      hasLaborData: rows.some(r => r.cost_dimension === 'labor'),
      hasDirectClientData: rows.some(r => r.cost_dimension === 'expense_direct_client'),
      hasDirectServiceData: rows.some(r => r.cost_dimension === 'expense_direct_service'),
      hasDirectMemberViaFteData: rows.some(r => r.cost_dimension === 'expense_direct_member_via_fte')
    }
  }
}

/**
 * TASK-835 — Sibling reader: agrega costo por `service_id` para una ventana
 * de períodos (year-month range). Comparte VIEW canónica con el reader
 * byClient — single source of truth, cero SQL duplicado.
 *
 * Solo agrega filas cuyo `service_id` está en el set provisto. Filtra opcional
 * por `attributionIntents` (default: 4 lanes engagement non-regular). Las
 * filas sin `service_id` quedan excluidas silenciosamente — son agregaciones
 * client-level legacy que no aplican al modelo Sample Sprint.
 *
 * Devuelve mapa `Map<serviceId, totalClp>` agregado para todos los meses
 * del rango. La projection llama con la ventana corriente (mes actual y
 * mes anterior por defecto, configurable).
 */

export interface ReadCommercialCostAttributionByServiceForPeriodInput {
  serviceIds: string[]
  /** Inclusive start { year, month }. */
  fromPeriod: { year: number; month: number }
  /** Inclusive end { year, month }. */
  toPeriod: { year: number; month: number }
  /** Default: ['pilot','trial','poc','discovery']. Cuando vacío, no aplica filtro. */
  attributionIntents?: string[] | null
}

const DEFAULT_ATTRIBUTION_INTENTS = ['pilot', 'trial', 'poc', 'discovery']

interface ServiceAttributionRowDb extends Record<string, unknown> {
  service_id: string
  amount_clp: string
}

export const readCommercialCostAttributionByServiceForPeriodV2 = async (
  input: ReadCommercialCostAttributionByServiceForPeriodInput
): Promise<Map<string, number>> => {
  const result = new Map<string, number>()

  if (!Array.isArray(input.serviceIds) || input.serviceIds.length === 0) return result

  const dedupedIds = Array.from(new Set(input.serviceIds.filter(id => typeof id === 'string' && id.trim().length > 0)))

  if (dedupedIds.length === 0) return result

  const fromYear = Math.trunc(input.fromPeriod.year)
  const fromMonth = Math.trunc(input.fromPeriod.month)
  const toYear = Math.trunc(input.toPeriod.year)
  const toMonth = Math.trunc(input.toPeriod.month)

  if (!Number.isFinite(fromYear) || !Number.isFinite(fromMonth) || !Number.isFinite(toYear) || !Number.isFinite(toMonth)) {
    return result
  }

  const intents = input.attributionIntents === undefined ? DEFAULT_ATTRIBUTION_INTENTS : input.attributionIntents

  const intentClause = Array.isArray(intents) && intents.length > 0
    ? 'AND attribution_intent = ANY($4::text[])'
    : ''

  const params: unknown[] = [
    dedupedIds,
    fromYear * 100 + fromMonth,
    toYear * 100 + toMonth
  ]

  if (intentClause) params.push(intents)

  const rows = await runGreenhousePostgresQuery<ServiceAttributionRowDb>(
    `SELECT service_id, SUM(amount_clp)::text AS amount_clp
     FROM greenhouse_serving.commercial_cost_attribution_v2
     WHERE service_id = ANY($1::text[])
       AND (period_year * 100 + period_month) >= $2
       AND (period_year * 100 + period_month) <= $3
       ${intentClause}
     GROUP BY service_id`,
    params
  )

  for (const row of rows) {
    const amount = num(row.amount_clp)

    if (amount > 0) result.set(row.service_id, round(amount))
  }

  return result
}
