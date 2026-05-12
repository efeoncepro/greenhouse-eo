import 'server-only'

import { query } from '@/lib/db'

import { listOffboardingCases } from '../store'
import type { OffboardingWorkQueue, OffboardingWorkQueueDocumentSummary, OffboardingWorkQueueFilters, OffboardingWorkQueueSettlementSummary } from './types'
import { buildOffboardingWorkQueueItem, buildOffboardingWorkQueueSummary } from './derivation'

type MemberRow = {
  member_id: string
  display_name: string | null
  primary_email: string | null
  role_title: string | null
}

type SettlementRow = {
  offboarding_case_id: string
  final_settlement_id: string
  settlement_version: number | string
  calculation_status: OffboardingWorkQueueSettlementSummary['calculationStatus']
  readiness_status: OffboardingWorkQueueSettlementSummary['readinessStatus']
  readiness_has_blockers: boolean
  net_payable: number | string
  currency: 'CLP'
  calculated_at: string | Date | null
  approved_at: string | Date | null
}

type DocumentRow = {
  offboarding_case_id: string
  final_settlement_document_id: string
  final_settlement_id: string
  settlement_version: number | string
  document_version: number | string
  document_status: OffboardingWorkQueueDocumentSummary['documentStatus']
  readiness_json: {
    status?: OffboardingWorkQueueDocumentSummary['readinessStatus']
    hasBlockers?: boolean
  } | null
  pdf_asset_id: string | null
  issued_at: string | Date | null
  signed_or_ratified_at: string | Date | null
}

const toTimestampString = (value: string | Date | null): string | null => {
  if (!value) return null
  if (typeof value === 'string') return value

  return value.toISOString()
}

const latestSettlementsByCase = async (caseIds: string[]) => {
  if (caseIds.length === 0) return new Map<string, OffboardingWorkQueueSettlementSummary>()

  const rows = await query<SettlementRow>(
    `
      SELECT DISTINCT ON (offboarding_case_id)
        offboarding_case_id,
        final_settlement_id,
        settlement_version,
        calculation_status,
        readiness_status,
        readiness_has_blockers,
        net_payable,
        currency,
        calculated_at,
        approved_at
      FROM greenhouse_payroll.final_settlements
      WHERE offboarding_case_id = ANY($1::text[])
      ORDER BY offboarding_case_id, settlement_version DESC, created_at DESC
    `,
    [caseIds]
  )

  return new Map(rows.map(row => [
    row.offboarding_case_id,
    {
      finalSettlementId: row.final_settlement_id,
      settlementVersion: Number(row.settlement_version),
      calculationStatus: row.calculation_status,
      readinessStatus: row.readiness_status,
      readinessHasBlockers: Boolean(row.readiness_has_blockers),
      netPayable: Number(row.net_payable),
      currency: row.currency,
      calculatedAt: toTimestampString(row.calculated_at),
      approvedAt: toTimestampString(row.approved_at)
    }
  ]))
}

const latestDocumentsByCase = async (caseIds: string[]) => {
  if (caseIds.length === 0) return new Map<string, OffboardingWorkQueueDocumentSummary>()

  const rows = await query<DocumentRow>(
    `
      SELECT DISTINCT ON (offboarding_case_id)
        offboarding_case_id,
        final_settlement_document_id,
        final_settlement_id,
        settlement_version,
        document_version,
        document_status,
        readiness_json,
        pdf_asset_id,
        issued_at,
        signed_or_ratified_at
      FROM greenhouse_payroll.final_settlement_documents
      WHERE offboarding_case_id = ANY($1::text[])
      ORDER BY offboarding_case_id, settlement_version DESC, document_version DESC, created_at DESC
    `,
    [caseIds]
  )

  return new Map(rows.map(row => [
    row.offboarding_case_id,
    {
      finalSettlementDocumentId: row.final_settlement_document_id,
      finalSettlementId: row.final_settlement_id,
      settlementVersion: Number(row.settlement_version),
      documentVersion: Number(row.document_version),
      documentStatus: row.document_status,
      readinessStatus: row.readiness_json?.status ?? 'blocked',
      readinessHasBlockers: Boolean(row.readiness_json?.hasBlockers),
      pdfAssetId: row.pdf_asset_id,
      isHistoricalForLatestSettlement: false,
      issuedAt: toTimestampString(row.issued_at),
      signedOrRatifiedAt: toTimestampString(row.signed_or_ratified_at)
    }
  ]))
}

const membersById = async (memberIds: string[]) => {
  if (memberIds.length === 0) return new Map<string, MemberRow>()

  const rows = await query<MemberRow>(
    `
      SELECT member_id, display_name, primary_email, role_title
      FROM greenhouse_core.members
      WHERE member_id = ANY($1::text[])
    `,
    [memberIds]
  )

  return new Map(rows.map(row => [row.member_id, row]))
}

export const getOffboardingWorkQueue = async (filters: OffboardingWorkQueueFilters = {}): Promise<OffboardingWorkQueue> => {
  const cases = await listOffboardingCases(filters)
  const caseIds = cases.map(item => item.offboardingCaseId)
  const memberIds = Array.from(new Set(cases.map(item => item.memberId).filter(Boolean))) as string[]

  const [settlements, documents, members] = await Promise.all([
    latestSettlementsByCase(caseIds),
    latestDocumentsByCase(caseIds),
    membersById(memberIds)
  ])

  const items = cases.map(item => {
    const member = item.memberId ? members.get(item.memberId) : null

    return buildOffboardingWorkQueueItem({
      item,
      collaborator: {
        memberId: item.memberId,
        displayName: member?.display_name ?? null,
        primaryEmail: member?.primary_email ?? null,
        roleTitle: member?.role_title ?? null
      },
      settlement: settlements.get(item.offboardingCaseId) ?? null,
      document: documents.get(item.offboardingCaseId) ?? null
    })
  })

  return {
    items,
    summary: buildOffboardingWorkQueueSummary(items),
    generatedAt: new Date().toISOString(),
    degradedReasons: []
  }
}
