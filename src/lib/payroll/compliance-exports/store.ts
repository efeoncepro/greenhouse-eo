import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'
import { readPersonLegalSnapshot } from '@/lib/person-legal-profile/snapshots'
import { normalizeDocument } from '@/lib/person-legal-profile/normalize'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { PayrollValidationError } from '@/lib/payroll/shared'

import { stableJsonHash, toMoney, toNullableInt } from './common'
import type {
  ChileComplianceArtifact,
  ChileComplianceExportKind,
  ChileCompliancePeriodSnapshot,
  ChilePayrollComplianceEntry
} from './types'

interface PeriodRow {
  period_id: string
  year: number
  month: number
  status: string
}

interface EntryRow {
  entry_id: string
  period_id: string
  member_id: string
  member_display_name: string | null
  member_first_name: string | null
  member_last_name: string | null
  member_legal_name: string | null
  primary_email: string | null
  identity_profile_id: string | null
  employment_type: string | null
  previred_sex_code: string | null
  previred_nationality_code: string | null
  previred_health_institution_code: string | null
  previred_afp_total_rate: number | string | null
  previred_sis_rate: number | string | null
  contract_type_snapshot: string | null
  pay_regime: string
  payroll_via: string | null
  currency: string
  base_salary: number | string | null
  gross_total: number | string | null
  net_total: number | string | null
  chile_afp_name: string | null
  chile_afp_amount: number | string | null
  chile_afp_cotizacion_amount: number | string | null
  chile_afp_comision_amount: number | string | null
  chile_health_system: string | null
  chile_health_amount: number | string | null
  chile_health_obligatoria_amount: number | string | null
  chile_health_voluntaria_amount: number | string | null
  chile_unemployment_amount: number | string | null
  chile_tax_amount: number | string | null
  chile_apv_amount: number | string | null
  chile_employer_sis_amount: number | string | null
  chile_employer_cesantia_amount: number | string | null
  chile_employer_mutual_amount: number | string | null
  chile_total_deductions: number | string | null
  chile_taxable_base: number | string | null
  working_days_in_period: number | string | null
  days_absent: number | string | null
  days_on_leave: number | string | null
  days_on_unpaid_leave: number | string | null
  updated_at: Date | string | null
}

const CLOSED_PAYROLL_PERIOD_STATUSES = new Set(['approved', 'exported'])

const toRate = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : null

  return parsed != null && Number.isFinite(parsed) ? parsed : null
}

const loadClosedPeriod = async (client: PoolClient, periodId: string): Promise<PeriodRow> => {
  const result = await client.query<PeriodRow>(
    `
      SELECT period_id, year, month, status
      FROM greenhouse_payroll.payroll_periods
      WHERE period_id = $1
      LIMIT 1
    `,
    [periodId]
  )

  const period = result.rows[0]

  if (!period) {
    throw new PayrollValidationError('Payroll period not found.', 404)
  }

  if (!CLOSED_PAYROLL_PERIOD_STATUSES.has(period.status)) {
    throw new PayrollValidationError('Compliance exports require an approved or exported payroll period.', 409, {
      periodId,
      status: period.status
    })
  }

  return period
}

const loadChileDependentEntryRows = async (client: PoolClient, periodId: string): Promise<EntryRow[]> => {
  const result = await client.query<EntryRow>(
    `
      SELECT
        e.entry_id,
        e.period_id,
        e.member_id,
        e.member_display_name,
        m.first_name AS member_first_name,
        m.last_name AS member_last_name,
        m.legal_name AS member_legal_name,
        m.primary_email,
        m.identity_profile_id,
        m.employment_type,
        pwp.sex_code AS previred_sex_code,
        pwp.nationality_code AS previred_nationality_code,
        pwp.health_institution_code AS previred_health_institution_code,
        car.total_rate AS previred_afp_total_rate,
        cpi.sis_rate AS previred_sis_rate,
        e.contract_type_snapshot,
        e.pay_regime,
        e.payroll_via,
        e.currency,
        e.base_salary,
        e.gross_total,
        e.net_total,
        e.chile_afp_name,
        e.chile_afp_amount,
        e.chile_afp_cotizacion_amount,
        e.chile_afp_comision_amount,
        e.chile_health_system,
        e.chile_health_amount,
        e.chile_health_obligatoria_amount,
        e.chile_health_voluntaria_amount,
        e.chile_unemployment_amount,
        e.chile_tax_amount,
        e.chile_apv_amount,
        e.chile_employer_sis_amount,
        e.chile_employer_cesantia_amount,
        e.chile_employer_mutual_amount,
        e.chile_total_deductions,
        e.chile_taxable_base,
        e.working_days_in_period,
        e.days_absent,
        e.days_on_leave,
        e.days_on_unpaid_leave,
        e.updated_at
      FROM greenhouse_payroll.payroll_entries e
      LEFT JOIN greenhouse_core.members m ON m.member_id = e.member_id
      LEFT JOIN greenhouse_payroll.chile_previred_worker_profiles pwp ON pwp.profile_id = m.identity_profile_id
      LEFT JOIN greenhouse_payroll.payroll_periods pp ON pp.period_id = e.period_id
      LEFT JOIN greenhouse_payroll.chile_previred_indicators cpi
        ON cpi.period_year = pp.year
       AND cpi.period_month = pp.month
      LEFT JOIN greenhouse_payroll.chile_afp_rates car
        ON car.period_year = pp.year
       AND car.period_month = pp.month
       AND car.is_active = TRUE
       AND lower(regexp_replace(car.afp_name, '\\s+', '', 'g')) =
           lower(regexp_replace(COALESCE(e.chile_afp_name, ''), '\\s+', '', 'g'))
      WHERE e.period_id = $1
        AND e.is_active = TRUE
        AND e.pay_regime = 'chile'
        AND COALESCE(e.payroll_via, 'internal') = 'internal'
        AND COALESCE(e.contract_type_snapshot, '') IN ('indefinido', 'plazo_fijo')
      ORDER BY e.member_display_name NULLS LAST, e.member_id
    `,
    [periodId]
  )

  return result.rows
}

