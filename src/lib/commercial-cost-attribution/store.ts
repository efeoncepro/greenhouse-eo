import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { toTimestampString } from '@/lib/finance/shared'

export type CommercialCostAttributionRow = {
  member_id: string
  client_id: string
  client_name: string
  period_year: number | string
  period_month: number | string
  base_labor_cost_target: number | string
  internal_operational_cost_target: number | string
  direct_overhead_target: number | string
  shared_overhead_target: number | string
  fte_contribution: number | string
  allocation_ratio: number | string
  commercial_labor_cost_target: number | string
  commercial_direct_overhead_target: number | string
  commercial_shared_overhead_target: number | string
  commercial_loaded_cost_target: number | string
  source_of_truth: string
  rule_version: string
  materialization_reason: string | null
  materialized_at: string | Date | null
}

export interface CommercialCostAttributionStoredAllocation {
  memberId: string
  clientId: string
  clientName: string
  periodYear: number
  periodMonth: number
  baseLaborCostTarget: number
  internalOperationalCostTarget: number
  directOverheadTarget: number
  sharedOverheadTarget: number
  fteContribution: number
  allocationRatio: number
  commercialLaborCostTarget: number
  commercialDirectOverheadTarget: number
  commercialSharedOverheadTarget: number
  commercialLoadedCostTarget: number
  sourceOfTruth: 'member_capacity_economics' | 'client_labor_cost_allocation'
  ruleVersion: string
  materializationReason: string | null
  materializedAt: string | null
}

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

let ensureSchemaPromise: Promise<void> | null = null

export const ensureCommercialCostAttributionSchema = async () => {
  if (ensureSchemaPromise) return ensureSchemaPromise

  ensureSchemaPromise = runGreenhousePostgresQuery(`
    CREATE TABLE IF NOT EXISTS greenhouse_serving.commercial_cost_attribution (
      member_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      client_name TEXT NOT NULL,
      period_year INT NOT NULL,
      period_month INT NOT NULL,
      base_labor_cost_target NUMERIC(14,2) NOT NULL DEFAULT 0,
      internal_operational_cost_target NUMERIC(14,2) NOT NULL DEFAULT 0,
      direct_overhead_target NUMERIC(14,2) NOT NULL DEFAULT 0,
      shared_overhead_target NUMERIC(14,2) NOT NULL DEFAULT 0,
      fte_contribution NUMERIC(10,3) NOT NULL DEFAULT 0,
      allocation_ratio NUMERIC(10,6) NOT NULL DEFAULT 0,
      commercial_labor_cost_target NUMERIC(14,2) NOT NULL DEFAULT 0,
      commercial_direct_overhead_target NUMERIC(14,2) NOT NULL DEFAULT 0,
      commercial_shared_overhead_target NUMERIC(14,2) NOT NULL DEFAULT 0,
      commercial_loaded_cost_target NUMERIC(14,2) NOT NULL DEFAULT 0,
      source_of_truth TEXT NOT NULL,
      rule_version TEXT NOT NULL,
      materialization_reason TEXT,
      materialized_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (member_id, client_id, period_year, period_month)
    )
  `).then(() => {}).catch(error => {
    ensureSchemaPromise = null
    throw error
  })

  return ensureSchemaPromise
}

export const purgeCommercialCostAttributionPeriod = async (year: number, month: number) => {
  await ensureCommercialCostAttributionSchema()

  await runGreenhousePostgresQuery(
    `
      DELETE FROM greenhouse_serving.commercial_cost_attribution
      WHERE period_year = $1
        AND period_month = $2
    `,
    [year, month]
  )
}

