import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { query, withTransaction } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { getOffboardingCase } from '@/lib/workforce/offboarding'
import { PayrollValidationError, normalizeNullableString, toNumber } from '@/lib/payroll/shared'

import {
  calculateFinalSettlement,
  type FinalSettlementCompensationSnapshot,
  type FinalSettlementLeaveSnapshot,
  type FinalSettlementPayrollOverlapSnapshot
} from './calculator'
import type {
  CalculateFinalSettlementInput,
  FinalSettlement,
  FinalSettlementBreakdownLine,
  FinalSettlementExplanation,
  FinalSettlementReadiness,
  FinalSettlementSourceSnapshot,
  FinalSettlementStatus
} from './types'

type JsonRecord = Record<string, unknown>
type FinalSettlementRow = Record<string, any>

type CompensationRow = {
  version_id: string
  member_id: string
  pay_regime: string
  currency: string
  base_salary: string | number
  remote_allowance: string | number
  colacion_amount: string | number
  movilizacion_amount: string | number
  fixed_bonus_label: string | null
  fixed_bonus_amount: string | number
  gratificacion_legal_mode: string | null
  afp_name: string | null
  afp_rate: string | number | null
  afp_cotizacion_rate: string | number | null
  afp_comision_rate: string | number | null
  health_system: string | null
  health_plan_uf: string | number | null
  unemployment_rate: string | number | null
  contract_type: string
  has_apv: boolean
  apv_amount: string | number
  effective_from: string | Date
  effective_to: string | Date | null
  hire_date: string | Date | null
}

type LeaveBalanceRow = {
  balance_id: string
  year: number | string
  allowance_days: number | string
  progressive_extra_days: number | string
  carried_over_days: number | string
  adjustment_days: number | string
  used_days: number | string
  reserved_days: number | string
}

type PayrollOverlapRow = {
  period_id: string
  status: string | null
  entry_id: string | null
  uf_value: number | string | null
  tax_table_version: string | null
}

const toDateString = (value: unknown): string | null => {
  if (!value) return null
  if (typeof value === 'string') return value.slice(0, 10)
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return null
}

const toTimestampString = (value: unknown): string | null => {
  if (!value) return null
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()

  return null
}

const toJsonRecord = (value: unknown): JsonRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}

const toJsonArray = <T>(value: unknown): T[] => Array.isArray(value) ? value as T[] : []

const mapSettlementRow = (row: FinalSettlementRow): FinalSettlement => ({
  finalSettlementId: row.final_settlement_id,
  offboardingCaseId: row.offboarding_case_id,
  settlementVersion: Number(row.settlement_version),
  supersedesFinalSettlementId: row.supersedes_final_settlement_id,
  profileId: row.profile_id,
  memberId: row.member_id,
  personLegalEntityRelationshipId: row.person_legal_entity_relationship_id,
  legalEntityOrganizationId: row.legal_entity_organization_id,
  compensationVersionId: row.compensation_version_id,
  separationType: row.separation_type,
  contractTypeSnapshot: row.contract_type_snapshot,
  payRegimeSnapshot: row.pay_regime_snapshot,
  payrollViaSnapshot: row.payroll_via_snapshot,
  effectiveDate: toDateString(row.effective_date) ?? '',
  lastWorkingDay: toDateString(row.last_working_day) ?? '',
  contractEndDateSnapshot: toDateString(row.contract_end_date_snapshot),
  hireDateSnapshot: toDateString(row.hire_date_snapshot),
  calculationStatus: row.calculation_status,
  readinessStatus: row.readiness_status,
  readinessHasBlockers: Boolean(row.readiness_has_blockers),
  currency: row.currency,
  grossTotal: toNumber(row.gross_total),
  deductionTotal: toNumber(row.deduction_total),
  netPayable: toNumber(row.net_payable),
  sourceSnapshot: toJsonRecord(row.source_snapshot_json) as unknown as FinalSettlementSourceSnapshot,
  breakdown: toJsonArray<FinalSettlementBreakdownLine>(row.breakdown_json),
  explanation: toJsonRecord(row.explanation_json) as unknown as FinalSettlementExplanation,
  readiness: toJsonRecord(row.readiness_json) as unknown as FinalSettlementReadiness,
  calculatedAt: toTimestampString(row.calculated_at),
  calculatedByUserId: row.calculated_by_user_id,
  approvedAt: toTimestampString(row.approved_at),
  approvedByUserId: row.approved_by_user_id,
  cancelledAt: toTimestampString(row.cancelled_at),
  cancelledByUserId: row.cancelled_by_user_id,
  cancelReason: row.cancel_reason,
  createdAt: toTimestampString(row.created_at) ?? '',
  updatedAt: toTimestampString(row.updated_at) ?? ''
})

