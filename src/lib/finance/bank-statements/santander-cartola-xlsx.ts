import { FinanceValidationError } from '@/lib/finance/shared'

import type { WorkbookGrid } from './xlsx-grid'
import { cleanReference, cleanText, findRowIndex, parseDmyDate, parseUsNumber } from './parse-helpers'
import type { ParsedStatement, ParsedStatementRow } from './types'

/**
 * Santander Office Banking — "Cartolas históricas de Cuentas Corrientes" y
 * "Cartola provisoria Cta. Cte." (mismo layout, CLP y USD).
 *
 * Bloque `Detalle movimientos`:
 *   MONTO | DESCRIPCIÓN MOVIMIENTO | (vacío) | FECHA | N° DOCUMENTO | SUCURSAL | (vacío) | CARGO/ABONO
 *
 * El monto ya viene con signo (cargos negativos) en formato en-US
 * ("-1,162,700", "335.15"). Termina en `Resumen comisiones` o `Saldos diarios`.
 * Los saldos de cabecera (SALDO INICIAL / SALDO FINAL) se exponen en `meta`.
 */
const isSantanderCartola = (sheet: WorkbookGrid): boolean =>
  /cartola/i.test(sheet.sheetName) &&
  findRowIndex(sheet.grid, cells => cells[0] === 'Detalle movimientos') >= 0

export const detectSantanderCartolaXlsx = (sheets: WorkbookGrid[]): boolean => sheets.some(isSantanderCartola)

const extractField = (grid: string[][], label: RegExp): string | null => {
  for (const row of grid) {
    for (const cell of row) {
      const text = cleanText(cell)
      const match = text.match(label)

      if (match) return match[1]?.trim() ?? null
    }
  }

  return null
}

export const parseSantanderCartolaXlsx = (sheets: WorkbookGrid[]): ParsedStatement => {
  const sheet = sheets.find(isSantanderCartola)

  if (!sheet) {
    throw new FinanceValidationError('El archivo no tiene el bloque "Detalle movimientos" de una cartola Santander.')
  }

  const { grid } = sheet
  const headerIndex = findRowIndex(grid, cells => cells[0] === 'MONTO' && cells.includes('FECHA'))

  if (headerIndex < 0) {
    throw new FinanceValidationError('No se encontró la cabecera MONTO/DESCRIPCIÓN/FECHA de la cartola Santander.')
  }

  const header = grid[headerIndex].map(cleanText)
  const col = (name: string) => header.findIndex(cell => cell.toUpperCase().startsWith(name))
  const amountCol = col('MONTO')
  const descriptionCol = col('DESCRIPCI')
  const dateCol = col('FECHA')
  const documentCol = col('N° DOCUMENTO')

  const rows: ParsedStatementRow[] = []
  let rawRowCount = 0

  for (let i = headerIndex + 1; i < grid.length; i++) {
    const cells = grid[i].map(cleanText)
    const first = cells[0] ?? ''

    if (/^(Resumen comisiones|Saldos diarios)/i.test(first)) break
    if (!first && !cells[dateCol]) continue

    rawRowCount++

    rows.push({
      transactionDate: parseDmyDate(cells[dateCol]),
      description: cells[descriptionCol] || 'Movimiento sin descripción',
      reference: documentCol >= 0 ? cleanReference(cells[documentCol]) : null,
      amount: parseUsNumber(cells[amountCol]),
      balance: null
    })
  }

  // Cabecera de saldos: fila de labels seguida por la fila de valores.
  const saldosLabelIndex = findRowIndex(grid, cells => cells[0] === 'SALDO INICIAL')
  const saldosLabels = saldosLabelIndex >= 0 ? grid[saldosLabelIndex].map(cleanText) : []
  const saldosValues = saldosLabelIndex >= 0 ? (grid[saldosLabelIndex + 1] ?? []).map(cleanText) : []

  const saldo = (label: string) => {
    const index = saldosLabels.indexOf(label)

    return index >= 0 && saldosValues[index] ? parseUsNumber(saldosValues[index]) : null
  }

  const fromRaw = extractField(grid, /^Fecha desde:\s*(.+)$/i)
  const toRaw = extractField(grid, /^Fecha hasta:\s*(.+)$/i)
  const currencyRaw = extractField(grid, /^Moneda:\s*(.+)$/i)

  return {
    format: 'santander_cartola_xlsx',
    rows,
    meta: {
      accountNumber: extractField(grid, /^Cuenta(?: Corriente)?(?: N°:)?\s*([\d-]+)$/i),
      currency: currencyRaw ? (/DOLAR|USD/i.test(currencyRaw) ? 'USD' : 'CLP') : null,
      periodFrom: fromRaw ? parseDmyDate(fromRaw) : null,
      periodTo: toRaw ? parseDmyDate(toRaw) : null,
      openingBalance: saldo('SALDO INICIAL'),
      closingBalance: saldo('SALDO FINAL'),
      rawRowCount
    }
  }
}
