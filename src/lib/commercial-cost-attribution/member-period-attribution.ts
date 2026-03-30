import 'server-only'

import {
  purgeCommercialCostAttributionPeriod,
  readCommercialCostAttributionAllocationsForPeriod,
  upsertCommercialCostAttributionAllocations
} from './store'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { COMMERCIAL_COST_ATTRIBUTION_RULE_VERSION } from './assignment-classification'

type MemberEconomicsRow = {
  member_id: string
  period_year: number | string
  period_month: number | string
  total_labor_cost_target: number | string | null
  direct_overhead_target: number | string | null
  shared_overhead_target: number | string | null
}

type LaborAllocationRow = {
  member_id: string
  client_id: string
  client_name: string | null
  period_year: number | string
  period_month: number | string
  total_fte: number | string | null
  fte_contribution: number | string | null
  allocated_labor_clp: number | string | null
}

export interface CommercialCostAllocationRow {
  memberId: string
  clientId: string
  clientName: string
  periodYear: number
  periodMonth: number
  fteContribution: number
  allocationRatio: number
  commercialLaborCostTarget: number
  commercialDirectOverheadTarget: number
  commercialSharedOverheadTarget: number
  commercialLoadedCostTarget: number
  sourceOfTruth: 'member_capacity_economics' | 'client_labor_cost_allocation'
  ruleVersion: string
}

export interface MemberPeriodCommercialCostAttribution {
  memberId: string
  periodYear: number
  periodMonth: number
  baseLaborCostTarget: number
  totalCommercialLaborCostTarget: number
  internalOperationalCostTarget: number
  directOverheadTarget: number
  sharedOverheadTarget: number
  totalCommercialLoadedCostTarget: number
  sourceOfTruth: 'member_capacity_economics' | 'client_labor_cost_allocation'
  ruleVersion: string
  allocations: CommercialCostAllocationRow[]
}

export interface ClientPeriodCommercialCostSummary {
  clientId: string
  clientName: string
  laborCostClp: number
  overheadCostClp: number
  loadedCostClp: number
  headcountFte: number
  memberCount: number
}

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const roundCurrency = (value: number) => Math.round(value * 100) / 100

const buildMemberAttribution = ({
  memberId,
  periodYear,
  periodMonth,
  economics,
  allocationRows
}: {
  memberId: string
  periodYear: number
  periodMonth: number
  economics: MemberEconomicsRow | null
  allocationRows: LaborAllocationRow[]
}): MemberPeriodCommercialCostAttribution => {
  const commercialLaborFromRows = allocationRows.reduce((sum, row) => sum + toNumber(row.allocated_labor_clp), 0)
  const directOverheadTarget = roundCurrency(toNumber(economics?.direct_overhead_target))
  const sharedOverheadTarget = roundCurrency(toNumber(economics?.shared_overhead_target))

  const baseLaborCostTarget = roundCurrency(
    economics?.total_labor_cost_target != null ? toNumber(economics.total_labor_cost_target) : commercialLaborFromRows
  )

  const sourceOfTruth = economics?.total_labor_cost_target != null
    ? 'member_capacity_economics'
    : 'client_labor_cost_allocation'

  const allocations = allocationRows.map(row => {
    const totalFte = toNumber(row.total_fte)
    const fteContribution = toNumber(row.fte_contribution)
    const laborCostTarget = roundCurrency(toNumber(row.allocated_labor_clp))

    const allocationRatio = totalFte > 0
      ? fteContribution / totalFte
      : commercialLaborFromRows > 0
        ? laborCostTarget / commercialLaborFromRows
        : 0

    const commercialDirectOverheadTarget = roundCurrency(directOverheadTarget * allocationRatio)
    const commercialSharedOverheadTarget = roundCurrency(sharedOverheadTarget * allocationRatio)

    return {
      memberId,
      clientId: row.client_id,
      clientName: row.client_name?.trim() || row.client_id,
      periodYear,
      periodMonth,
      fteContribution: roundCurrency(fteContribution),
      allocationRatio: roundCurrency(allocationRatio),
      commercialLaborCostTarget: laborCostTarget,
      commercialDirectOverheadTarget,
      commercialSharedOverheadTarget,
      commercialLoadedCostTarget: roundCurrency(
        laborCostTarget + commercialDirectOverheadTarget + commercialSharedOverheadTarget
      ),
      sourceOfTruth,
      ruleVersion: COMMERCIAL_COST_ATTRIBUTION_RULE_VERSION
    } satisfies CommercialCostAllocationRow
  })

  const totalCommercialLaborCostTarget = roundCurrency(
    allocations.reduce((sum, row) => sum + row.commercialLaborCostTarget, 0)
  )

  const totalCommercialLoadedCostTarget = roundCurrency(
    allocations.reduce((sum, row) => sum + row.commercialLoadedCostTarget, 0)
  )

  return {
    memberId,
    periodYear,
    periodMonth,
    baseLaborCostTarget,
    totalCommercialLaborCostTarget,
    internalOperationalCostTarget: roundCurrency(Math.max(0, baseLaborCostTarget - totalCommercialLaborCostTarget)),
    directOverheadTarget,
    sharedOverheadTarget,
    totalCommercialLoadedCostTarget,
    sourceOfTruth,
    ruleVersion: COMMERCIAL_COST_ATTRIBUTION_RULE_VERSION,
    allocations
  }
}