const assertSupportedCompensation = (row: CompensationRow): FinalSettlementCompensationSnapshot => {
  if (row.pay_regime !== 'chile' || row.currency !== 'CLP') {
    throw new PayrollValidationError('Final settlement V1 only supports Chile CLP compensation.', 409)
  }

  if (row.contract_type !== 'indefinido' && row.contract_type !== 'plazo_fijo') {
    throw new PayrollValidationError('Final settlement V1 only supports dependent Chile contracts.', 409)
  }

  return {
    versionId: row.version_id,
    memberId: row.member_id,
    payRegime: 'chile',
    currency: 'CLP',
    baseSalary: toNumber(row.base_salary),
    remoteAllowance: toNumber(row.remote_allowance),
    colacionAmount: toNumber(row.colacion_amount),
    movilizacionAmount: toNumber(row.movilizacion_amount),
    fixedBonusLabel: row.fixed_bonus_label,
    fixedBonusAmount: toNumber(row.fixed_bonus_amount),
    gratificacionLegalMode:
      row.gratificacion_legal_mode === 'mensual_25pct' || row.gratificacion_legal_mode === 'anual_proporcional'
        ? row.gratificacion_legal_mode
        : 'ninguna',
    afpName: normalizeNullableString(row.afp_name),
    afpRate: row.afp_rate == null ? null : toNumber(row.afp_rate),
    afpCotizacionRate: row.afp_cotizacion_rate == null ? null : toNumber(row.afp_cotizacion_rate),
    afpComisionRate: row.afp_comision_rate == null ? null : toNumber(row.afp_comision_rate),
    healthSystem: row.health_system === 'isapre' ? 'isapre' : row.health_system === 'fonasa' ? 'fonasa' : null,
    healthPlanUf: row.health_plan_uf == null ? null : toNumber(row.health_plan_uf),
    unemploymentRate: row.unemployment_rate == null ? null : toNumber(row.unemployment_rate),
    contractType: row.contract_type,
    hasApv: Boolean(row.has_apv),
    apvAmount: toNumber(row.apv_amount),
    effectiveFrom: toDateString(row.effective_from) ?? '',
    effectiveTo: toDateString(row.effective_to)
  }
}

const mapLeaveBalance = (row: LeaveBalanceRow): FinalSettlementLeaveSnapshot => {
  const allowanceDays = toNumber(row.allowance_days)
  const progressiveExtraDays = toNumber(row.progressive_extra_days)
  const carriedOverDays = toNumber(row.carried_over_days)
  const adjustmentDays = toNumber(row.adjustment_days)
  const usedDays = toNumber(row.used_days)
  const reservedDays = toNumber(row.reserved_days)

  return {
    balanceId: row.balance_id,
    year: Number(row.year),
    allowanceDays,
    progressiveExtraDays,
    carriedOverDays,
    adjustmentDays,
    usedDays,
    reservedDays,
    availableDays: Math.round((allowanceDays + progressiveExtraDays + carriedOverDays + adjustmentDays - usedDays - reservedDays) * 100) / 100
  }
}

