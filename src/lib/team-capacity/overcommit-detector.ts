import 'server-only'

import { convertFteToHours } from '@/lib/commercial/pricing-governance-store'
import { publishCapacityOvercommitDetected } from '@/lib/commercial/capacity-overcommit-events'
import { readLatestMemberCapacityEconomicsSnapshot } from '@/lib/member-capacity-economics/store'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const OPEN_QUOTATION_STATUSES = ['pending_approval', 'sent', 'approved'] as const
const DEFAULT_OPERATIONAL_HOURS_PER_FTE = 160

const toNumber = (value: string | number | null | undefined): number => {
  if (value == null) return 0

  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : 0
}

const toNullableNumber = (value: string | number | null | undefined): number | null => {
  if (value == null) return null

  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const toTimestamp = (value: string | Date | null | undefined): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()

  return String(value)
}

const normalizeAsOfDate = (asOfDate?: string | Date | null): string => {
  if (!asOfDate) {
    return new Date().toISOString().slice(0, 10)
  }

  if (asOfDate instanceof Date) {
    return asOfDate.toISOString().slice(0, 10)
  }

  const trimmed = asOfDate.trim()

  return trimmed ? trimmed.slice(0, 10) : new Date().toISOString().slice(0, 10)
}

const parseAsOfPeriod = (asOfDate: string) => {
  const parsed = new Date(`${asOfDate}T12:00:00.000Z`)

  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return {
    periodYear: parsed.getUTCFullYear(),
    periodMonth: parsed.getUTCMonth() + 1
  }
}

interface SnapshotRow extends Record<string, unknown> {
  member_id: string
  period_year: number | string
  period_month: number | string
  contracted_fte: number | string
  contracted_hours: number | string
  assigned_hours: number | string
  usage_kind: string
  used_hours: number | string | null
  usage_percent: number | string | null
  commercial_availability_hours: number | string
  operational_availability_hours: number | string | null
  snapshot_status: string
  assignment_count: number | string
  materialized_at: string | Date | null
}

interface CommitmentRow extends Record<string, unknown> {
  member_id: string
  quotation_id: string
  quotation_number: string | null
  quotation_status: string
  quotation_updated_at: string | Date | null
  quotation_sent_at: string | Date | null
  quotation_approved_at: string | Date | null
  line_item_id: string
  line_type: string
  label: string
  hours_estimated: number | string | null
  fte_allocation: number | string | null
  client_id: string | null
  organization_id: string | null
  space_id: string | null
}

interface MemberOvercommitSnapshot {
  memberId: string
  periodYear: number
  periodMonth: number
  contractedFte: number
  contractedHours: number
  assignedHours: number
  usageKind: string
  usedHours: number | null
  usagePercent: number | null
  commercialAvailabilityHours: number
  operationalAvailabilityHours: number | null
  snapshotStatus: string
  assignmentCount: number
  materializedAt: string | null
}

export interface OvercommitCommitment {
  quotationId: string
  quotationNumber: string | null
  quotationStatus: string
  quotationUpdatedAt: string | null
  quotationSentAt: string | null
  quotationApprovedAt: string | null
  lineItemId: string
  lineType: 'person'
  label: string
  hoursEstimated: number | null
  fteAllocation: number | null
  resolvedHours: number
  resolvedHoursSource: 'hours_estimated' | 'fte_allocation'
  clientId: string | null
  organizationId: string | null
  spaceId: string | null
}

export interface MemberOvercommitDetection {
  memberId: string
  asOfDate: string
  periodYear: number
  periodMonth: number
  contractedHours: number
  commercialAvailabilityHours: number
  commitmentHours: number
  overcommitHours: number
  overcommitted: boolean
  commitmentCount: number
  snapshot: MemberOvercommitSnapshot
  commitments: OvercommitCommitment[]
}

const mapSnapshotRow = (row: SnapshotRow): MemberOvercommitSnapshot => ({
  memberId: row.member_id,
  periodYear: toNumber(row.period_year),
  periodMonth: toNumber(row.period_month),
  contractedFte: toNumber(row.contracted_fte),
  contractedHours: toNumber(row.contracted_hours),
  assignedHours: toNumber(row.assigned_hours),
  usageKind: row.usage_kind,
  usedHours: toNullableNumber(row.used_hours),
  usagePercent: toNullableNumber(row.usage_percent),
  commercialAvailabilityHours: toNumber(row.commercial_availability_hours),
  operationalAvailabilityHours: toNullableNumber(row.operational_availability_hours),
  snapshotStatus: row.snapshot_status,
  assignmentCount: toNumber(row.assignment_count),
  materializedAt: toTimestamp(row.materialized_at)
})

