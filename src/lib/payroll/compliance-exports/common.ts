import { createHash } from 'node:crypto'

import { normalizeDocument } from '@/lib/person-legal-profile/normalize'

import type { ChilePayrollComplianceEntry } from './types'

export const toMoney = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : 0

  return Number.isFinite(parsed) ? Math.round(parsed) : 0
}

export const toNullableInt = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null

  return toMoney(value)
}

export const hashText = (value: string): string => createHash('sha256').update(value, 'utf8').digest('hex')

export const stableJsonHash = (value: unknown): string => hashText(JSON.stringify(sortJson(value)))

const sortJson = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortJson)
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => [key, sortJson(child)])
  )
}

export const splitClRut = (rutValue: string): { number: string; checkDigit: string; formatted: string } => {
  const normalized = normalizeDocument('CL_RUT', rutValue)
  const number = normalized.normalized.slice(0, -1)
  const checkDigit = normalized.normalized.slice(-1)

  return {
    number,
    checkDigit,
    formatted: normalized.formatted
  }
}

export const sanitizeDelimitedCell = (value: unknown): string =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[;\r\n\t]+/g, ' ')
    .trim()

export const formatPeriodYm = (year: number, month: number): string => `${year}${String(month).padStart(2, '0')}`

export const buildComplianceFilename = ({
  kind,
  periodId,
  extension
}: {
  kind: 'previred' | 'lre'
  periodId: string
  extension: 'txt' | 'csv'
}) => `payroll-${kind}-${periodId}.${extension}`

export const sumEntries = (entries: ChilePayrollComplianceEntry[]) => ({
  grossTotal: entries.reduce((sum, entry) => sum + entry.grossTotal, 0),
  netTotal: entries.reduce((sum, entry) => sum + entry.netTotal, 0),
  taxableBase: entries.reduce((sum, entry) => sum + entry.chileTaxableBase, 0),
  afpEmployee: entries.reduce((sum, entry) => sum + entry.chileAfpAmount, 0),
  healthEmployee: entries.reduce((sum, entry) => sum + entry.chileHealthAmount, 0),
  unemploymentEmployee: entries.reduce((sum, entry) => sum + entry.chileUnemploymentAmount, 0),
  apvEmployee: entries.reduce((sum, entry) => sum + entry.chileApvAmount, 0),
  sisEmployer: entries.reduce((sum, entry) => sum + entry.chileEmployerSisAmount, 0),
  cesantiaEmployer: entries.reduce((sum, entry) => sum + entry.chileEmployerCesantiaAmount, 0),
  mutualEmployer: entries.reduce((sum, entry) => sum + entry.chileEmployerMutualAmount, 0),
  totalDeductions: entries.reduce((sum, entry) => sum + entry.chileTotalDeductions, 0)
})

export const validateChileComplianceEntries = (entries: ChilePayrollComplianceEntry[]) => {
  const errors: string[] = []

  if (entries.length === 0) {
    errors.push('No Chile dependent payroll entries were found for this closed period.')
  }

  for (const entry of entries) {
    if (entry.currency !== 'CLP') {
      errors.push(`Entry ${entry.entryId} is not CLP.`)
    }

    if (!entry.identityProfileId) {
      errors.push(`Entry ${entry.entryId} has no identity profile.`)
    }

    if (!entry.rutNormalized) {
      errors.push(`Entry ${entry.entryId} has no verified CL_RUT snapshot.`)
    }
  }

  return {
    status: errors.length ? 'failed' as const : 'passed' as const,
    errors
  }
}