const getCompensationSnapshot = async (memberId: string, lastWorkingDay: string) => {
  const rows = await query<CompensationRow>(
    `
      SELECT
        cv.*,
        m.hire_date
      FROM greenhouse_payroll.compensation_versions cv
      LEFT JOIN greenhouse_core.members m
        ON m.member_id = cv.member_id
      WHERE cv.member_id = $1
        AND cv.effective_from <= $2::date
        AND (cv.effective_to IS NULL OR cv.effective_to >= $2::date)
      ORDER BY cv.effective_from DESC, cv.version DESC
      LIMIT 1
    `,
    [memberId, lastWorkingDay]
  )

  const row = rows[0]

  return row ? { compensation: assertSupportedCompensation(row), hireDate: toDateString(row.hire_date) } : { compensation: null, hireDate: null }
}

const getLeaveBalanceSnapshot = async (memberId: string, year: number) => {
  const rows = await query<LeaveBalanceRow>(
    `
      SELECT
        balance_id,
        year,
        allowance_days,
        progressive_extra_days,
        carried_over_days,
        adjustment_days,
        used_days,
        reserved_days
      FROM greenhouse_hr.leave_balances
      WHERE member_id = $1
        AND leave_type_code = 'vacation'
        AND year = $2
      LIMIT 1
    `,
    [memberId, year]
  )

  return rows[0] ? mapLeaveBalance(rows[0]) : null
}

const getPayrollOverlapSnapshot = async (memberId: string, lastWorkingDay: string): Promise<FinalSettlementPayrollOverlapSnapshot> => {
  const year = Number(lastWorkingDay.slice(0, 4))
  const month = Number(lastWorkingDay.slice(5, 7))
  const periodId = `${year}-${String(month).padStart(2, '0')}`

  const rows = await query<PayrollOverlapRow>(
    `
      SELECT
        pp.period_id,
        pp.status,
        pe.entry_id,
        pp.uf_value,
        pp.tax_table_version
      FROM greenhouse_payroll.payroll_periods pp
      LEFT JOIN greenhouse_payroll.payroll_entries pe
        ON pe.period_id = pp.period_id
       AND pe.member_id = $1
       AND COALESCE(pe.is_active, TRUE) = TRUE
      WHERE pp.period_id = $2
      LIMIT 1
    `,
    [memberId, periodId]
  ).catch(() => [])

  const row = rows[0]

  return {
    covered: Boolean(row?.entry_id && row.status && ['calculated', 'approved', 'exported'].includes(row.status)),
    periodId,
    status: row?.status ?? null,
    entryId: row?.entry_id ?? null,
    ufValue: row?.uf_value == null ? null : toNumber(row.uf_value),
    taxTableVersion: row?.tax_table_version ?? null
  }
}

const insertSettlementEvent = async (
  client: PoolClient,
  {
    settlement,
    eventType,
    fromStatus,
    toStatus,
    actorUserId,
    reason,
    payload
  }: {
    settlement: FinalSettlement
    eventType: string
    fromStatus?: string | null
    toStatus?: string | null
    actorUserId: string
    reason?: string | null
    payload?: Record<string, unknown>
  }
) => {
  await client.query(
    `
      INSERT INTO greenhouse_payroll.final_settlement_events (
        event_id,
        final_settlement_id,
        offboarding_case_id,
        event_type,
        from_status,
        to_status,
        actor_user_id,
        reason,
        payload
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
    `,
    [
      `final-settlement-event-${randomUUID()}`,
      settlement.finalSettlementId,
      settlement.offboardingCaseId,
      eventType,
      fromStatus ?? null,
      toStatus ?? null,
      actorUserId,
      reason ?? null,
      JSON.stringify(payload ?? {})
    ]
  )
}