const resolveSnapshotPeriod = async (asOfDate: string) => {
  const period = parseAsOfPeriod(asOfDate)

  if (!period) return null

  const rows = await runGreenhousePostgresQuery<{ period_year: number | string; period_month: number | string }>(
    `
      SELECT period_year, period_month
      FROM greenhouse_serving.member_capacity_economics
      WHERE (period_year, period_month) <= ($1, $2)
      ORDER BY period_year DESC, period_month DESC
      LIMIT 1
    `,
    [period.periodYear, period.periodMonth]
  )

  const row = rows[0]

  if (!row) return null

  return {
    periodYear: toNumber(row.period_year),
    periodMonth: toNumber(row.period_month)
  }
}

const readSnapshotForMember = async (
  memberId: string,
  asOfDate?: string | Date | null
): Promise<MemberOvercommitSnapshot | null> => {
  if (!asOfDate) {
    const snapshot = await readLatestMemberCapacityEconomicsSnapshot(memberId)

    return snapshot
      ? {
          memberId: snapshot.memberId,
          periodYear: snapshot.periodYear,
          periodMonth: snapshot.periodMonth,
          contractedFte: snapshot.contractedFte,
          contractedHours: snapshot.contractedHours,
          assignedHours: snapshot.assignedHours,
          usageKind: snapshot.usageKind,
          usedHours: snapshot.usedHours,
          usagePercent: snapshot.usagePercent,
          commercialAvailabilityHours: snapshot.commercialAvailabilityHours,
          operationalAvailabilityHours: snapshot.operationalAvailabilityHours,
          snapshotStatus: snapshot.snapshotStatus,
          assignmentCount: snapshot.assignmentCount,
          materializedAt: snapshot.materializedAt
        }
      : null
  }

  const normalized = normalizeAsOfDate(asOfDate)
  const period = await resolveSnapshotPeriod(normalized)

  if (!period) return null

  const rows = await runGreenhousePostgresQuery<SnapshotRow>(
    `
      SELECT member_id, period_year, period_month, contracted_fte, contracted_hours,
             assigned_hours, usage_kind, used_hours, usage_percent,
             commercial_availability_hours, operational_availability_hours,
             snapshot_status, assignment_count, materialized_at
      FROM greenhouse_serving.member_capacity_economics
      WHERE member_id = $1
        AND period_year = $2
        AND period_month = $3
      LIMIT 1
    `,
    [memberId, period.periodYear, period.periodMonth]
  )

  return rows[0] ? mapSnapshotRow(rows[0]) : null
}

const loadCommitmentRows = async (memberId: string) =>
  runGreenhousePostgresQuery<CommitmentRow>(
    `
      SELECT qli.member_id, qli.quotation_id, q.quotation_number,
             COALESCE(q.legacy_status, q.status) AS quotation_status,
             q.updated_at AS quotation_updated_at,
             q.sent_at AS quotation_sent_at,
             q.approved_at AS quotation_approved_at,
             qli.line_item_id, qli.line_type, qli.label,
             qli.hours_estimated, qli.fte_allocation,
             q.client_id, q.organization_id, q.space_id
      FROM greenhouse_commercial.quotation_line_items qli
      INNER JOIN greenhouse_commercial.quotations q
        ON q.quotation_id = qli.quotation_id
       AND q.current_version = qli.version_number
      WHERE qli.member_id = $1
        AND qli.line_type = 'person'
        AND COALESCE(q.legacy_status, q.status) = ANY($2::text[])
      ORDER BY q.updated_at DESC, qli.line_item_id ASC
    `,
    [memberId, OPEN_QUOTATION_STATUSES]
  )

const resolveCommitmentHours = async (
  row: CommitmentRow,
  asOfDate: string
): Promise<Pick<OvercommitCommitment, 'resolvedHours' | 'resolvedHoursSource'>> => {
  const hoursEstimated = toNullableNumber(row.hours_estimated)

  if (hoursEstimated !== null) {
    return { resolvedHours: hoursEstimated, resolvedHoursSource: 'hours_estimated' }
  }

  const fteAllocation = toNullableNumber(row.fte_allocation) ?? 0
  const converted = await convertFteToHours(fteAllocation, asOfDate).catch(() => null)

  const monthlyHours =
    converted && typeof converted === 'object' && 'monthlyHours' in converted
      ? toNumber((converted as { monthlyHours?: number }).monthlyHours)
      : 0

  return {
    resolvedHours: monthlyHours || fteAllocation * DEFAULT_OPERATIONAL_HOURS_PER_FTE,
    resolvedHoursSource: 'fte_allocation'
  }
}

