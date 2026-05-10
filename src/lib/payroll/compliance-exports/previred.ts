import { calculatePreviredEntryBreakdown } from '@/lib/finance/payment-obligations/calculate-previred-total'

import {
  buildComplianceFilename,
  hashText,
  sanitizeDelimitedCell,
  splitClRut,
  sumEntries,
  validateChileComplianceEntries
} from './common'
import { PREVIRED_PLANILLA_SPEC } from './specs'
import type { ChileComplianceArtifact, ChileCompliancePeriodSnapshot, ChilePayrollComplianceEntry } from './types'

const PREVIRED_FIELD_COUNT = 105
const PREVIRED_SEX_CODES = new Set(['M', 'F'])
const PREVIRED_NATIONALITY_CODES = new Set(['0', '1'])

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

const HEALTH_INSTITUTION_CODES: Record<string, string> = {
  banmedica: '01',
  banmedica_s_a: '01',
  consalud: '02',
  vidatres: '03',
  vida_tres: '03',
  colmena: '04',
  cruz_blanca: '05',
  isapre_cruz_blanca_s_a: '05',
  fonasa: '07',
  nueva_masvida: '10',
  masvida: '10',
  isapre_de_codelco_ltda: '11',
  codelco: '11',
  isapre_banco_estado: '12',
  banco_estado: '12',
  cruz_del_norte: '25'
}

export const resolvePreviredAfpCode = (afpName: string | null): string =>
  AFP_CODES[normalizeInstitutionKey(afpName)] ?? '00'

export const resolvePreviredHealthCode = (healthSystem: string | null): string =>
  HEALTH_INSTITUTION_CODES[normalizeInstitutionKey(healthSystem)] ?? '00'

const resolveEntryHealthCode = (entry: ChilePayrollComplianceEntry): string =>
  sanitizeDelimitedCell(entry.previredHealthInstitutionCode) || resolvePreviredHealthCode(entry.chileHealthSystem)

const assign = (fields: string[], oneBasedIndex: number, value: unknown) => {
  fields[oneBasedIndex - 1] = sanitizeDelimitedCell(value)
}

const formatPreviredPeriod = (year: number, month: number): string => `${String(month).padStart(2, '0')}${year}`

const splitPreviredWorkerName = (entry: ChilePayrollComplianceEntry) => {
  const explicitFirstName = sanitizeDelimitedCell(entry.memberFirstName)
  const explicitLastName = sanitizeDelimitedCell(entry.memberLastName)

  if (explicitFirstName && explicitLastName) {
    const lastNameParts = explicitLastName.split(/\s+/).filter(Boolean)

    return {
      paternalLastName: lastNameParts[0] ?? explicitLastName,
      maternalLastName: lastNameParts.slice(1).join(' '),
      names: explicitFirstName
    }
  }

  const sourceName = sanitizeDelimitedCell(entry.memberLegalName || entry.memberDisplayName)
  const parts = sourceName.split(/\s+/).filter(Boolean)

  if (parts.length >= 3) {
    return {
      paternalLastName: parts.at(-2) ?? '',
      maternalLastName: parts.at(-1) ?? '',
      names: parts.slice(0, -2).join(' ')
    }
  }

  if (parts.length === 2) {
    return {
      paternalLastName: parts[1] ?? '',
      maternalLastName: '',
      names: parts[0] ?? ''
    }
  }

  return {
    paternalLastName: parts[0] ?? sourceName,
    maternalLastName: '',
    names: parts[0] ?? sourceName
  }
}