const publishSettlementEvent = async (
  client: PoolClient,
  eventType: string,
  settlement: FinalSettlement,
  payload: Record<string, unknown> = {}
) => {
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.payrollFinalSettlement,
      aggregateId: settlement.finalSettlementId,
      eventType,
      payload: {
        schemaVersion: 1,
        finalSettlementId: settlement.finalSettlementId,
        offboardingCaseId: settlement.offboardingCaseId,
        memberId: settlement.memberId,
        profileId: settlement.profileId,
        status: settlement.calculationStatus,
        grossTotal: settlement.grossTotal,
        deductionTotal: settlement.deductionTotal,
        netPayable: settlement.netPayable,
        ...payload
      }
    },
    client
  )
}

export const listFinalSettlementsForCase = async (offboardingCaseId: string) => {
  const rows = await query<FinalSettlementRow>(
    `
      SELECT *
      FROM greenhouse_payroll.final_settlements
      WHERE offboarding_case_id = $1
      ORDER BY settlement_version DESC, created_at DESC
    `,
    [offboardingCaseId]
  )

  return rows.map(mapSettlementRow)
}

export const getLatestFinalSettlementForCase = async (offboardingCaseId: string) => {
  const rows = await query<FinalSettlementRow>(
    `
      SELECT *
      FROM greenhouse_payroll.final_settlements
      WHERE offboarding_case_id = $1
      ORDER BY settlement_version DESC, created_at DESC
      LIMIT 1
    `,
    [offboardingCaseId]
  )

  return rows[0] ? mapSettlementRow(rows[0]) : null
}

