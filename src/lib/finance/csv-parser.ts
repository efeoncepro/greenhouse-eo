import 'server-only'

import { FinanceValidationError } from '@/lib/finance/shared'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BankStatementRow {
  transactionDate: string // YYYY-MM-DD
  description: string
  amount: number // positive = credit, negative = debit
  balance: number | null
  reference: string | null
}

export type BankFormat = 'bci' | 'santander' | 'bancochile' | 'scotiabank'

export const SUPPORTED_BANK_FORMATS: BankFormat[] = ['bci', 'santander', 'bancochile', 'scotiabank']

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const splitLines = (csv: string): string[] =>
  csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(line => line.trim().length > 0)

const parseNumber = (raw: string): number => {
  // Chilean format: 1.234.567 or 1.234.567,89
  // Also handles negative with minus sign or parentheses
  let cleaned = raw.trim()

  if (!cleaned || cleaned === '-' || cleaned === '') {
    return 0
  }

  const isNegative = cleaned.startsWith('(') && cleaned.endsWith(')') || cleaned.startsWith('-')

  cleaned = cleaned.replace(/[()]/g, '').replace(/^-/, '')

  // Detect Chilean format (dots as thousands, comma as decimal)
  if (cleaned.includes('.') && cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.')
  } else if (cleaned.includes(',') && !cleaned.includes('.')) {
    // Comma-only: could be decimal separator
    const parts = cleaned.split(',')

    if (parts.length === 2 && parts[1].length <= 2) {
      cleaned = cleaned.replace(',', '.')
    } else {
      cleaned = cleaned.replace(/,/g, '')
    }
  } else if (cleaned.includes('.')) {
    // Dot-only: check if it's a thousands separator (e.g., 1.234.567)
    const dotParts = cleaned.split('.')

    if (dotParts.length > 2) {
      cleaned = cleaned.replace(/\./g, '')
    }

    // Otherwise, keep as-is (English decimal)
  }

  const value = Number(cleaned)

  if (!Number.isFinite(value)) {
    return 0
  }

  return isNegative ? -value : value
}

/** DD/MM/YYYY → YYYY-MM-DD */
const parseDateSlash = (raw: string): string => {
  const match = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)

  if (!match) {
    throw new FinanceValidationError(`Invalid date format: "${raw}". Expected DD/MM/YYYY.`)
  }

  const [, dd, mm, yyyy] = match

  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

/** DD-MM-YYYY → YYYY-MM-DD */
const parseDateDash = (raw: string): string => {
  const match = raw.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)

  if (!match) {
    throw new FinanceValidationError(`Invalid date format: "${raw}". Expected DD-MM-YYYY.`)
  }

  const [, dd, mm, yyyy] = match

  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

/** MM/DD/YYYY or YYYY-MM-DD → YYYY-MM-DD */
const parseDateEnglish = (raw: string): string => {
  const trimmed = raw.trim()

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }

  // MM/DD/YYYY
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)

  if (!match) {
    throw new FinanceValidationError(`Invalid date format: "${raw}". Expected MM/DD/YYYY or YYYY-MM-DD.`)
  }

  const [, mm, dd, yyyy] = match

  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

const splitCsvLine = (line: string, separator: string): string[] => {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === separator && !inQuotes) {
      fields.push(current)
      current = ''
    } else {
      current += char
    }
  }

  fields.push(current)

  return fields.map(f => f.trim())
}

// ---------------------------------------------------------------------------
// BCI parser
// Headers: Fecha, Descripción, Cargo, Abono, Saldo
// Date format: DD/MM/YYYY, separator: comma
// ---------------------------------------------------------------------------

const parseBCI = (lines: string[]): BankStatementRow[] => {
  if (lines.length < 2) {
    throw new FinanceValidationError('BCI CSV must have a header row and at least one data row.')
  }

  const rows: BankStatementRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const fields = splitCsvLine(lines[i], ',')

    if (fields.length < 5) continue

    const [fecha, descripcion, cargo, abono, saldo] = fields
    const debit = parseNumber(cargo)
    const credit = parseNumber(abono)
    const amount = credit > 0 ? credit : -Math.abs(debit)

    rows.push({
      transactionDate: parseDateSlash(fecha),
      description: descripcion,
      amount,
      balance: parseNumber(saldo) || null,
      reference: null
    })
  }

  return rows
}