const mapEntryRow = async (
  row: EntryRow,
  client: PoolClient,
  generatedBy: string | null
): Promise<ChilePayrollComplianceEntry> => {
  let rutNormalized = ''

  if (row.identity_profile_id) {
    const snapshot = await readPersonLegalSnapshot(
      {
        profileId: row.identity_profile_id,
        useCase: 'payroll_receipt',
        documentType: 'CL_RUT',
        countryCode: 'CL',
        invokedByUserId: generatedBy,
        invokedByService: 'payroll_compliance_exports'
      },
      client
    )

    if (snapshot.document?.valueFull) {
      rutNormalized = normalizeDocument('CL_RUT', snapshot.document.valueFull).normalized
    }
  }

  return {
    entryId: row.entry_id,
    periodId: row.period_id,
    memberId: row.member_id,
    memberDisplayName: row.member_display_name || row.member_id,
    memberFirstName: row.member_first_name,
    memberLastName: row.member_last_name,
    memberLegalName: row.member_legal_name,
    memberEmail: row.primary_email,
    identityProfileId: row.identity_profile_id || '',
    employmentType: row.employment_type,
    previredSexCode: row.previred_sex_code,
    previredNationalityCode: row.previred_nationality_code,
    previredHealthInstitutionCode: row.previred_health_institution_code,
    previredAfpTotalRate: toRate(row.previred_afp_total_rate),
    previredSisRate: toRate(row.previred_sis_rate),
    rutNormalized,
    contractTypeSnapshot: row.contract_type_snapshot,
    payRegime: row.pay_regime,
    payrollVia: row.payroll_via,
    currency: row.currency,
    baseSalary: toMoney(row.base_salary),
    grossTotal: toMoney(row.gross_total),
    netTotal: toMoney(row.net_total),
    chileAfpName: row.chile_afp_name,
    chileAfpAmount: toMoney(row.chile_afp_amount),
    chileAfpCotizacionAmount: toMoney(row.chile_afp_cotizacion_amount),
    chileAfpComisionAmount: toMoney(row.chile_afp_comision_amount),
    chileHealthSystem: row.chile_health_system,
    chileHealthAmount: toMoney(row.chile_health_amount),
    chileHealthObligatoriaAmount: toMoney(row.chile_health_obligatoria_amount),
    chileHealthVoluntariaAmount: toMoney(row.chile_health_voluntaria_amount),
    chileUnemploymentAmount: toMoney(row.chile_unemployment_amount),
    chileTaxAmount: toMoney(row.chile_tax_amount),
    chileApvAmount: toMoney(row.chile_apv_amount),
    chileEmployerSisAmount: toMoney(row.chile_employer_sis_amount),
    chileEmployerCesantiaAmount: toMoney(row.chile_employer_cesantia_amount),
    chileEmployerMutualAmount: toMoney(row.chile_employer_mutual_amount),
    chileTotalDeductions: toMoney(row.chile_total_deductions),
    chileTaxableBase: toMoney(row.chile_taxable_base || row.gross_total),
    workingDaysInPeriod: toNullableInt(row.working_days_in_period),
    daysAbsent: toNullableInt(row.days_absent),
    daysOnLeave: toNullableInt(row.days_on_leave),
    daysOnUnpaidLeave: toNullableInt(row.days_on_unpaid_leave)
  }
}