export const calculateFinalSettlementForCase = async (input: CalculateFinalSettlementInput) => {
  const offboardingCase = await getOffboardingCase(input.offboardingCaseId)

  if (!offboardingCase) {
    throw new PayrollValidationError('Offboarding case not found.', 404)
  }

  if (!offboardingCase.memberId) {
    throw new PayrollValidationError('Offboarding case does not have a member linked.', 409)
  }

  if (!offboardingCase.effectiveDate || !offboardingCase.lastWorkingDay) {
    throw new PayrollValidationError('Offboarding case effective date and last working day are required.', 409)
  }

  const [{ compensation, hireDate }, leaveBalance, payrollOverlap] = await Promise.all([
    getCompensationSnapshot(offboardingCase.memberId, offboardingCase.lastWorkingDay),
    getLeaveBalanceSnapshot(offboardingCase.memberId, Number(offboardingCase.lastWorkingDay.slice(0, 4))),
    getPayrollOverlapSnapshot(offboardingCase.memberId, offboardingCase.lastWorkingDay)
  ])

  const calculation = await calculateFinalSettlement({
    offboardingCase,
    compensation,
    leaveBalance,
    payrollOverlap,
    hireDate,
    previredEvidence: toJsonRecord(offboardingCase.sourceRef.previredContributions),
    manualDeductions: input.manualDeductions
  })

  if (calculation.readiness.hasBlockers || !calculation.sourceSnapshot) {
    throw new PayrollValidationError('Final settlement is not ready to calculate.', 409, calculation.readiness)
  }

  return withTransaction(async client => {
    const existingRows = await client.query<FinalSettlementRow>(
      `
        SELECT *
        FROM greenhouse_payroll.final_settlements
        WHERE offboarding_case_id = $1
        ORDER BY settlement_version DESC, created_at DESC
        FOR UPDATE
      `,
      [input.offboardingCaseId]
    )

    const latest = existingRows.rows[0] ? mapSettlementRow(existingRows.rows[0]) : null

    if (latest && ['approved', 'issued'].includes(latest.calculationStatus)) {
      throw new PayrollValidationError('Approved final settlements must be cancelled before recalculation.', 409, {
        finalSettlementId: latest.finalSettlementId,
        status: latest.calculationStatus
      })
    }

    const status: FinalSettlementStatus = 'calculated'

    const settlementId = latest && latest.calculationStatus !== 'cancelled'
      ? latest.finalSettlementId
      : `final-settlement-${randomUUID()}`

    const settlementVersion = latest && latest.calculationStatus !== 'cancelled'
      ? latest.settlementVersion
      : (latest?.settlementVersion ?? 0) + 1

    const supersedesId = latest?.calculationStatus === 'cancelled' ? latest.finalSettlementId : null

    const result = await client.query<FinalSettlementRow>(
      latest && latest.calculationStatus !== 'cancelled'
        ? `
          UPDATE greenhouse_payroll.final_settlements
          SET
            compensation_version_id = $6,
            calculation_status = $13,
            readiness_status = $14,
            readiness_has_blockers = $15,
            gross_total = $17,
            deduction_total = $18,
            net_payable = $19,
            source_snapshot_json = $20::jsonb,
            breakdown_json = $21::jsonb,
            explanation_json = $22::jsonb,
            readiness_json = $23::jsonb,
            calculated_at = now(),
            calculated_by_user_id = $24,
            approved_at = NULL,
            approved_by_user_id = NULL,
            cancelled_at = NULL,
            cancelled_by_user_id = NULL,
            cancel_reason = NULL
          WHERE final_settlement_id = $1
          RETURNING *
        `
        : `
          INSERT INTO greenhouse_payroll.final_settlements (
            final_settlement_id,
            offboarding_case_id,
            settlement_version,
            supersedes_final_settlement_id,
            profile_id,
            member_id,
            person_legal_entity_relationship_id,
            legal_entity_organization_id,
            compensation_version_id,
            separation_type,
            contract_type_snapshot,
            pay_regime_snapshot,
            payroll_via_snapshot,
            effective_date,
            last_working_day,
            contract_end_date_snapshot,
            hire_date_snapshot,
            calculation_status,
            readiness_status,
            readiness_has_blockers,
            currency,
            gross_total,
            deduction_total,
            net_payable,
            source_snapshot_json,
            breakdown_json,
            explanation_json,
            readiness_json,
            calculated_at,
            calculated_by_user_id
          )
          VALUES (
            $1, $2, $3, $4, $5, $7, $8, $9, $6,
            $10, $11, $12, $25, $26::date, $27::date, $28::date, $29::date,
            $13, $14, $15, $16, $17, $18, $19,
            $20::jsonb, $21::jsonb, $22::jsonb, $23::jsonb, now(), $24
          )
          RETURNING *
        `,
      [
        settlementId,
        input.offboardingCaseId,
        settlementVersion,
        supersedesId,
        offboardingCase.profileId,
        calculation.sourceSnapshot.compensationVersionId,
        calculation.sourceSnapshot.memberId,
        offboardingCase.personLegalEntityRelationshipId,
        offboardingCase.legalEntityOrganizationId,
        'resignation',
        calculation.sourceSnapshot.contractType,
        'chile',
        status,
        calculation.readiness.status,
        calculation.readiness.hasBlockers,
        'CLP',
        calculation.totals.grossTotal,
        calculation.totals.deductionTotal,
        calculation.totals.netPayable,
        JSON.stringify(calculation.sourceSnapshot),
        JSON.stringify(calculation.breakdown),
        JSON.stringify(calculation.explanation),
        JSON.stringify(calculation.readiness),
        input.actorUserId,
        'internal',
        calculation.sourceSnapshot.effectiveDate,
        calculation.sourceSnapshot.lastWorkingDay,
        calculation.sourceSnapshot.contractEndDate,
        calculation.sourceSnapshot.hireDate
      ]
    )

    const settlement = mapSettlementRow(result.rows[0])
    const eventName = EVENT_TYPES.payrollFinalSettlementCalculated

    await insertSettlementEvent(client, {
      settlement,
      eventType: eventName,
      fromStatus: latest?.calculationStatus ?? null,
      toStatus: settlement.calculationStatus,
      actorUserId: input.actorUserId,
      payload: { readiness: settlement.readinessStatus, sourceRef: input.sourceRef ?? {} }
    })
    await publishSettlementEvent(client, eventName, settlement)

    return settlement
  })
}