export const upsertCommercialCostAttributionAllocations = async (
  allocations: CommercialCostAttributionStoredAllocation[]
) => {
  await ensureCommercialCostAttributionSchema()

  for (const row of allocations) {
    await runGreenhousePostgresQuery(
      `
        INSERT INTO greenhouse_serving.commercial_cost_attribution (
          member_id,
          client_id,
          client_name,
          period_year,
          period_month,
          base_labor_cost_target,
          internal_operational_cost_target,
          direct_overhead_target,
          shared_overhead_target,
          fte_contribution,
          allocation_ratio,
          commercial_labor_cost_target,
          commercial_direct_overhead_target,
          commercial_shared_overhead_target,
          commercial_loaded_cost_target,
          source_of_truth,
          rule_version,
          materialization_reason,
          materialized_at
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15,
          $16, $17, $18, $19::timestamptz
        )
        ON CONFLICT (member_id, client_id, period_year, period_month) DO UPDATE SET
          client_name = EXCLUDED.client_name,
          base_labor_cost_target = EXCLUDED.base_labor_cost_target,
          internal_operational_cost_target = EXCLUDED.internal_operational_cost_target,
          direct_overhead_target = EXCLUDED.direct_overhead_target,
          shared_overhead_target = EXCLUDED.shared_overhead_target,
          fte_contribution = EXCLUDED.fte_contribution,
          allocation_ratio = EXCLUDED.allocation_ratio,
          commercial_labor_cost_target = EXCLUDED.commercial_labor_cost_target,
          commercial_direct_overhead_target = EXCLUDED.commercial_direct_overhead_target,
          commercial_shared_overhead_target = EXCLUDED.commercial_shared_overhead_target,
          commercial_loaded_cost_target = EXCLUDED.commercial_loaded_cost_target,
          source_of_truth = EXCLUDED.source_of_truth,
          rule_version = EXCLUDED.rule_version,
          materialization_reason = EXCLUDED.materialization_reason,
          materialized_at = EXCLUDED.materialized_at
      `,
      [
        row.memberId,
        row.clientId,
        row.clientName,
        row.periodYear,
        row.periodMonth,
        row.baseLaborCostTarget,
        row.internalOperationalCostTarget,
        row.directOverheadTarget,
        row.sharedOverheadTarget,
        row.fteContribution,
        row.allocationRatio,
        row.commercialLaborCostTarget,
        row.commercialDirectOverheadTarget,
        row.commercialSharedOverheadTarget,
        row.commercialLoadedCostTarget,
        row.sourceOfTruth,
        row.ruleVersion,
        row.materializationReason,
        row.materializedAt
      ]
    )
  }
}

export const readCommercialCostAttributionAllocationsForPeriod = async (
  year: number,
  month: number
): Promise<CommercialCostAttributionStoredAllocation[]> => {
  await ensureCommercialCostAttributionSchema()

  const rows = await runGreenhousePostgresQuery<CommercialCostAttributionRow>(
    `
      SELECT *
      FROM greenhouse_serving.commercial_cost_attribution
      WHERE period_year = $1
        AND period_month = $2
      ORDER BY member_id ASC, client_name ASC
    `,
    [year, month]
  ).catch(() => [])

  return rows.map(row => ({
    memberId: row.member_id,
    clientId: row.client_id,
    clientName: row.client_name,
    periodYear: toNumber(row.period_year),
    periodMonth: toNumber(row.period_month),
    baseLaborCostTarget: toNumber(row.base_labor_cost_target),
    internalOperationalCostTarget: toNumber(row.internal_operational_cost_target),
    directOverheadTarget: toNumber(row.direct_overhead_target),
    sharedOverheadTarget: toNumber(row.shared_overhead_target),
    fteContribution: toNumber(row.fte_contribution),
    allocationRatio: toNumber(row.allocation_ratio),
    commercialLaborCostTarget: toNumber(row.commercial_labor_cost_target),
    commercialDirectOverheadTarget: toNumber(row.commercial_direct_overhead_target),
    commercialSharedOverheadTarget: toNumber(row.commercial_shared_overhead_target),
    commercialLoadedCostTarget: toNumber(row.commercial_loaded_cost_target),
    sourceOfTruth: row.source_of_truth as 'member_capacity_economics' | 'client_labor_cost_allocation',
    ruleVersion: row.rule_version,
    materializationReason: row.materialization_reason,
    materializedAt: toTimestampString(row.materialized_at)
  }))
}