export const computeCommercialCostAttributionForPeriod = async (
  year: number,
  month: number
): Promise<MemberPeriodCommercialCostAttribution[]> => {
  const [economicsRows, laborAllocationRows] = await Promise.all([
    runGreenhousePostgresQuery<MemberEconomicsRow>(
      `
        SELECT
          member_id,
          period_year,
          period_month,
          total_labor_cost_target,
          direct_overhead_target,
          shared_overhead_target
        FROM greenhouse_serving.member_capacity_economics
        WHERE period_year = $1 AND period_month = $2
      `,
      [year, month]
    ).catch(() => []),
    runGreenhousePostgresQuery<LaborAllocationRow>(
      `
        SELECT
          member_id,
          client_id,
          client_name,
          period_year,
          period_month,
          total_fte,
          fte_contribution,
          allocated_labor_clp
        FROM greenhouse_serving.client_labor_cost_allocation
        WHERE period_year = $1 AND period_month = $2
          AND allocated_labor_clp IS NOT NULL
      `,
      [year, month]
    ).catch(() => [])
  ])

  const economicsByMember = new Map<string, MemberEconomicsRow>(
    economicsRows.map(row => [row.member_id, row])
  )

  const allocationsByMember = new Map<string, LaborAllocationRow[]>()

  for (const row of laborAllocationRows) {
    const rows = allocationsByMember.get(row.member_id) || []

    rows.push(row)
    allocationsByMember.set(row.member_id, rows)
  }

  const memberIds = new Set<string>([
    ...economicsRows.map(row => row.member_id),
    ...laborAllocationRows.map(row => row.member_id)
  ])

  return Array.from(memberIds.values())
    .map(memberId =>
      buildMemberAttribution({
        memberId,
        periodYear: year,
        periodMonth: month,
        economics: economicsByMember.get(memberId) ?? null,
        allocationRows: allocationsByMember.get(memberId) || []
      })
    )
    .sort((left, right) => left.memberId.localeCompare(right.memberId))
}

const buildMemberAttributionFromStoredRows = (
  rows: Awaited<ReturnType<typeof readCommercialCostAttributionAllocationsForPeriod>>
): MemberPeriodCommercialCostAttribution[] => {
  const memberMap = new Map<string, MemberPeriodCommercialCostAttribution>()

  for (const row of rows) {
    const existing = memberMap.get(row.memberId) || {
      memberId: row.memberId,
      periodYear: row.periodYear,
      periodMonth: row.periodMonth,
      baseLaborCostTarget: row.baseLaborCostTarget,
      totalCommercialLaborCostTarget: 0,
      internalOperationalCostTarget: row.internalOperationalCostTarget,
      directOverheadTarget: row.directOverheadTarget,
      sharedOverheadTarget: row.sharedOverheadTarget,
      totalCommercialLoadedCostTarget: 0,
      sourceOfTruth: row.sourceOfTruth,
      ruleVersion: row.ruleVersion,
      allocations: []
    } satisfies MemberPeriodCommercialCostAttribution

    existing.totalCommercialLaborCostTarget += row.commercialLaborCostTarget
    existing.totalCommercialLoadedCostTarget += row.commercialLoadedCostTarget
    existing.allocations.push({
      memberId: row.memberId,
      clientId: row.clientId,
      clientName: row.clientName,
      periodYear: row.periodYear,
      periodMonth: row.periodMonth,
      fteContribution: row.fteContribution,
      allocationRatio: row.allocationRatio,
      commercialLaborCostTarget: row.commercialLaborCostTarget,
      commercialDirectOverheadTarget: row.commercialDirectOverheadTarget,
      commercialSharedOverheadTarget: row.commercialSharedOverheadTarget,
      commercialLoadedCostTarget: row.commercialLoadedCostTarget,
      sourceOfTruth: row.sourceOfTruth,
      ruleVersion: row.ruleVersion
    })
    memberMap.set(row.memberId, existing)
  }

  return Array.from(memberMap.values())
    .map(row => ({
      ...row,
      totalCommercialLaborCostTarget: roundCurrency(row.totalCommercialLaborCostTarget),
      totalCommercialLoadedCostTarget: roundCurrency(row.totalCommercialLoadedCostTarget)
    }))
    .sort((left, right) => left.memberId.localeCompare(right.memberId))
}