export const detectMemberOvercommit = async (
  memberId: string,
  asOfDate?: string | Date | null
): Promise<MemberOvercommitDetection | null> => {
  const normalizedAsOfDate = normalizeAsOfDate(asOfDate)
  const snapshot = await readSnapshotForMember(memberId, asOfDate)

  if (!snapshot) return null

  const rows = await loadCommitmentRows(memberId)
  const commitments: OvercommitCommitment[] = []

  for (const row of rows) {
    const resolved = await resolveCommitmentHours(row, normalizedAsOfDate)

    commitments.push({
      quotationId: row.quotation_id,
      quotationNumber: row.quotation_number,
      quotationStatus: row.quotation_status,
      quotationUpdatedAt: toTimestamp(row.quotation_updated_at),
      quotationSentAt: toTimestamp(row.quotation_sent_at),
      quotationApprovedAt: toTimestamp(row.quotation_approved_at),
      lineItemId: row.line_item_id,
      lineType: 'person',
      label: row.label,
      hoursEstimated: toNullableNumber(row.hours_estimated),
      fteAllocation: toNullableNumber(row.fte_allocation),
      resolvedHours: resolved.resolvedHours,
      resolvedHoursSource: resolved.resolvedHoursSource,
      clientId: row.client_id,
      organizationId: row.organization_id,
      spaceId: row.space_id
    })
  }

  const commitmentHours = commitments.reduce((acc, item) => acc + item.resolvedHours, 0)
  const contractedHours = snapshot.contractedHours
  const overcommitHours = Math.max(0, commitmentHours - contractedHours)

  return {
    memberId,
    asOfDate: normalizedAsOfDate,
    periodYear: snapshot.periodYear,
    periodMonth: snapshot.periodMonth,
    contractedHours,
    commercialAvailabilityHours: snapshot.commercialAvailabilityHours,
    commitmentHours,
    overcommitHours,
    overcommitted: overcommitHours > 0,
    commitmentCount: commitments.length,
    snapshot,
    commitments
  }
}

const loadAllMembersForPeriod = async (asOfDate: string) => {
  const period = await resolveSnapshotPeriod(asOfDate)

  if (!period) return [] as string[]

  const rows = await runGreenhousePostgresQuery<{ member_id: string }>(
    `
      SELECT member_id
      FROM greenhouse_serving.member_capacity_economics
      WHERE period_year = $1
        AND period_month = $2
    `,
    [period.periodYear, period.periodMonth]
  )

  return [...new Set(rows.map(row => row.member_id))]
}

export const detectAllOvercommits = async (asOfDate?: string | Date | null) => {
  const normalizedAsOfDate = normalizeAsOfDate(asOfDate)
  const memberIds = await loadAllMembersForPeriod(normalizedAsOfDate)
  const detections: MemberOvercommitDetection[] = []

  for (const memberId of memberIds) {
    const detection = await detectMemberOvercommit(memberId, normalizedAsOfDate)

    if (!detection) continue

    detections.push(detection)

    if (detection.overcommitted) {
      await publishCapacityOvercommitDetected({
        member_id: detection.memberId,
        as_of_date: detection.asOfDate,
        period_year: detection.periodYear,
        period_month: detection.periodMonth,
        contracted_hours: detection.contractedHours,
        commercial_availability_hours: detection.commercialAvailabilityHours,
        commitment_hours: detection.commitmentHours,
        overcommit_hours: detection.overcommitHours,
        commitment_count: detection.commitmentCount,
        commitments: detection.commitments.map(commitment => ({
          quotation_id: commitment.quotationId,
          quotation_number: commitment.quotationNumber,
          quotation_status: commitment.quotationStatus,
          quotation_updated_at: commitment.quotationUpdatedAt,
          quotation_sent_at: commitment.quotationSentAt,
          quotation_approved_at: commitment.quotationApprovedAt,
          line_item_id: commitment.lineItemId,
          line_type: commitment.lineType,
          label: commitment.label,
          hours_estimated: commitment.hoursEstimated,
          fte_allocation: commitment.fteAllocation,
          resolved_hours: commitment.resolvedHours,
          resolved_hours_source: commitment.resolvedHoursSource
        }))
      })
    }
  }

  return detections
}
