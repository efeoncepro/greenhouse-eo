import { CHILE_ACCIDENT_INSURANCE_ISL_RATE } from '@/lib/payroll/chile-statutory-rates'

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
const PREVIRED_HEALTH_OBLIGATORY_RATE = 0.07
const PREVIRED_LIFE_EXPECTANCY_RATE = 0.009
const PREVIRED_UNEMPLOYMENT_INDEFINIDO_EMPLOYEE_RATE = 0.006
const PREVIRED_UNEMPLOYMENT_INDEFINIDO_EMPLOYER_RATE = 0.024
const PREVIRED_UNEMPLOYMENT_FIXED_TERM_EMPLOYEE_RATE = 0
const PREVIRED_UNEMPLOYMENT_FIXED_TERM_EMPLOYER_RATE = 0.03

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

const roundCurrency = (value: number) => Math.round(Number.isFinite(value) ? value : 0)

const formatPreviredPeriod = (year: number, month: number): string => `${String(month).padStart(2, '0')}${year}`

const resolvePreviredWorkedDays = (): number => 30

const resolvePreviredJornadaCode = (entry: ChilePayrollComplianceEntry): '1' | '2' | null => {
  if (entry.employmentType === 'full_time') return '1'
  if (entry.employmentType === 'part_time') return '2'

  return null
}

const resolveUnemploymentRates = (entry: ChilePayrollComplianceEntry) => {
  if (entry.contractTypeSnapshot === 'plazo_fijo') {
    return {
      employeeRate: PREVIRED_UNEMPLOYMENT_FIXED_TERM_EMPLOYEE_RATE,
      employerRate: PREVIRED_UNEMPLOYMENT_FIXED_TERM_EMPLOYER_RATE
    }
  }

  return {
    employeeRate: PREVIRED_UNEMPLOYMENT_INDEFINIDO_EMPLOYEE_RATE,
    employerRate: PREVIRED_UNEMPLOYMENT_INDEFINIDO_EMPLOYER_RATE
  }
}

type PreviredRegulatoryProjection = {
  afpEmployee: number
  healthEmployee: number
  healthObligatory: number
  healthVoluntary: number
  unemploymentEmployee: number
  apvEmployee: number
  sisEmployer: number
  cesantiaEmployer: number
  islEmployer: number
  mutualEmployer: number
  lifeExpectancy: number
  total: number
}