const validatePreviredEntries = (entries: ChilePayrollComplianceEntry[]) => {
  const baseValidation = validateChileComplianceEntries(entries)
  const errors = [...baseValidation.errors]

  for (const entry of entries) {
    const workerName = splitPreviredWorkerName(entry)
    const sexCode = sanitizeDelimitedCell(entry.previredSexCode)
    const nationalityCode = sanitizeDelimitedCell(entry.previredNationalityCode)
    const healthCode = resolveEntryHealthCode(entry)
    const hasHealthContribution = entry.chileHealthAmount > 0 || entry.chileHealthObligatoriaAmount > 0

    if (!workerName.paternalLastName || !workerName.names) {
      errors.push(`Entry ${entry.entryId} is missing Previred worker name parts.`)
    }

    if (!PREVIRED_SEX_CODES.has(sexCode)) {
      errors.push(`Entry ${entry.entryId} is missing explicit Previred sex code (M/F).`)
    }

    if (!PREVIRED_NATIONALITY_CODES.has(nationalityCode)) {
      errors.push(`Entry ${entry.entryId} is missing explicit Previred nationality code (0/1).`)
    }

    if ((entry.workingDaysInPeriod ?? 30) < 0 || (entry.workingDaysInPeriod ?? 30) > 30) {
      errors.push(`Entry ${entry.entryId} has Previred working days outside 0..30.`)
    }

    if (entry.chileAfpAmount > 0 && resolvePreviredAfpCode(entry.chileAfpName) === '00') {
      errors.push(`Entry ${entry.entryId} has AFP amounts but no supported Previred AFP code.`)
    }

    if (hasHealthContribution && healthCode === '00') {
      errors.push(`Entry ${entry.entryId} has health contribution but no explicit Previred health institution code.`)
    }
  }

  return {
    status: errors.length ? 'failed' as const : 'passed' as const,
    errors
  }
}

export const buildPreviredRow = (
  snapshot: ChileCompliancePeriodSnapshot,
  entry: ChilePayrollComplianceEntry
): string => {
  const rut = splitClRut(entry.rutNormalized)
  const workerName = splitPreviredWorkerName(entry)
  const previredPeriod = formatPreviredPeriod(snapshot.year, snapshot.month)
  const healthCode = resolveEntryHealthCode(entry)
  const isFonasa = healthCode === '07'
  const isIsapre = healthCode !== '00' && !isFonasa

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
  assign(fields, 3, workerName.paternalLastName)
  assign(fields, 4, workerName.maternalLastName)
  assign(fields, 5, workerName.names)
  assign(fields, 6, entry.previredSexCode)
  assign(fields, 7, entry.previredNationalityCode)
  assign(fields, 8, '01')
  assign(fields, 9, previredPeriod)
  assign(fields, 10, previredPeriod)
  assign(fields, 11, resolvePreviredAfpCode(entry.chileAfpName) === '00' ? 'SIP' : 'AFP')
  assign(fields, 12, '0')
  assign(fields, 13, entry.workingDaysInPeriod ?? 30)
  assign(fields, 14, '00')
  assign(fields, 15, '0')
  assign(fields, 18, 'D')
  assign(fields, 19, '0')
  assign(fields, 20, '0')
  assign(fields, 21, '0')
  assign(fields, 22, '0')
  assign(fields, 23, '0')
  assign(fields, 24, '0')
  assign(fields, 25, 'N')

  // Cotizaciones previsionales. Positions are kept declarative and versioned
  // under PREVIRED_PLANILLA_SPEC; zero/blank fields remain explicit separators.
  assign(fields, 26, resolvePreviredAfpCode(entry.chileAfpName))
  assign(fields, 27, entry.chileTaxableBase)
  assign(fields, 28, breakdown.afpEmployee)
  assign(fields, 29, breakdown.sisEmployer)
  assign(fields, 30, '0')
  assign(fields, 55, '0')
  assign(fields, 70, isFonasa ? breakdown.healthEmployee : 0)
  assign(fields, 71, '0')
  assign(fields, 75, healthCode)
  assign(fields, 77, isIsapre ? entry.chileTaxableBase : 0)
  assign(fields, 78, isIsapre ? '1' : 0)
  assign(fields, 79, isIsapre ? entry.chileHealthAmount : 0)
  assign(fields, 80, isIsapre ? entry.chileHealthObligatoriaAmount : 0)
  assign(fields, 81, isIsapre ? entry.chileHealthVoluntariaAmount : 0)
  assign(fields, 96, '0')
  assign(fields, 97, entry.chileTaxableBase)
  assign(fields, 98, breakdown.mutualEmployer)
  assign(fields, 100, entry.chileTaxableBase)
  assign(fields, 101, breakdown.unemploymentEmployee)
  assign(fields, 102, breakdown.cesantiaEmployer)

  return fields.join(PREVIRED_PLANILLA_SPEC.delimiter)
}

export const buildPreviredPlanillaArtifact = (
  snapshot: ChileCompliancePeriodSnapshot
): ChileComplianceArtifact => {
  const validation = validatePreviredEntries(snapshot.entries)

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