// ---------------------------------------------------------------------------
// Santander parser
// Headers: Fecha, Nro Documento, Descripción, Cargo, Abono, Saldo
// Date format: DD/MM/YYYY, separator: semicolon
// ---------------------------------------------------------------------------

const parseSantander = (lines: string[]): BankStatementRow[] => {
  if (lines.length < 2) {
    throw new FinanceValidationError('Santander CSV must have a header row and at least one data row.')
  }

  const rows: BankStatementRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const fields = splitCsvLine(lines[i], ';')

    if (fields.length < 6) continue

    const [fecha, nroDocumento, descripcion, cargo, abono, saldo] = fields
    const debit = parseNumber(cargo)
    const credit = parseNumber(abono)
    const amount = credit > 0 ? credit : -Math.abs(debit)

    rows.push({
      transactionDate: parseDateSlash(fecha),
      description: descripcion,
      amount,
      balance: parseNumber(saldo) || null,
      reference: nroDocumento || null
    })
  }

  return rows
}

// ---------------------------------------------------------------------------
// Banco de Chile parser
// Headers: Fecha, Descripción, Monto, Saldo
// Date format: DD-MM-YYYY, separator: comma
// Monto: negative = debit, positive = credit
// ---------------------------------------------------------------------------

const parseBancoChile = (lines: string[]): BankStatementRow[] => {
  if (lines.length < 2) {
    throw new FinanceValidationError('BancoChile CSV must have a header row and at least one data row.')
  }

  const rows: BankStatementRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const fields = splitCsvLine(lines[i], ',')

    if (fields.length < 4) continue

    const [fecha, descripcion, monto, saldo] = fields

    rows.push({
      transactionDate: parseDateDash(fecha),
      description: descripcion,
      amount: parseNumber(monto),
      balance: parseNumber(saldo) || null,
      reference: null
    })
  }

  return rows
}

// ---------------------------------------------------------------------------
// Scotiabank parser
// Headers: Date, Description, Debit, Credit, Balance
// Date format: MM/DD/YYYY or YYYY-MM-DD, separator: comma
// ---------------------------------------------------------------------------

const parseScotiabank = (lines: string[]): BankStatementRow[] => {
  if (lines.length < 2) {
    throw new FinanceValidationError('Scotiabank CSV must have a header row and at least one data row.')
  }

  const rows: BankStatementRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const fields = splitCsvLine(lines[i], ',')

    if (fields.length < 5) continue

    const [date, description, debit, credit, balance] = fields
    const debitAmt = parseNumber(debit)
    const creditAmt = parseNumber(credit)
    const amount = creditAmt > 0 ? creditAmt : -Math.abs(debitAmt)

    rows.push({
      transactionDate: parseDateEnglish(date),
      description,
      amount,
      balance: parseNumber(balance) || null,
      reference: null
    })
  }

  return rows
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

const parsers: Record<BankFormat, (lines: string[]) => BankStatementRow[]> = {
  bci: parseBCI,
  santander: parseSantander,
  bancochile: parseBancoChile,
  scotiabank: parseScotiabank
}

export const parseBankStatement = (csvContent: string, bankFormat: string): BankStatementRow[] => {
  const format = bankFormat.toLowerCase().trim() as BankFormat

  if (!SUPPORTED_BANK_FORMATS.includes(format)) {
    throw new FinanceValidationError(
      `Unsupported bank format: "${bankFormat}". Supported: ${SUPPORTED_BANK_FORMATS.join(', ')}`
    )
  }

  const lines = splitLines(csvContent)

  if (lines.length === 0) {
    throw new FinanceValidationError('CSV file is empty.')
  }

  const rows = parsers[format](lines)

  if (rows.length === 0) {
    throw new FinanceValidationError('No valid rows found in CSV file.')
  }

  return rows
}