export const buildPreviredRegulatoryProjection = (
  entry: ChilePayrollComplianceEntry
): PreviredRegulatoryProjection => {
  const taxableBase = roundCurrency(entry.chileTaxableBase)
  const afpRate = entry.previredAfpTotalRate ?? 0
  const sisRate = entry.previredSisRate ?? 0
  const { employeeRate, employerRate } = resolveUnemploymentRates(entry)
  const healthObligatory = roundCurrency(taxableBase * PREVIRED_HEALTH_OBLIGATORY_RATE)
  const healthEmployee = roundCurrency(entry.chileHealthAmount)
  const afpEmployee = roundCurrency(taxableBase * afpRate)
  const sisEmployer = roundCurrency(taxableBase * sisRate)
  const unemploymentEmployee = roundCurrency(taxableBase * employeeRate)
  const cesantiaEmployer = roundCurrency(taxableBase * employerRate)
  const islEmployer = roundCurrency(taxableBase * CHILE_ACCIDENT_INSURANCE_ISL_RATE)
  const lifeExpectancy = roundCurrency(taxableBase * PREVIRED_LIFE_EXPECTANCY_RATE)

  return {
    afpEmployee,
    healthEmployee,
    healthObligatory,
    healthVoluntary: Math.max(0, healthEmployee - healthObligatory),
    unemploymentEmployee,
    apvEmployee: roundCurrency(entry.chileApvAmount),
    sisEmployer,
    cesantiaEmployer,
    islEmployer,
    mutualEmployer: 0,
    lifeExpectancy,
    total: afpEmployee + healthEmployee + unemploymentEmployee + roundCurrency(entry.chileApvAmount) + sisEmployer + cesantiaEmployer + islEmployer + lifeExpectancy
  }
}

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
    const hasAfpContribution = entry.chileAfpAmount > 0 || entry.chileTaxableBase > 0

    if (!workerName.paternalLastName || !workerName.names) {
      errors.push(`Entry ${entry.entryId} is missing Previred worker name parts.`)
    }

    if (!PREVIRED_SEX_CODES.has(sexCode)) {
      errors.push(`Entry ${entry.entryId} is missing explicit Previred sex code (M/F).`)
    }

    if (!PREVIRED_NATIONALITY_CODES.has(nationalityCode)) {
      errors.push(`Entry ${entry.entryId} is missing explicit Previred nationality code (0/1).`)
    }

    const previredWorkedDays = resolvePreviredWorkedDays()

    if (previredWorkedDays < 0 || previredWorkedDays > 30) {
      errors.push(`Entry ${entry.entryId} has Previred working days outside 0..30.`)
    }

    if (entry.chileAfpAmount > 0 && resolvePreviredAfpCode(entry.chileAfpName) === '00') {
      errors.push(`Entry ${entry.entryId} has AFP amounts but no supported Previred AFP code.`)
    }

    if (hasAfpContribution && (entry.previredAfpTotalRate == null || entry.previredAfpTotalRate <= 0)) {
      errors.push(`Entry ${entry.entryId} is missing periodized Previred AFP rate.`)
    }

    if (entry.chileTaxableBase > 0 && (entry.previredSisRate == null || entry.previredSisRate < 0)) {
      errors.push(`Entry ${entry.entryId} is missing periodized Previred SIS rate.`)
    }

    if (!resolvePreviredJornadaCode(entry)) {
      errors.push(`Entry ${entry.entryId} is missing explicit employment_type for Previred jornada.`)
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
  const projection = buildPreviredRegulatoryProjection(entry)
  const jornadaCode = resolvePreviredJornadaCode(entry)

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
  assign(fields, 13, resolvePreviredWorkedDays())
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
  assign(fields, 28, projection.afpEmployee)
  assign(fields, 29, projection.sisEmployer)
  assign(fields, 30, '0')
  assign(fields, 55, '0')
  assign(fields, 64, projection.islEmployer > 0 ? entry.chileTaxableBase : 0)
  assign(fields, 70, isFonasa ? projection.healthObligatory : 0)
  assign(fields, 71, projection.islEmployer)
  assign(fields, 75, healthCode)
  assign(fields, 77, isIsapre ? entry.chileTaxableBase : 0)
  assign(fields, 78, isIsapre ? '1' : 0)
  assign(fields, 79, isIsapre ? projection.healthEmployee : 0)
  assign(fields, 80, isIsapre ? projection.healthObligatory : 0)
  assign(fields, 81, isIsapre ? projection.healthVoluntary : 0)
  assign(fields, 93, jornadaCode ?? '0')
  assign(fields, 94, projection.lifeExpectancy)
  assign(fields, 96, '0')
  assign(fields, 97, '0')
  assign(fields, 98, projection.mutualEmployer)
  assign(fields, 100, entry.chileTaxableBase)
  assign(fields, 101, projection.unemploymentEmployee)
  assign(fields, 102, projection.cesantiaEmployer)

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

  const projectedTotals = snapshot.entries
    .map(buildPreviredRegulatoryProjection)
    .reduce(
      (acc, projection) => ({
        afpEmployee: acc.afpEmployee + projection.afpEmployee,
        healthEmployee: acc.healthEmployee + projection.healthEmployee,
        unemploymentEmployee: acc.unemploymentEmployee + projection.unemploymentEmployee,
        apvEmployee: acc.apvEmployee + projection.apvEmployee,
        sisEmployer: acc.sisEmployer + projection.sisEmployer,
        cesantiaEmployer: acc.cesantiaEmployer + projection.cesantiaEmployer,
        mutualEmployer: acc.mutualEmployer + projection.mutualEmployer,
        islEmployer: acc.islEmployer + projection.islEmployer,
        lifeExpectancy: acc.lifeExpectancy + projection.lifeExpectancy,
        previredTotal: acc.previredTotal + projection.total
      }),
      {
        afpEmployee: 0,
        healthEmployee: 0,
        unemploymentEmployee: 0,
        apvEmployee: 0,
        sisEmployer: 0,
        cesantiaEmployer: 0,
        mutualEmployer: 0,
        islEmployer: 0,
        lifeExpectancy: 0,
        previredTotal: 0
      }
    )

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
      generatedAfpEmployee: projectedTotals.afpEmployee,
      generatedHealthEmployee: projectedTotals.healthEmployee,
      generatedUnemploymentEmployee: projectedTotals.unemploymentEmployee,
      generatedApvEmployee: projectedTotals.apvEmployee,
      generatedSisEmployer: projectedTotals.sisEmployer,
      generatedCesantiaEmployer: projectedTotals.cesantiaEmployer,
      generatedMutualEmployer: projectedTotals.mutualEmployer,
      generatedIslEmployer: projectedTotals.islEmployer,
      generatedLifeExpectancy: projectedTotals.lifeExpectancy,
      previredTotal: projectedTotals.previredTotal,
      sourceSnapshotHash: snapshot.sourceSnapshotHash
    },
    validation
  }
}
