import 'server-only'

import { FinanceValidationError } from '@/lib/finance/shared'

import { detectBancoChileCuentaVistaText, parseBancoChileCuentaVistaText } from './bancochile-cuenta-vista-text'
import { detectGlobal66Xls, parseGlobal66Xls } from './global66-xls'
import { detectSantanderCartolaXlsx, parseSantanderCartolaXlsx } from './santander-cartola-xlsx'
import { detectSantanderTcEstadoCuentaText, parseSantanderTcEstadoCuentaText } from './santander-tc-estado-cuenta-text'
import { detectSantanderTcMovimientosXlsx, parseSantanderTcMovimientosXlsx } from './santander-tc-movimientos-xlsx'
import { BANK_STATEMENT_SOURCE_FORMATS, type BankStatementSourceFormat, type ParsedStatement } from './types'
import { readWorkbookGrids, type WorkbookGrid } from './xlsx-grid'

export * from './types'

const SPREADSHEET_EXTENSION = /\.(xlsx?|xlsm)$/i

const TEXT_FORMATS: BankStatementSourceFormat[] = ['santander_tc_estado_cuenta_text', 'bancochile_cuenta_vista_text']

const isSpreadsheetFormat = (format: BankStatementSourceFormat): boolean => !TEXT_FORMATS.includes(format)

const detectSpreadsheetFormat = (sheets: WorkbookGrid[]): BankStatementSourceFormat | null => {
  if (detectSantanderCartolaXlsx(sheets)) return 'santander_cartola_xlsx'
  if (detectSantanderTcMovimientosXlsx(sheets)) return 'santander_tc_movimientos_xlsx'
  if (detectGlobal66Xls(sheets)) return 'global66_xls'

  return null
}

const parseSpreadsheet = (sheets: WorkbookGrid[], format: BankStatementSourceFormat): ParsedStatement => {
  switch (format) {
    case 'santander_cartola_xlsx':
      return parseSantanderCartolaXlsx(sheets)
    case 'santander_tc_movimientos_xlsx':
      return parseSantanderTcMovimientosXlsx(sheets)
    case 'global66_xls':
      return parseGlobal66Xls(sheets)
    default:
      throw new FinanceValidationError(`El formato ${format} no es una planilla.`)
  }
}

export interface ParseBankStatementFileInput {
  /** contenido del archivo (XLS/XLSX) o del texto (PDF extraído) */
  content: Buffer | Uint8Array | string
  fileName?: string | null
  /** si se omite, se detecta por el contenido */
  format?: BankStatementSourceFormat | string | null
}

export const assertBankStatementSourceFormat = (value: unknown): BankStatementSourceFormat => {
  const format = String(value ?? '').trim() as BankStatementSourceFormat

  if (!BANK_STATEMENT_SOURCE_FORMATS.includes(format)) {
    throw new FinanceValidationError(
      `Formato de extracto no soportado: "${value}". Soportados: ${BANK_STATEMENT_SOURCE_FORMATS.join(', ')}`
    )
  }

  return format
}

/**
 * Punto de entrada canónico: archivo/texto → filas de extracto. Lo consumen
 * `POST /api/finance/reconciliation/[id]/statements` (modo archivo) y la CLI
 * `pnpm finance:import-statement`; la UI es solo un cliente.
 */
export const parseBankStatementFile = (input: ParseBankStatementFileInput): ParsedStatement => {
  const explicitFormat = input.format ? assertBankStatementSourceFormat(input.format) : null

  if (typeof input.content === 'string') {
    const format = explicitFormat
      ?? (detectSantanderTcEstadoCuentaText(input.content)
        ? 'santander_tc_estado_cuenta_text'
        : detectBancoChileCuentaVistaText(input.content)
          ? 'bancochile_cuenta_vista_text'
          : null)

    if (format === 'santander_tc_estado_cuenta_text') return parseSantanderTcEstadoCuentaText(input.content)
    if (format === 'bancochile_cuenta_vista_text') return parseBancoChileCuentaVistaText(input.content)

    throw new FinanceValidationError(
      'No se reconoce el texto pegado como un extracto soportado. Para planillas XLS/XLSX adjunta el archivo.'
    )
  }

  if (explicitFormat && !isSpreadsheetFormat(explicitFormat)) {
    throw new FinanceValidationError(`El formato ${explicitFormat} espera texto, no un archivo binario.`)
  }

  if (input.fileName && !SPREADSHEET_EXTENSION.test(input.fileName)) {
    throw new FinanceValidationError(`"${input.fileName}" no es una planilla XLS/XLSX.`)
  }

  const sheets = readWorkbookGrids(input.content)
  const format = explicitFormat ?? detectSpreadsheetFormat(sheets)

  if (!format) {
    throw new FinanceValidationError(
      `No se reconoce el layout de la planilla${input.fileName ? ` "${input.fileName}"` : ''}. Formatos soportados: ${BANK_STATEMENT_SOURCE_FORMATS.join(', ')}.`
    )
  }

  const parsed = parseSpreadsheet(sheets, format)

  if (parsed.rows.length === 0) {
    throw new FinanceValidationError('El extracto no tiene movimientos.')
  }

  return parsed
}