export const approveFinalSettlementForCase = async ({
  offboardingCaseId,
  actorUserId
}: {
  offboardingCaseId: string
  actorUserId: string
}) => withTransaction(async client => {
  const rows = await client.query<FinalSettlementRow>(
    `
      SELECT *
      FROM greenhouse_payroll.final_settlements
      WHERE offboarding_case_id = $1
      ORDER BY settlement_version DESC, created_at DESC
      LIMIT 1
      FOR UPDATE
    `,
    [offboardingCaseId]
  )

  const current = rows.rows[0] ? mapSettlementRow(rows.rows[0]) : null

  if (!current) {
    throw new PayrollValidationError('Final settlement not found.', 404)
  }

  if (current.readinessHasBlockers || current.breakdown.some(line => line.taxability === 'needs_review')) {
    throw new PayrollValidationError('Final settlement has readiness blockers.', 409, current.readiness)
  }

  if (!['calculated', 'reviewed'].includes(current.calculationStatus)) {
    throw new PayrollValidationError('Only calculated or reviewed final settlements can be approved.', 409, {
      status: current.calculationStatus
    })
  }

  const result = await client.query<FinalSettlementRow>(
    `
      UPDATE greenhouse_payroll.final_settlements
      SET calculation_status = 'approved',
          approved_at = now(),
          approved_by_user_id = $2
      WHERE final_settlement_id = $1
      RETURNING *
    `,
    [current.finalSettlementId, actorUserId]
  )

  const settlement = mapSettlementRow(result.rows[0])
  const eventName = EVENT_TYPES.payrollFinalSettlementApproved

  await insertSettlementEvent(client, {
    settlement,
    eventType: eventName,
    fromStatus: current.calculationStatus,
    toStatus: settlement.calculationStatus,
    actorUserId
  })
  await publishSettlementEvent(client, eventName, settlement)

  return settlement
})

export const cancelFinalSettlementForCase = async ({
  offboardingCaseId,
  actorUserId,
  reason
}: {
  offboardingCaseId: string
  actorUserId: string
  reason: string
}) => withTransaction(async client => {
  const normalizedReason = normalizeNullableString(reason)

  if (!normalizedReason) {
    throw new PayrollValidationError('Cancel reason is required.', 400)
  }

  const rows = await client.query<FinalSettlementRow>(
    `
      SELECT *
      FROM greenhouse_payroll.final_settlements
      WHERE offboarding_case_id = $1
      ORDER BY settlement_version DESC, created_at DESC
      LIMIT 1
      FOR UPDATE
    `,
    [offboardingCaseId]
  )

  const current = rows.rows[0] ? mapSettlementRow(rows.rows[0]) : null

  if (!current) {
    throw new PayrollValidationError('Final settlement not found.', 404)
  }

  if (current.calculationStatus === 'issued') {
    throw new PayrollValidationError('Issued final settlements cannot be cancelled by V1 API.', 409)
  }

  const result = await client.query<FinalSettlementRow>(
    `
      UPDATE greenhouse_payroll.final_settlements
      SET calculation_status = 'cancelled',
          cancelled_at = now(),
          cancelled_by_user_id = $2,
          cancel_reason = $3
      WHERE final_settlement_id = $1
      RETURNING *
    `,
    [current.finalSettlementId, actorUserId, normalizedReason]
  )

  const settlement = mapSettlementRow(result.rows[0])
  const eventName = EVENT_TYPES.payrollFinalSettlementCancelled

  await insertSettlementEvent(client, {
    settlement,
    eventType: eventName,
    fromStatus: current.calculationStatus,
    toStatus: settlement.calculationStatus,
    actorUserId,
    reason: normalizedReason
  })
  await publishSettlementEvent(client, eventName, settlement, { reason: normalizedReason })

  return settlement
})
