import { calculatePreviredEntryBreakdown } from '@/lib/finance/payment-obligations/calculate-previred-total'

import {
  buildComplianceFilename,
  formatPeriodYm,
  hashText,
  sanitizeDelimitedCell,
  splitClRut,
  sumEntries,
  validateChileComplianceEntries
} from './common'
import { PREVIRED_PLANILLA_SPEC } from './specs'
import type { ChileComplianceArtifact, ChileCompliancePeriodSnapshot, ChilePayrollComplianceEntry } from './types'

const PREVIRED_FIELD_COUNT = 105

const AFP_CODES: Record<string, string> = {
  capital: '33',
  cuprum: '03',
  habitat: '05',
  modelo: '34',
  planvital: '29',
  plan_vital: '29',
  provida: '08',
  uno: '35'
}

const normalizeInstitutionKey = (value: string | null) =>
  sanitizeDelimitedCell(value)
    .toLowerCase()
    .replace(/\s+/g, '_')

export const resolvePreviredAfpCode = (afpName: string | null): string =>
  AFP_CODES[normalizeInstitutionKey(afpName)] ?? '00'

const assign = (fields: string[], oneBasedIndex: number, value: unknown) => {
  fields[oneBasedIndex - 1] = sanitizeDelimitedCell(value)
}

export const buildPreviredRow = (
  snapshot: ChileCompliancePeriodSnapshot,
  entry: ChilePayrollComplianceEntry
): string => {
  const rut = splitClRut(entry.rutNormalized)

  const breakdown = calculatePreviredEntryBreakdown({
    chile_afp_amount: entry.chileAfpAmount,
    chile_health_amount: entry.chileHealthAmount,
    chile_unemployment_amount: entry.chileUnemploymentAmount,
    chile_apv_amount: entry.chileApvAmount,
    chile_employer_cesantia_amount: entry.chileEmployerCesantiaAmount,
    chile_employer_mutual_amount: entry.chileEmployerMutualAmount,
    chile_employer_sis_amount: entry.chileEmployerSisAmount
  })

  const fields = Array.from({ length: PREVIRED_FIELD_COUNT }, () => '')

  assign(fields, 1, rut.number)
  assign(fields, 2, rut.checkDigit)
  assign(fields, 3, entry.memberDisplayName)
  assign(fields, 4, '')
  assign(fields, 5, '')
  assign(fields, 6, '0')
  assign(fields, 7, '')
  assign(fields, 8, '01')
  assign(fields, 9, '0')
  assign(fields, 10, formatPeriodYm(snapshot.year, snapshot.month))
  assign(fields, 11, entry.workingDaysInPeriod ?? 30)
  assign(fields, 12, '0')
  assign(fields, 13, entry.chileTaxableBase)
  assign(fields, 14, '00')
  assign(fields, 15, '0')
  assign(fields, 16, '0')
  assign(fields, 17, '0')
  assign(fields, 18, entry.daysAbsent ?? 0)
  assign(fields, 19, entry.daysOnLeave ?? 0)
  assign(fields, 20, entry.daysOnUnpaidLeave ?? 0)

  // Cotizaciones previsionales. Positions are kept declarative and versioned
  // under PREVIRED_PLANILLA_SPEC; zero/blank fields remain explicit separators.
  assign(fields, 26, resolvePreviredAfpCode(entry.chileAfpName))
  assign(fields, 27, entry.chileTaxableBase)
  assign(fields, 28, breakdown.afpEmployee)
  assign(fields, 29, breakdown.sisEmployer)
  assign(fields, 30, breakdown.apvEmployee)
  assign(fields, 70, entry.chileHealthSystem?.toLowerCase() === 'fonasa' ? breakdown.healthEmployee : 0)
  assign(fields, 71, breakdown.mutualEmployer)
  assign(fields, 75, entry.chileHealthSystem?.toLowerCase() === 'isapre' ? sanitizeDelimitedCell(entry.chileHealthSystem) : '')
  assign(fields, 77, entry.chileHealthSystem?.toLowerCase() === 'isapre' ? entry.chileTaxableBase : 0)
  assign(fields, 80, entry.chileHealthSystem?.toLowerCase() === 'isapre' ? breakdown.healthEmployee : 0)
  assign(fields, 90, breakdown.unemploymentEmployee)
  assign(fields, 91, breakdown.cesantiaEmployer)

  return fields.join(PREVIRED_PLANILLA_SPEC.delimiter)
}

export const buildPreviredPlanillaArtifact = (
  snapshot: ChileCompliancePeriodSnapshot
): ChileComplianceArtifact => {
  const validation = validateChileComplianceEntries(snapshot.entries)

  const rows = validation.status === 'passed'
    ? snapshot.entries.map(entry => buildPreviredRow(snapshot, entry))
    : []

  const text = `${rows.join('\r\n')}${rows.length ? '\r\n' : ''}`
  const totals = sumEntries(snapshot.entries)

  const previredTotal =
    totals.afpEmployee +
    totals.healthEmployee +
    totals.unemploymentEmployee +
    totals.apvEmployee +
    totals.sisEmployer +
    totals.cesantiaEmployer +
    totals.mutualEmployer

  const artifactSha256 = hashText(text)

  return {
    kind: 'previred',
    spec: PREVIRED_PLANILLA_SPEC,
    filename: buildComplianceFilename({ kind: 'previred', periodId: snapshot.periodId, extension: 'txt' }),
    contentType: 'text/plain; charset=us-ascii',
    encoding: PREVIRED_PLANILLA_SPEC.encoding,
    text,
    artifactSha256,
    recordCount: rows.length,
    totals: {
      ...totals,
      previredTotal,
      sourceSnapshotHash: snapshot.sourceSnapshotHash
    },
    validation
  }
}