export const loadChileCompliancePeriodSnapshot = async (
  input: {
    periodId: string
    generatedBy?: string | null
    spaceId?: string | null
  },
  client: PoolClient
): Promise<ChileCompliancePeriodSnapshot> => {
  const period = await loadClosedPeriod(client, input.periodId)
  const rows = await loadChileDependentEntryRows(client, input.periodId)
  const entries = await Promise.all(rows.map(row => mapEntryRow(row, client, input.generatedBy ?? null)))

  const sourceSnapshotHash = stableJsonHash({
    period,
    entries: entries.map(entry => ({
      entryId: entry.entryId,
      memberId: entry.memberId,
      rutNormalized: entry.rutNormalized,
      totals: {
        grossTotal: entry.grossTotal,
        netTotal: entry.netTotal,
        chileTaxableBase: entry.chileTaxableBase,
        chileAfpAmount: entry.chileAfpAmount,
        chileHealthAmount: entry.chileHealthAmount,
        chileUnemploymentAmount: entry.chileUnemploymentAmount,
        chileApvAmount: entry.chileApvAmount,
        chileEmployerSisAmount: entry.chileEmployerSisAmount,
        chileEmployerCesantiaAmount: entry.chileEmployerCesantiaAmount,
        chileEmployerMutualAmount: entry.chileEmployerMutualAmount,
        previredAfpTotalRate: entry.previredAfpTotalRate,
        previredSisRate: entry.previredSisRate
      }
    }))
  })

  return {
    periodId: period.period_id,
    year: period.year,
    month: period.month,
    status: period.status,
    generatedBy: input.generatedBy ?? null,
    spaceId: input.spaceId ?? null,
    entries,
    sourceSnapshotHash
  }
}

export const registerChileComplianceExportArtifact = async (
  input: {
    periodId: string
    artifact: ChileComplianceArtifact
    sourceSnapshotHash: string
    generatedBy?: string | null
    spaceId?: string | null
  },
  client: PoolClient
) => {
  const artifactId = `payroll-compliance-export-${randomUUID()}`

  await client.query(
    `
      INSERT INTO greenhouse_payroll.compliance_export_artifacts (
        artifact_id,
        period_id,
        space_id,
        export_kind,
        spec_version,
        spec_source_url,
        source_snapshot_hash,
        artifact_sha256,
        filename,
        content_type,
        encoding,
        record_count,
        totals_json,
        validation_status,
        validation_errors_json,
        generated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13::jsonb, $14, $15::jsonb, $16
      )
    `,
    [
      artifactId,
      input.periodId,
      input.spaceId ?? null,
      input.artifact.kind,
      input.artifact.spec.specVersion,
      input.artifact.spec.sourceUrl,
      input.sourceSnapshotHash,
      input.artifact.artifactSha256,
      input.artifact.filename,
      input.artifact.contentType,
      input.artifact.encoding,
      input.artifact.recordCount,
      JSON.stringify(input.artifact.totals),
      input.artifact.validation.status,
      JSON.stringify(input.artifact.validation.errors),
      input.generatedBy ?? null
    ]
  )

  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.payrollComplianceExportArtifact,
      aggregateId: artifactId,
      eventType:
        input.artifact.kind === 'previred'
          ? EVENT_TYPES.payrollExportPreviredGenerated
          : EVENT_TYPES.payrollExportLreGenerated,
      payload: {
        schemaVersion: 1,
        artifactId,
        periodId: input.periodId,
        exportKind: input.artifact.kind,
        specVersion: input.artifact.spec.specVersion,
        sourceSnapshotHash: input.sourceSnapshotHash,
        artifactSha256: input.artifact.artifactSha256,
        recordCount: input.artifact.recordCount,
        validationStatus: input.artifact.validation.status
      }
    },
    client
  )

  return artifactId
}

export const generateAndRegisterChileComplianceExport = async (
  input: {
    periodId: string
    generatedBy?: string | null
    spaceId?: string | null
    kind: ChileComplianceExportKind
    generate: (snapshot: ChileCompliancePeriodSnapshot) => ChileComplianceArtifact
  }
) =>
  withTransaction(async client => {
    const snapshot = await loadChileCompliancePeriodSnapshot(input, client)
    const artifact = input.generate(snapshot)

    if (artifact.validation.status !== 'passed') {
      throw new PayrollValidationError('Compliance export validation failed.', 422, {
        periodId: input.periodId,
        exportKind: input.kind,
        errors: artifact.validation.errors
      })
    }

    const artifactId = await registerChileComplianceExportArtifact(
      {
        periodId: input.periodId,
        artifact,
        sourceSnapshotHash: snapshot.sourceSnapshotHash,
        generatedBy: input.generatedBy ?? null,
        spaceId: input.spaceId ?? null
      },
      client
    )

    return {
      artifactId,
      snapshot,
      artifact
    }
  })
