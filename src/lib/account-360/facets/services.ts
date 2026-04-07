import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type {
  AccountServicesFacet,
  AccountServiceEntry,
  AccountScope,
  AccountFacetContext
} from '@/types/account-complete-360'

// ── Row shapes ──

type ServiceRow = {
  service_id: string
  public_id: string | null
  service_name: string
  linea_de_servicio: string | null
  servicio_especifico: string | null
  modalidad: string | null
  start_date: string | null
  target_end_date: string | null
  pipeline_stage: string
  billing_frequency: string | null
  monthly_cost: string | number | null
  currency: string | null
}

// ── Helpers ──

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v

  if (typeof v === 'string') { const n = Number(v);

 

return Number.isFinite(n) ? n : 0 }
  
return 0
}

/** Map pipeline_stage to a user-facing status */
const mapStatus = (stage: string): string => {
  switch (stage) {
    case 'active':
    case 'in_progress':
      return 'active'
    case 'onboarding':
    case 'setup':
      return 'onboarding'
    case 'paused':
    case 'on_hold':
      return 'paused'
    case 'completed':
    case 'closed':
      return 'completed'
    default:
      return stage
  }
}

// ── Facet ──

export const fetchServicesFacet = async (
  scope: AccountScope,
  ctx: AccountFacetContext
): Promise<AccountServicesFacet | null> => {
  if (scope.spaceIds.length === 0) return null

  const limit = ctx.limit ?? 20

  const rows = await runGreenhousePostgresQuery<ServiceRow>(
    `SELECT
      s.service_id,
      s.public_id,
      s.service_name,
      s.linea_de_servicio,
      s.servicio_especifico,
      s.modalidad,
      s.start_date::text,
      s.target_end_date::text,
      s.pipeline_stage,
      s.billing_frequency,
      s.monthly_cost,
      s.currency
    FROM greenhouse_core.services s
    WHERE s.space_id = ANY($1)
      AND s.pipeline_stage NOT IN ('lost', 'cancelled')
    ORDER BY s.start_date DESC
    LIMIT $2`,
    [scope.spaceIds, limit]
  )

  // ── Map to service entries ──
  const activeServices: AccountServiceEntry[] = rows.map(row => ({
    serviceId: row.service_id,
    publicId: row.public_id,
    name: row.service_name,
    businessLine: row.linea_de_servicio,
    servicoEspecifico: row.servicio_especifico,
    modalidad: row.modalidad,
    startDate: row.start_date,
    targetEndDate: row.target_end_date,
    status: mapStatus(row.pipeline_stage),
    billingFrequency: row.billing_frequency,
    totalCost: row.monthly_cost != null ? toNum(row.monthly_cost) : null,
    currency: row.currency
  }))

  // ── Aggregations ──
  const byBusinessLine: Record<string, number> = {}
  let totalRevenue = 0

  for (const row of rows) {
    const bl = row.linea_de_servicio ?? 'unclassified'

    byBusinessLine[bl] = (byBusinessLine[bl] ?? 0) + 1
    totalRevenue += row.monthly_cost != null ? toNum(row.monthly_cost) : 0
  }

  return {
    activeServices,
    byBusinessLine,
    totalActiveCount: rows.length,
    totalRevenue
  }
}
