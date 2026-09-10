import { FinanceValidationError } from '@/lib/finance/shared'

import type { WorkbookGrid } from './xlsx-grid'
import { cleanText, findRowIndex, parseDmyDate, parseUsNumber } from './parse-helpers'
import type { ParsedStatement, ParsedStatementRow } from './types'

/**
 * Santander Office Banking — "Últimos movimientos Tarjetas de Crédito"
 * (movimientos no facturados desde el último cierre de ciclo).
 *
 *   FECHA | ESTABLECIMIENTO | DESCRIPCIÓN | MONTO | LUGAR
 *
 * El monto viene sin signo: todo lo listado es un cargo a la tarjeta salvo la
 * fila `SALDO INICIAL` (cupo utilizado al cierre anterior, va a `meta`). Los
 * cargos se emiten negativos (convención de caja del titular).
 */
const isTcMovimientos = (sheet: WorkbookGrid): boolean =>
  findRowIndex(sheet.grid, cells => cells[0] === 'FECHA' && cells[1] === 'ESTABLECIMIENTO' && cells.includes('MONTO')) >= 0

export const detectSantanderTcMovimientosXlsx = (sheets: WorkbookGrid[]): boolean => sheets.some(isTcMovimientos)

export const parseSantanderTcMovimientosXlsx = (sheets: WorkbookGrid[]): ParsedStatement => {
  const sheet = sheets.find(isTcMovimientos)

  if (!sheet) {
    throw new FinanceValidationError('El archivo no tiene la cabecera FECHA/ESTABLECIMIENTO/MONTO de últimos movimientos TC Santander.')
  }

  const { grid } = sheet
  const headerIndex = findRowIndex(grid, cells => cells[0] === 'FECHA' && cells[1] === 'ESTABLECIMIENTO')
  const header = grid[headerIndex].map(cleanText)
  const amountCol = header.indexOf('MONTO')
  const placeCol = header.indexOf('LUGAR')

  const rows: ParsedStatementRow[] = []
  let openingBalance: number | null = null
  let rawRowCount = 0

  for (let i = headerIndex + 1; i < grid.length; i++) {
    const cells = grid[i].map(cleanText)

    if (!cells[0]) continue

    rawRowCount++

    if (/^SALDO INICIAL$/i.test(cells[2] ?? '')) {
      openingBalance = parseUsNumber(cells[amountCol])
      continue
    }

    const establishment = cells[1]
    const detail = cells[2]
    const place = placeCol >= 0 ? cells[placeCol] : ''
    const description = [establishment, detail, place ? `(${place})` : ''].filter(Boolean).join(' · ')

    rows.push({
      transactionDate: parseDmyDate(cells[0]),
      description: description || 'Cargo tarjeta',
      reference: null,
      amount: -Math.abs(parseUsNumber(cells[amountCol])),
      balance: null
    })
  }

  return {
    format: 'santander_tc_movimientos_xlsx',
    rows,
    meta: {
      currency: 'CLP',
      openingBalance,
      rawRowCount
    }
  }
}