export const readCommercialCostAttributionForPeriod = async (
  year: number,
  month: number
): Promise<MemberPeriodCommercialCostAttribution[]> => {
  const materializedRows = await readCommercialCostAttributionAllocationsForPeriod(year, month).catch(() => [])

  if (materializedRows.length > 0) {
    return buildMemberAttributionFromStoredRows(materializedRows)
  }

  return computeCommercialCostAttributionForPeriod(year, month)
}

export const summarizeCommercialCostAttributionByClient = (
  rows: MemberPeriodCommercialCostAttribution[]
): ClientPeriodCommercialCostSummary[] => {
  const clientMap = new Map<string, ClientPeriodCommercialCostSummary & { memberIds: Set<string> }>()

  for (const row of rows) {
    for (const allocation of row.allocations) {
      const existing = clientMap.get(allocation.clientId) || {
        clientId: allocation.clientId,
        clientName: allocation.clientName,
        laborCostClp: 0,
        overheadCostClp: 0,
        loadedCostClp: 0,
        headcountFte: 0,
        memberCount: 0,
        memberIds: new Set<string>()
      }

      existing.laborCostClp += allocation.commercialLaborCostTarget
      existing.overheadCostClp += allocation.commercialDirectOverheadTarget + allocation.commercialSharedOverheadTarget
      existing.loadedCostClp += allocation.commercialLoadedCostTarget
      existing.headcountFte += allocation.fteContribution
      existing.memberIds.add(allocation.memberId)
      existing.memberCount = existing.memberIds.size
      clientMap.set(allocation.clientId, existing)
    }
  }

  return Array.from(clientMap.values())
    .map(entry => {
      const { memberIds, ...row } = entry

      void memberIds

      return {
        ...row,
        laborCostClp: roundCurrency(row.laborCostClp),
        overheadCostClp: roundCurrency(row.overheadCostClp),
        loadedCostClp: roundCurrency(row.loadedCostClp),
        headcountFte: roundCurrency(row.headcountFte)
      }
    })
    .sort((left, right) => right.loadedCostClp - left.loadedCostClp || left.clientName.localeCompare(right.clientName))
}

export const readCommercialCostAttributionByClientForPeriod = async (
  year: number,
  month: number
) => summarizeCommercialCostAttributionByClient(await readCommercialCostAttributionForPeriod(year, month))

export const materializeCommercialCostAttributionForPeriod = async (
  year: number,
  month: number,
  reason: string | null = null
) => {
  const rows = await computeCommercialCostAttributionForPeriod(year, month)
  const materializedAt = new Date().toISOString()

  await purgeCommercialCostAttributionPeriod(year, month)
  await upsertCommercialCostAttributionAllocations(
    rows.flatMap(row =>
      row.allocations.map(allocation => ({
        memberId: allocation.memberId,
        clientId: allocation.clientId,
        clientName: allocation.clientName,
        periodYear: allocation.periodYear,
        periodMonth: allocation.periodMonth,
        baseLaborCostTarget: row.baseLaborCostTarget,
        internalOperationalCostTarget: row.internalOperationalCostTarget,
        directOverheadTarget: row.directOverheadTarget,
        sharedOverheadTarget: row.sharedOverheadTarget,
        fteContribution: allocation.fteContribution,
        allocationRatio: allocation.allocationRatio,
        commercialLaborCostTarget: allocation.commercialLaborCostTarget,
        commercialDirectOverheadTarget: allocation.commercialDirectOverheadTarget,
        commercialSharedOverheadTarget: allocation.commercialSharedOverheadTarget,
        commercialLoadedCostTarget: allocation.commercialLoadedCostTarget,
        sourceOfTruth: allocation.sourceOfTruth,
        ruleVersion: allocation.ruleVersion,
        materializationReason: reason,
        materializedAt
      }))
    )
  )

  return rows
}
