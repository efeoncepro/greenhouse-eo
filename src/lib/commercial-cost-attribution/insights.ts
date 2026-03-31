import 'server-only'

import {
  readCommercialCostAttributionAllocationsForPeriod,
  type CommercialCostAttributionStoredAllocation
} from './store'

const roundCurrency = (value: number) => Math.round(value * 100) / 100

export interface CommercialCostAttributionHealthSummary {
  periodYear: number
  periodMonth: number
  allocationCount: number
  memberCount: number
  clientCount: number
  membersWithCommercialAttribution: number
  membersWithInternalLoad: number
  totalBaseLaborCostTarget: number
  totalCommercialLaborCostTarget: number
  totalInternalOperationalCostTarget: number
  totalCommercialLoadedCostTarget: number
  totalAttributedOverheadTarget: number
  unexplainedLaborDeltaTarget: number
  healthy: boolean
}

export interface CommercialCostAttributionClientExplain {
  periodYear: number
  periodMonth: number
  clientId: string
  clientName: string
  memberCount: number
  headcountFte: number
  commercialLaborCostTarget: number
  commercialDirectOverheadTarget: number
  commercialSharedOverheadTarget: number
  commercialLoadedCostTarget: number
  sourceOfTruths: string[]
  ruleVersions: string[]
  members: Array<{
    memberId: string
    baseLaborCostTarget: number
    internalOperationalCostTarget: number
    fteContribution: number
    allocationRatio: number
    commercialLaborCostTarget: number
    commercialDirectOverheadTarget: number
    commercialSharedOverheadTarget: number
    commercialLoadedCostTarget: number
    sourceOfTruth: string
    ruleVersion: string
    materializationReason: string | null
    materializedAt: string | null
  }>
}

const buildMemberGroupedRows = (rows: CommercialCostAttributionStoredAllocation[]) => {
  const memberMap = new Map<
    string,
    {
      baseLaborCostTarget: number
      internalOperationalCostTarget: number
      loadedCost: number
    }
  >()

  for (const row of rows) {
    const current = memberMap.get(row.memberId)

    if (current) continue

    memberMap.set(row.memberId, {
      baseLaborCostTarget: row.baseLaborCostTarget,
      internalOperationalCostTarget: row.internalOperationalCostTarget,
      loadedCost: row.commercialLoadedCostTarget
    })
  }

  return memberMap
}

export const getCommercialCostAttributionHealthSummary = async (
  year: number,
  month: number
): Promise<CommercialCostAttributionHealthSummary> => {
  const rows = await readCommercialCostAttributionAllocationsForPeriod(year, month)
  const memberMap = buildMemberGroupedRows(rows)
  const clientIds = new Set(rows.map(row => row.clientId))

  const membersWithCommercialAttribution = new Set(
    rows.filter(row => row.commercialLaborCostTarget > 0 || row.commercialLoadedCostTarget > 0).map(row => row.memberId)
  )

  const membersWithInternalLoad = Array.from(memberMap.values()).filter(
    row => row.internalOperationalCostTarget > 0
  ).length

  const totalBaseLaborCostTarget = roundCurrency(
    Array.from(memberMap.values()).reduce((sum, row) => sum + row.baseLaborCostTarget, 0)
  )

  const totalInternalOperationalCostTarget = roundCurrency(
    Array.from(memberMap.values()).reduce((sum, row) => sum + row.internalOperationalCostTarget, 0)
  )

  const totalCommercialLaborCostTarget = roundCurrency(
    rows.reduce((sum, row) => sum + row.commercialLaborCostTarget, 0)
  )

  const totalCommercialLoadedCostTarget = roundCurrency(
    rows.reduce((sum, row) => sum + row.commercialLoadedCostTarget, 0)
  )

  const totalAttributedOverheadTarget = roundCurrency(
    rows.reduce((sum, row) => sum + row.commercialDirectOverheadTarget + row.commercialSharedOverheadTarget, 0)
  )

  const unexplainedLaborDeltaTarget = roundCurrency(
    totalBaseLaborCostTarget - totalCommercialLaborCostTarget - totalInternalOperationalCostTarget
  )

  return {
    periodYear: year,
    periodMonth: month,
    allocationCount: rows.length,
    memberCount: memberMap.size,
    clientCount: clientIds.size,
    membersWithCommercialAttribution: membersWithCommercialAttribution.size,
    membersWithInternalLoad,
    totalBaseLaborCostTarget,
    totalCommercialLaborCostTarget,
    totalInternalOperationalCostTarget,
    totalCommercialLoadedCostTarget,
    totalAttributedOverheadTarget,
    unexplainedLaborDeltaTarget,
    healthy: Math.abs(unexplainedLaborDeltaTarget) <= 1
  }
}

export const getCommercialCostAttributionExplainForClient = async (
  year: number,
  month: number,
  clientId: string
): Promise<CommercialCostAttributionClientExplain | null> => {
  const rows = (await readCommercialCostAttributionAllocationsForPeriod(year, month))
    .filter(row => row.clientId === clientId)

  if (rows.length === 0) return null

  const clientName = rows[0].clientName
  const sourceOfTruths = [...new Set(rows.map(row => row.sourceOfTruth))].sort()
  const ruleVersions = [...new Set(rows.map(row => row.ruleVersion))].sort()

  return {
    periodYear: year,
    periodMonth: month,
    clientId,
    clientName,
    memberCount: new Set(rows.map(row => row.memberId)).size,
    headcountFte: roundCurrency(rows.reduce((sum, row) => sum + row.fteContribution, 0)),
    commercialLaborCostTarget: roundCurrency(rows.reduce((sum, row) => sum + row.commercialLaborCostTarget, 0)),
    commercialDirectOverheadTarget: roundCurrency(
      rows.reduce((sum, row) => sum + row.commercialDirectOverheadTarget, 0)
    ),
    commercialSharedOverheadTarget: roundCurrency(
      rows.reduce((sum, row) => sum + row.commercialSharedOverheadTarget, 0)
    ),
    commercialLoadedCostTarget: roundCurrency(rows.reduce((sum, row) => sum + row.commercialLoadedCostTarget, 0)),
    sourceOfTruths,
    ruleVersions,
    members: rows
      .map(row => ({
        memberId: row.memberId,
        baseLaborCostTarget: row.baseLaborCostTarget,
        internalOperationalCostTarget: row.internalOperationalCostTarget,
        fteContribution: row.fteContribution,
        allocationRatio: row.allocationRatio,
        commercialLaborCostTarget: row.commercialLaborCostTarget,
        commercialDirectOverheadTarget: row.commercialDirectOverheadTarget,
        commercialSharedOverheadTarget: row.commercialSharedOverheadTarget,
        commercialLoadedCostTarget: row.commercialLoadedCostTarget,
        sourceOfTruth: row.sourceOfTruth,
        ruleVersion: row.ruleVersion,
        materializationReason: row.materializationReason,
        materializedAt: row.materializedAt
      }))
      .sort((left, right) => right.commercialLoadedCostTarget - left.commercialLoadedCostTarget || left.memberId.localeCompare(right.memberId))
  }
}
