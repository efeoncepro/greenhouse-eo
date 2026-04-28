import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * TASK-709 — Labor allocation consolidated reader.
 *
 * Lee de la VIEW canónica `client_labor_cost_allocation_consolidated`
 * que agrupa la cla cruda a 1 row por (period, member, client).
 * Reusable para cualquier consumer que necesite la consolidación.
 *
 * También expone el reliability signal `getLaborAllocationSaturationDrift`
 * que detecta over-saturation (miembro con SUM(fte) > 1.0 a clientes en
 * un mismo período = imposible en realidad).
 */

export interface ConsolidatedLaborAllocationRow {
  periodYear: number
  periodMonth: number
  memberId: string
  memberName: string | null
  clientId: string
  clientName: string | null
  fteContribution: number | null
  allocatedLaborClp: number | null
  allocatedNetClp: number | null
  sourcePayrollEntryCount: number
}

interface ConsolidatedLaborAllocationRowDb extends Record<string, unknown> {
  period_year: number
  period_month: number
  member_id: string
  member_name: string | null
  client_id: string
  client_name: string | null
  fte_contribution: string | null
  allocated_labor_clp: string | null
  allocated_net_clp: string | null
  source_payroll_entry_count: string
}

const num = (v: string | null | undefined): number | null => {
  if (v == null) return null
  const parsed = Number(v)

  return Number.isFinite(parsed) ? parsed : null
}

export const readConsolidatedLaborAllocationForPeriod = async (
  year: number,
  month: number
): Promise<ConsolidatedLaborAllocationRow[]> => {
  const rows = await runGreenhousePostgresQuery<ConsolidatedLaborAllocationRowDb>(
    `SELECT period_year, period_month, member_id, member_name, client_id, client_name,
            fte_contribution::text, allocated_labor_clp::text, allocated_net_clp::text,
            source_payroll_entry_count::text
     FROM greenhouse_serving.client_labor_cost_allocation_consolidated
     WHERE period_year = $1 AND period_month = $2
     ORDER BY allocated_labor_clp DESC NULLS LAST`,
    [year, month]
  )

  return rows.map(row => ({
    periodYear: row.period_year,
    periodMonth: row.period_month,
    memberId: row.member_id,
    memberName: row.member_name,
    clientId: row.client_id,
    clientName: row.client_name,
    fteContribution: num(row.fte_contribution),
    allocatedLaborClp: num(row.allocated_labor_clp),
    allocatedNetClp: num(row.allocated_net_clp),
    sourcePayrollEntryCount: Number(row.source_payroll_entry_count) || 0
  }))
}

export interface SaturationDriftRow {
  periodYear: number
  periodMonth: number
  memberId: string
  memberName: string | null
  sumFte: number
  clientCount: number
  clientIds: string[]
  clientNames: (string | null)[]
}

interface SaturationDriftRowDb extends Record<string, unknown> {
  period_year: number
  period_month: number
  member_id: string
  member_name: string | null
  sum_fte: string
  client_count: string
  client_ids: string[]
  client_names: (string | null)[]
}

/**
 * Reliability signal: detecta member-period combinations donde el miembro
 * tiene SUM(fte_contribution) > 1.0 distribuido a clientes (= imposible).
 * Si retorna rows, indica bug en `client_team_assignments` upstream
 * (overlapping assignments para mismo miembro/período sin date partitioning).
 *
 * El Reliability dashboard alerta cuando esta query devuelve > 0 rows.
 */
export const getLaborAllocationSaturationDrift = async (): Promise<SaturationDriftRow[]> => {
  const rows = await runGreenhousePostgresQuery<SaturationDriftRowDb>(
    `SELECT period_year, period_month, member_id, member_name,
            sum_fte::text, client_count::text, client_ids, client_names
     FROM greenhouse_serving.labor_allocation_saturation_drift
     ORDER BY sum_fte DESC, period_year DESC, period_month DESC`
  )

  return rows.map(row => ({
    periodYear: row.period_year,
    periodMonth: row.period_month,
    memberId: row.member_id,
    memberName: row.member_name,
    sumFte: Number(row.sum_fte),
    clientCount: Number(row.client_count) || 0,
    clientIds: row.client_ids,
    clientNames: row.client_names
  }))
}
